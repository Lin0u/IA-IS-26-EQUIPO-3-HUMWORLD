import asyncio
from datetime import datetime, timedelta, timezone

import httpx
import pytest
import respx
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.canal import CanalNoticias
from app.models.fuente import EstadoCircuitBreaker, FuenteRSS
from app.models.noticia import Noticia
from app.services.captura_service import (
    ejecutar_captura,
    ejecutar_captura_multiple,
    ejecutar_captura_todas_las_activas,
)


@pytest.fixture
def database_session(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    # R5: el cálculo de humor abre su propia sesión en un hilo con SessionLocal.
    # En los tests se apunta a la misma BD SQLite en memoria (StaticPool comparte
    # la única conexión), para no tocar la BD real.
    monkeypatch.setattr(
        "app.services.captura_service.SessionLocal", session_factory
    )
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def crear_fuente(
    database_session,
    fuente_id,
    url,
    activo=True,
    estado=EstadoCircuitBreaker.CERRADO,
    canal_id=100,
):
    canal = CanalNoticias(
        id=canal_id,
        nombre=f"Canal de pruebas {canal_id}",
        continente="Europa",
    )
    database_session.merge(canal)
    database_session.flush()
    fuente = FuenteRSS(
        id=fuente_id,
        canal_id=canal_id,
        url=url,
        categoria_iptc="07000000",
        activo=activo,
        estado_circuit_breaker=estado,
    )
    database_session.add(fuente)
    database_session.commit()
    return fuente


def feed_xml(*items):
    chunks = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0"><channel><title>Prueba</title><link>https://example.test/</link></channel>',
    ]
    for item in items:
        chunks.append(
            '<item>'
            f'<guid>{item["guid"]}</guid>'
            f'<title>{item["title"]}</title>'
            f'<link>{item["link"]}</link>'
            f'<description>{item.get("description", "")}</description>'
            f'<pubDate>{item.get("pubDate", "Mon, 01 Jan 2024 00:00:00 GMT")}</pubDate>'
            '</item>'
        )
    chunks.append('</rss>')
    return "".join(chunks)


@pytest.mark.asyncio
@respx.mock
async def test_captura_persiste_noticias_y_deduplica(database_session):
    url = "https://example.test/feed.xml"
    respx.get(url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml(
                {"guid": "item-1", "title": "Noticia", "link": "https://example.test/1"}
            ),
            headers={"content-type": "application/rss+xml"},
        )
    )
    fuente = crear_fuente(database_session, 1, url)

    resultado = await ejecutar_captura(fuente.id, database_session)
    duplicado = await ejecutar_captura(fuente.id, database_session)

    noticias = database_session.execute(
        select(Noticia).where(Noticia.fuente_rss_id == fuente.id)
    ).scalars().all()
    assert resultado.estado.value == "exitosa"
    assert resultado.noticias_nuevas == 1
    assert duplicado.noticias_nuevas == 0
    assert len(noticias) == 1
    assert noticias[0].identificador_item_rss == "item-1"
    assert noticias[0].fecha_registro is not None
    assert fuente.fecha_ultima_captura_exitosa is not None


@pytest.mark.asyncio
@respx.mock
async def test_captura_multiple_aisla_fallos_y_continua(database_session):
    fuente_fallida = crear_fuente(database_session, 1, "https://example.test/fallida")
    fuente_valida = crear_fuente(database_session, 2, "https://example.test/valida")
    respx.get(fuente_fallida.url).mock(return_value=httpx.Response(500))
    respx.get(fuente_valida.url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml(
                {"guid": "item-2", "title": "Noticia válida", "link": "https://example.test/2"}
            ),
            headers={"content-type": "application/rss+xml"},
        )
    )

    resultados = await ejecutar_captura_multiple(
        [fuente_fallida.id, fuente_valida.id], database_session
    )

    assert {resultado.fuente_id: resultado.estado.value for resultado in resultados} == {
        1: "fallida_transitoria",
        2: "exitosa",
    }
    assert database_session.execute(
        select(Noticia).where(Noticia.fuente_rss_id == fuente_valida.id)
    ).scalars().one()


@pytest.mark.asyncio
@respx.mock
async def test_retry_recupera_captura_trasitoria(database_session, monkeypatch):
    url = "https://example.test/retry"
    fuente = crear_fuente(database_session, 1, url)
    respx.get(url).mock(
        side_effect=[
            httpx.Response(500),
            httpx.Response(
                200,
                content=feed_xml(
                    {"guid": "retry-item", "title": "Recuperado", "link": "https://example.test/retry-item"}
                ),
                headers={"content-type": "application/rss+xml"},
            ),
        ]
    )

    async def no_sleep(_delay):
        return None

    monkeypatch.setattr("app.services.captura_service.asyncio.sleep", no_sleep)
    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "exitosa"
    assert resultado.noticias_nuevas == 1
    assert len(respx.calls) == 2


@pytest.mark.asyncio
@respx.mock
async def test_timeout_agota_en_cuatro_intentos(database_session, monkeypatch):
    url = "https://example.test/timeout"
    fuente = crear_fuente(database_session, 1, url)
    respx.get(url).mock(side_effect=httpx.TimeoutException("timeout"))

    async def no_sleep(_delay):
        return None

    monkeypatch.setattr("app.services.captura_service.asyncio.sleep", no_sleep)
    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "fallida_transitoria"
    assert resultado.noticias_nuevas == 0
    assert len(respx.calls) == 4


@pytest.mark.asyncio
@respx.mock
async def test_captura_omite_feed_malformado_y_registra_item_invalido(database_session):
    # R7: un ítem sin guid pero con enlace ya NO se descarta (usa el enlace).
    # El ítem que se omite es el que no tiene guid/id NI enlace.
    url = "https://example.test/malformed"
    fuente = crear_fuente(database_session, 1, url)
    contenido = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<rss version="2.0"><channel><title>T</title><link>https://example.test/</link>'
        '<item><guid>item-1</guid><title>Valido</title><link>https://example.test/1</link><description>d</description></item>'
        '<item><title>Sin enlace ni guid</title><description>d</description></item>'
        '</channel></rss>'
    ).encode()
    respx.get(url).mock(return_value=httpx.Response(200, content=contenido))

    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "exitosa"
    assert resultado.noticias_nuevas == 1
    assert database_session.execute(select(Noticia)).scalars().one().identificador_item_rss == "item-1"


@pytest.mark.asyncio
@respx.mock
async def test_feed_con_bozo_pero_con_items_se_captura(database_session):
    # R2: feedparser marca bozo=1 por una entidad HTML en el título, pero el
    # feed trae 2 ítems válidos -> captura exitosa con 2 noticias.
    url = "https://example.test/bozo"
    fuente = crear_fuente(database_session, 1, url)
    contenido = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<rss version="2.0"><channel><title>T</title>'
        '<link>https://example.test/</link>'
        '<item><guid>a1</guid><title>Caf&eacute; &nbsp; matutino</title>'
        '<link>https://example.test/a1</link><description>d</description></item>'
        '<item><guid>a2</guid><title>Segunda</title>'
        '<link>https://example.test/a2</link><description>d</description></item>'
        '</channel></rss>'
    )
    respx.get(url).mock(return_value=httpx.Response(200, content=contenido.encode()))

    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "exitosa"
    assert resultado.noticias_nuevas == 2
    assert database_session.execute(
        select(Noticia).where(Noticia.fuente_rss_id == fuente.id)
    ).scalars().all().__len__() == 2


@pytest.mark.asyncio
@respx.mock
async def test_feed_sin_items_falla_sin_reintentar(database_session, monkeypatch):
    # R2: un 200 cuyo contenido no es un feed con ítems es error de contenido:
    # una sola solicitud HTTP, sin reintentos.
    url = "https://example.test/vacio"
    fuente = crear_fuente(database_session, 1, url)
    respx.get(url).mock(
        return_value=httpx.Response(200, content=b"<html><body>no soy un feed</body></html>")
    )

    async def no_sleep(_delay):
        return None

    monkeypatch.setattr("app.services.captura_service.asyncio.sleep", no_sleep)
    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "fallida_transitoria"
    assert resultado.noticias_nuevas == 0
    assert len(respx.calls) == 1


@pytest.mark.asyncio
@respx.mock
async def test_guid_repetido_en_el_mismo_feed_no_pierde_el_lote(database_session):
    # R3: el feed trae b1, b2, b1 -> se guardan exactamente 2 (b1 y b2).
    url = "https://example.test/repetido"
    fuente = crear_fuente(database_session, 1, url)
    respx.get(url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml(
                {"guid": "b1", "title": "Primera", "link": "https://example.test/b1"},
                {"guid": "b2", "title": "Segunda", "link": "https://example.test/b2"},
                {"guid": "b1", "title": "Repetida", "link": "https://example.test/b1"},
            ),
            headers={"content-type": "application/rss+xml"},
        )
    )

    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "exitosa"
    assert resultado.noticias_nuevas == 2
    ids = sorted(
        n.identificador_item_rss
        for n in database_session.execute(select(Noticia)).scalars().all()
    )
    assert ids == ["b1", "b2"]


@pytest.mark.asyncio
@respx.mock
async def test_segunda_captura_del_feed_repetido_no_duplica(database_session):
    # R3: tras guardar b1 y b2, recapturar el mismo feed no agrega noticias.
    url = "https://example.test/repetido2"
    fuente = crear_fuente(database_session, 1, url)
    respx.get(url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml(
                {"guid": "b1", "title": "Primera", "link": "https://example.test/b1"},
                {"guid": "b2", "title": "Segunda", "link": "https://example.test/b2"},
                {"guid": "b1", "title": "Repetida", "link": "https://example.test/b1"},
            ),
            headers={"content-type": "application/rss+xml"},
        )
    )

    primera = await ejecutar_captura(fuente.id, database_session)
    segunda = await ejecutar_captura(fuente.id, database_session)

    assert primera.noticias_nuevas == 2
    assert segunda.estado.value == "exitosa"
    assert segunda.noticias_nuevas == 0
    assert database_session.execute(select(Noticia)).scalars().all().__len__() == 2


@pytest.mark.asyncio
@respx.mock
async def test_mismo_identificador_en_dos_canales_distintos_guarda_ambas(database_session):
    # HU-RSS-006-v2 (R4): el mismo guid en fuentes de CANALES distintos -> 2.
    f1 = crear_fuente(database_session, 1, "https://example.test/c1", canal_id=100)
    f2 = crear_fuente(database_session, 2, "https://example.test/c2", canal_id=200)
    respx.get(f1.url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml({"guid": "123", "title": "Noticia A", "link": "https://example.test/a"}),
            headers={"content-type": "application/rss+xml"},
        )
    )
    respx.get(f2.url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml({"guid": "123", "title": "Noticia B distinta", "link": "https://example.test/b"}),
            headers={"content-type": "application/rss+xml"},
        )
    )

    await ejecutar_captura(f1.id, database_session)
    await ejecutar_captura(f2.id, database_session)

    assert database_session.execute(select(Noticia)).scalars().all().__len__() == 2


@pytest.mark.asyncio
@respx.mock
async def test_mismo_identificador_en_dos_fuentes_del_mismo_canal_guarda_una(database_session):
    # HU-RSS-006-v2 (R4): el mismo guid en dos fuentes del MISMO canal -> 1.
    # Se conserva la primera noticia guardada.
    f1 = crear_fuente(database_session, 1, "https://example.test/s1", canal_id=100)
    f2 = crear_fuente(database_session, 2, "https://example.test/s2", canal_id=100)
    respx.get(f1.url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml({"guid": "123", "title": "Primera (seccion A)", "link": "https://example.test/a"}),
            headers={"content-type": "application/rss+xml"},
        )
    )
    respx.get(f2.url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml({"guid": "123", "title": "Segunda (seccion B)", "link": "https://example.test/b"}),
            headers={"content-type": "application/rss+xml"},
        )
    )

    r1 = await ejecutar_captura(f1.id, database_session)
    r2 = await ejecutar_captura(f2.id, database_session)

    assert r1.noticias_nuevas == 1
    assert r2.noticias_nuevas == 0
    noticias = database_session.execute(select(Noticia)).scalars().all()
    assert len(noticias) == 1
    # Se conserva la primera (la de la fuente 1).
    assert noticias[0].titulo == "Primera (seccion A)"


@pytest.mark.asyncio
@respx.mock
async def test_item_sin_guid_usa_el_enlace_como_identificador(database_session):
    # R7: un ítem sin guid/id se identifica por su enlace en vez de descartarse.
    url = "https://example.test/sin-guid"
    fuente = crear_fuente(database_session, 1, url)
    contenido = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<rss version="2.0"><channel><title>T</title><link>https://example.test/</link>'
        '<item><title>Sin guid</title><link>https://example.test/noticia-x</link>'
        '<description>d</description></item>'
        '</channel></rss>'
    ).encode()
    respx.get(url).mock(return_value=httpx.Response(200, content=contenido))

    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "exitosa"
    assert resultado.noticias_nuevas == 1
    noticia = database_session.execute(select(Noticia)).scalars().one()
    assert noticia.identificador_item_rss == "https://example.test/noticia-x"


@pytest.mark.asyncio
@respx.mock
async def test_item_sin_guid_ni_enlace_se_descarta(database_session):
    # R7: sin guid/id y sin enlace (o sin título) sí se descarta.
    url = "https://example.test/sin-nada"
    fuente = crear_fuente(database_session, 1, url)
    contenido = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<rss version="2.0"><channel><title>T</title><link>https://example.test/</link>'
        '<item><title>Sin enlace</title><description>d</description></item>'
        '<item><guid>ok</guid><title>Valida</title><link>https://example.test/ok</link><description>d</description></item>'
        '</channel></rss>'
    ).encode()
    respx.get(url).mock(return_value=httpx.Response(200, content=contenido))

    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "exitosa"
    assert resultado.noticias_nuevas == 1
    noticia = database_session.execute(select(Noticia)).scalars().one()
    assert noticia.identificador_item_rss == "ok"


@pytest.mark.asyncio
@respx.mock
async def test_identificador_mayor_a_255_se_colapsa_a_sha256(database_session):
    # R7 (feedback PO 2026-11-20): un guid de 300 caracteres supera el String(255)
    # de la columna y MySQL rechazaría el lote con DataError. El servicio lo
    # sustituye por "sha256:<hexdigest>" (determinista y de longitud fija), de
    # modo que la noticia se guarda y la deduplicación sigue funcionando.
    # SQLite no valida longitudes; esta prueba verifica la sustitución, no el
    # error de MySQL.
    import hashlib

    url = "https://example.test/guid-largo"
    fuente = crear_fuente(database_session, 1, url)
    guid_largo = "g" * 300
    esperado = "sha256:" + hashlib.sha256(guid_largo.encode("utf-8")).hexdigest()
    respx.get(url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml(
                {
                    "guid": guid_largo,
                    "title": "Noticia con guid larguísimo",
                    "link": "https://example.test/noticia-larga",
                }
            ),
            headers={"content-type": "application/rss+xml"},
        )
    )

    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "exitosa"
    assert resultado.noticias_nuevas == 1
    noticia = database_session.execute(select(Noticia)).scalars().one()
    assert noticia.identificador_item_rss == esperado
    assert len(noticia.identificador_item_rss) <= 255


@pytest.mark.asyncio
@respx.mock
async def test_enlace_mayor_a_500_omite_el_item_sin_romper_el_lote(database_session):
    # R7 (feedback PO 2026-11-20): el enlace es dato de salida (no se deduplica
    # por él), así que un enlace que no cabe en String(500) se omite con warning
    # en vez de reventar el lote. El resto de ítems del lote se guardan.
    url = "https://example.test/enlace-largo"
    fuente = crear_fuente(database_session, 1, url)
    enlace_largo = "https://example.test/" + ("x" * 500)
    respx.get(url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml(
                {
                    "guid": "item-malo",
                    "title": "Enlace demasiado largo",
                    "link": enlace_largo,
                },
                {
                    "guid": "item-bueno",
                    "title": "Noticia válida",
                    "link": "https://example.test/ok",
                },
            ),
            headers={"content-type": "application/rss+xml"},
        )
    )

    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "exitosa"
    assert resultado.noticias_nuevas == 1
    noticia = database_session.execute(select(Noticia)).scalars().one()
    assert noticia.identificador_item_rss == "item-bueno"


@pytest.mark.asyncio
@respx.mock
async def test_circuito_se_abre_tras_umbral_de_fallos(database_session, monkeypatch):
    # R1: tras 5 fallos consecutivos (umbral) el circuito queda ABIERTO.
    from app.core.config import settings

    monkeypatch.setattr(settings, "captura_max_reintentos", 0)
    url = "https://example.test/cae"
    fuente = crear_fuente(database_session, 1, url)
    respx.get(url).mock(return_value=httpx.Response(500))

    for _ in range(settings.circuit_breaker_umbral_fallos):
        await ejecutar_captura(fuente.id, database_session)

    database_session.expire_all()
    fuente = database_session.get(FuenteRSS, 1)
    assert fuente.estado_circuit_breaker == EstadoCircuitBreaker.ABIERTO
    assert fuente.fallos_consecutivos == settings.circuit_breaker_umbral_fallos


@pytest.mark.asyncio
@respx.mock
async def test_circuito_abierto_dentro_de_la_espera_no_descarga(database_session):
    # R1: ABIERTO y con la espera vigente -> no hay solicitud HTTP.
    fuente = crear_fuente(
        database_session, 1, "https://example.test/abierto", estado=EstadoCircuitBreaker.ABIERTO
    )
    fuente.circuito_abierto_desde = datetime.now(timezone.utc)
    database_session.commit()

    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "fallida_circuito_abierto"
    assert resultado.noticias_nuevas == 0
    assert not respx.calls


@pytest.mark.asyncio
@respx.mock
async def test_semiabierto_un_intento_exitoso_cierra_circuito(database_session):
    # R1: pasada la espera, un intento de prueba exitoso -> CERRADO, contador 0.
    from app.core.config import settings

    url = "https://example.test/recupera"
    fuente = crear_fuente(database_session, 1, url, estado=EstadoCircuitBreaker.ABIERTO)
    abierto_desde = datetime.now(timezone.utc) - timedelta(
        minutes=settings.circuit_breaker_espera_minutos + 1
    )
    fuente.circuito_abierto_desde = abierto_desde
    fuente.fallos_consecutivos = settings.circuit_breaker_umbral_fallos
    database_session.commit()
    respx.get(url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml(
                {"guid": "ok-1", "title": "Recuperada", "link": "https://example.test/ok-1"}
            ),
            headers={"content-type": "application/rss+xml"},
        )
    )

    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "exitosa"
    assert len(respx.calls) == 1
    database_session.expire_all()
    fuente = database_session.get(FuenteRSS, 1)
    assert fuente.estado_circuit_breaker == EstadoCircuitBreaker.CERRADO
    assert fuente.fallos_consecutivos == 0
    assert fuente.circuito_abierto_desde is None


@pytest.mark.asyncio
@respx.mock
async def test_semiabierto_un_intento_fallido_reabre_circuito(database_session):
    # R1: pasada la espera, si el único intento de prueba falla -> ABIERTO,
    # con una sola solicitud HTTP (sin reintentos) y la espera reiniciada.
    from app.core.config import settings

    url = "https://example.test/sigue-caida"
    fuente = crear_fuente(database_session, 1, url, estado=EstadoCircuitBreaker.ABIERTO)
    fuente.circuito_abierto_desde = datetime.now(timezone.utc) - timedelta(
        minutes=settings.circuit_breaker_espera_minutos + 1
    )
    fuente.fallos_consecutivos = settings.circuit_breaker_umbral_fallos
    database_session.commit()
    respx.get(url).mock(return_value=httpx.Response(500))

    ahora = datetime.now(timezone.utc)
    resultado = await ejecutar_captura(fuente.id, database_session, ahora=ahora)

    assert resultado.estado.value == "fallida_transitoria"
    assert len(respx.calls) == 1
    database_session.expire_all()
    fuente = database_session.get(FuenteRSS, 1)
    assert fuente.estado_circuit_breaker == EstadoCircuitBreaker.ABIERTO
    assert fuente.circuito_abierto_desde == ahora.replace(tzinfo=None)


@pytest.mark.asyncio
@respx.mock
async def test_exito_reinicia_contador_de_fallos(database_session):
    # R1: una captura exitosa reinicia el contador aunque venga de 3 fallos.
    url = "https://example.test/reinicia"
    fuente = crear_fuente(database_session, 1, url)
    fuente.fallos_consecutivos = 3
    database_session.commit()
    respx.get(url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml(
                {"guid": "r-1", "title": "Noticia", "link": "https://example.test/r-1"}
            ),
            headers={"content-type": "application/rss+xml"},
        )
    )

    await ejecutar_captura(fuente.id, database_session)

    database_session.expire_all()
    assert database_session.get(FuenteRSS, 1).fallos_consecutivos == 0


@pytest.mark.asyncio
@respx.mock
async def test_calculo_humor_no_bloquea_el_event_loop(database_session, monkeypatch):
    # R5: el cálculo de humor corre en un hilo; otra corrutina del mismo loop
    # debe avanzar mientras el cálculo "tarda" 1 s.
    import time

    def humor_lento(db, noticias, *a, **k):
        time.sleep(1.0)
        return len(noticias)

    monkeypatch.setattr(
        "app.services.captura_service.procesar_noticias", humor_lento
    )
    url = "https://example.test/lento"
    fuente = crear_fuente(database_session, 1, url)
    respx.get(url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml(
                {"guid": "l-1", "title": "Noticia", "link": "https://example.test/l-1"}
            ),
            headers={"content-type": "application/rss+xml"},
        )
    )

    async def medir_otra_corrutina():
        inicio = time.perf_counter()
        await asyncio.sleep(0.05)
        return time.perf_counter() - inicio

    resultado, transcurrido = await asyncio.gather(
        ejecutar_captura(fuente.id, database_session),
        medir_otra_corrutina(),
    )

    assert resultado.estado.value == "exitosa"
    # Si el loop estuviera bloqueado, la otra corrutina tardaría ~1 s.
    assert transcurrido < 0.5


@pytest.mark.asyncio
@respx.mock
async def test_fallo_del_calculo_de_humor_no_revierte_la_captura(
    database_session, monkeypatch
):
    # R5: si procesar_noticias lanza, las noticias quedan guardadas (sin humor)
    # y la captura sigue siendo exitosa.
    def humor_falla(db, noticias, *a, **k):
        raise RuntimeError("boom")

    monkeypatch.setattr(
        "app.services.captura_service.procesar_noticias", humor_falla
    )
    url = "https://example.test/falla-humor"
    fuente = crear_fuente(database_session, 1, url)
    respx.get(url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml(
                {"guid": "f-1", "title": "Noticia", "link": "https://example.test/f-1"}
            ),
            headers={"content-type": "application/rss+xml"},
        )
    )

    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "exitosa"
    assert resultado.noticias_nuevas == 1
    noticia = database_session.execute(select(Noticia)).scalars().one()
    assert noticia.metodo_calculo is None


@pytest.mark.asyncio
@respx.mock
async def test_circuit_breaker_abierto_omite_http(database_session):
    fuente = crear_fuente(database_session, 1, "https://example.test/closed", estado=EstadoCircuitBreaker.ABIERTO)
    fuente.circuito_abierto_desde = datetime.now(timezone.utc)
    database_session.commit()

    resultado = await ejecutar_captura(fuente.id, database_session)

    assert resultado.estado.value == "fallida_circuito_abierto"
    assert resultado.noticias_nuevas == 0
    assert not respx.calls


@pytest.mark.asyncio
@respx.mock
async def test_captura_todas_las_activas_excluye_inactivas(database_session):
    activa = crear_fuente(database_session, 1, "https://example.test/activa")
    inactiva = crear_fuente(database_session, 2, "https://example.test/inactiva", activo=False)
    respx.get(activa.url).mock(
        return_value=httpx.Response(
            200,
            content=feed_xml(
                {"guid": "item-1", "title": "Noticias", "link": "https://example.test/1"}
            ),
            headers={"content-type": "application/rss+xml"},
        )
    )

    resultados = await ejecutar_captura_todas_las_activas(database_session)

    assert {resultado.fuente_id for resultado in resultados} == {activa.id}
    assert not any(call.request.url == inactiva.url for call in respx.calls)
    assert database_session.execute(
        select(Noticia).where(Noticia.fuente_rss_id == activa.id)
    ).scalars().one()
