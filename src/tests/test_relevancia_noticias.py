"""
Pruebas de las reglas de relevancia del cálculo de humor.

Origina en: HU-SENT-007-v4 (mínimo de términos del diccionario por noticia) y
HU-SENT-009 (lista de exclusión de noticias no relevantes); ADR-003, punto 7.
SQLite en memoria; el modelo ML es un doble de prueba.
"""
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.canal import CanalNoticias
from app.models.configuracion import Configuracion
from app.models.fuente import FuenteRSS
from app.models.noticia import Noticia
from app.models.palabra_exclusion import PalabraExclusion
from app.models.termino_diccionario import TerminoDiccionario
from app.services.sentimiento_service import (
    METODO_DICCIONARIO,
    METODO_ML,
    MOTIVO_MINIMO_TERMINOS,
    MOTIVO_PALABRA_EXCLUSION,
    ReglasRelevancia,
    calcular_humor,
    palabra_excluyente,
    procesar_noticias,
)

TERMINOS = {
    "es": [
        TerminoDiccionario(id=1, palabra="guerra", idioma="es", valor=-4),
        TerminoDiccionario(id=2, palabra="crisis", idioma="es", valor=-6),
        TerminoDiccionario(id=3, palabra="ganador", idioma="es", valor=8),
    ],
    "en": [TerminoDiccionario(id=4, palabra="outstanding", idioma="en", valor=10)],
}
MINIMO_2 = ReglasRelevancia(minimo_terminos=2)


class _ModeloOk:
    modelo_id = 7

    def predecir(self, texto):
        return 3.0


# --- Reglas en el cálculo -------------------------------------------------------

def test_con_menos_terminos_que_el_minimo_queda_sin_humor_pero_guarda_coincidencias():
    resultado = calcular_humor(Noticia(titulo="La guerra sigue", idioma_detectado="es"), TERMINOS, reglas=MINIMO_2)
    assert resultado.valor_humor is None
    assert resultado.metodo_calculo == METODO_DICCIONARIO
    assert resultado.cantidad_terminos_evaluados == 1
    assert resultado.terminos_ids == (1,)
    assert resultado.motivo_exclusion == MOTIVO_MINIMO_TERMINOS


def test_con_el_minimo_de_terminos_se_calcula_el_promedio():
    resultado = calcular_humor(Noticia(titulo="Guerra y crisis", idioma_detectado="es"), TERMINOS, reglas=MINIMO_2)
    assert (resultado.valor_humor, resultado.motivo_exclusion) == (-5.0, None)


def test_sin_terminos_no_hay_motivo_de_exclusion():
    resultado = calcular_humor(Noticia(titulo="Un día cualquiera", idioma_detectado="es"), TERMINOS, reglas=MINIMO_2)
    assert (resultado.valor_humor, resultado.cantidad_terminos_evaluados, resultado.motivo_exclusion) == (None, 0, None)


def test_sin_reglas_un_solo_termino_basta():
    """El análisis de texto libre (POST /sentiment) no aplica el mínimo."""
    resultado = calcular_humor(Noticia(titulo="La guerra sigue", idioma_detectado="es"), TERMINOS)
    assert resultado.valor_humor == -4.0


def test_titulo_con_palabra_de_exclusion_no_se_evalua():
    reglas = ReglasRelevancia(minimo_terminos=1, palabras_exclusion=("lotería",))
    noticia = Noticia(titulo="LOTERIA del Quindío: número ganador", idioma_detectado="es")
    resultado = calcular_humor(noticia, TERMINOS, reglas=reglas)
    assert resultado.valor_humor is None
    assert resultado.terminos_ids == ()
    assert resultado.motivo_exclusion == MOTIVO_PALABRA_EXCLUSION


def test_la_exclusion_aplica_tambien_con_el_modelo_de_ml():
    reglas = ReglasRelevancia(palabras_exclusion=("horoscope",))
    resultado = calcular_humor(Noticia(titulo="Your horoscope for today"), TERMINOS, _ModeloOk(), reglas)
    assert (resultado.valor_humor, resultado.motivo_exclusion) == (None, MOTIVO_PALABRA_EXCLUSION)


def test_el_minimo_no_aplica_al_modelo_de_ml():
    resultado = calcular_humor(
        Noticia(titulo="Outstanding races", idioma_detectado="en"), TERMINOS, _ModeloOk(), MINIMO_2
    )
    assert (resultado.metodo_calculo, resultado.valor_humor, resultado.motivo_exclusion) == (METODO_ML, 3.0, None)


@pytest.mark.parametrize(
    "titulo, palabras, esperada",
    [
        ("Resultado del Sorteo de hoy", ("sorteo",), "sorteo"),
        ("Los sorteos de la semana", ("sorteo",), None),  # palabra completa, sin lematizar
        ("Mega  Millions jackpot grows", ("mega millions",), "mega millions"),
        ("<b>Horóscopo</b> semanal", ("horoscopo",), "horoscopo"),
        ("Megamillonario compra un club", ("mega millions",), None),
        ("Sin coincidencias", (), None),
    ],
)
def test_palabra_excluyente(titulo, palabras, esperada):
    assert palabra_excluyente(titulo, palabras) == esperada


# --- Base de datos y API --------------------------------------------------------

@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, autoflush=False, autocommit=False)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db):
    def override():
        yield db

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def fuente(db):
    canal = CanalNoticias(nombre="NPR", continente="América", pais="Estados Unidos")
    db.add(canal)
    db.flush()
    fuente = FuenteRSS(canal_id=canal.id, url="https://npr.example.test/rss", categoria_iptc="11000000")
    db.add(fuente)
    db.add_all(
        [
            TerminoDiccionario(palabra="guerra", idioma="es", valor=-4),
            TerminoDiccionario(palabra="crisis", idioma="es", valor=-6),
            TerminoDiccionario(palabra="ganador", idioma="es", valor=8),
            Configuracion(clave="periodicidad_cron_minutos", valor=30),
            Configuracion(clave="minimo_terminos_humor", valor=2),
            PalabraExclusion(palabra="lotería"),
        ]
    )
    db.commit()
    return fuente


def _noticia(db, fuente, titulo, n=[0]):
    n[0] += 1
    noticia = Noticia(
        fuente_rss_id=fuente.id,
        identificador_item_rss=f"rel-{n[0]}",
        titulo=titulo,
        enlace_original=f"https://example.test/{n[0]}",
        fecha_registro=datetime(2026, 11, 10, 12, tzinfo=timezone.utc),
        idioma_detectado="es",
    )
    db.add(noticia)
    db.commit()
    return noticia


@pytest.fixture()
def procesadas(db, fuente):
    noticias = [
        _noticia(db, fuente, "Guerra y crisis en la frontera"),  # 2 términos: con humor
        _noticia(db, fuente, "La guerra continúa"),  # 1 término: bajo el mínimo
        _noticia(db, fuente, "Un día cualquiera"),  # 0 términos
        _noticia(db, fuente, "Lotería: el ganador de la crisis"),  # excluida por la lista
        _noticia(db, fuente, "Pendiente de cálculo"),
    ]
    procesar_noticias(db, noticias[:4], proveedor_ml=None)
    return noticias


def test_el_barrido_usa_el_minimo_y_la_lista_de_la_base(db, procesadas):
    estados = [(n.valor_humor, n.motivo_exclusion) for n in procesadas[:4]]
    assert estados == [(-5.0, None), (None, MOTIVO_MINIMO_TERMINOS), (None, None), (None, MOTIVO_PALABRA_EXCLUSION)]


def test_las_noticias_sin_humor_no_cuentan_en_la_nube(client, procesadas):
    palabras = {p["palabra"]: p["peso"] for p in client.get("/api/v1/dashboards/word-cloud").json()["items"]}
    assert palabras == {"guerra": 1, "crisis": 1}


def test_estadisticas_de_noticias(client, procesadas):
    assert client.get("/api/v1/news/statistics").json() == {
        "total": 5,
        "con_humor": 1,
        "sin_terminos": 1,
        "bajo_minimo_terminos": 1,
        "excluidas_por_lista": 1,
        "pendientes": 1,
        "minimo_terminos_humor": 2,
    }


def test_el_detalle_explica_por_que_quedo_fuera(client, procesadas):
    cuerpo = client.get(f"/api/v1/news/{procesadas[1].id}").json()
    assert cuerpo["motivo_exclusion"] == MOTIVO_MINIMO_TERMINOS
    assert [t["palabra"] for t in cuerpo["terminos"]] == ["guerra"]


def test_listar_y_crear_palabras_de_exclusion(client, fuente, procesadas, db):
    assert client.get("/api/v1/exclusions").json() == [{"id": 1, "palabra": "lotería"}]

    respuesta = client.post("/api/v1/exclusions", json={"palabra": "  Mega   Millions "})
    assert respuesta.status_code == 201
    assert respuesta.json()["palabra"] == "mega millions"
    assert [p["palabra"] for p in client.get("/api/v1/exclusions").json()] == ["lotería", "mega millions"]
    # El alta vuelve pendientes las noticias calculadas por diccionario.
    db.expire_all()
    assert all(n.metodo_calculo is None for n in procesadas)


@pytest.mark.parametrize("palabra", ["LOTERIA", "lotería ", "Lotería"])
def test_palabra_duplicada_responde_409(client, fuente, palabra):
    respuesta = client.post("/api/v1/exclusions", json={"palabra": palabra})
    assert respuesta.status_code == 409
    assert respuesta.json()["codigo"] == "PALABRA_DUPLICADA"


@pytest.mark.parametrize("cuerpo", [{"palabra": ""}, {"palabra": "!!!"}, {}, {"palabra": "x" * 101}])
def test_palabra_invalida_responde_400(client, fuente, cuerpo):
    assert client.post("/api/v1/exclusions", json=cuerpo).status_code == 400


def test_eliminar_palabra_de_exclusion(client, fuente, procesadas, db):
    assert client.delete("/api/v1/exclusions/1").status_code == 204
    assert client.get("/api/v1/exclusions").json() == []
    db.expire_all()
    assert all(n.metodo_calculo is None for n in procesadas)
    respuesta = client.delete("/api/v1/exclusions/1")
    assert respuesta.status_code == 404
    assert respuesta.json()["codigo"] == "PALABRA_NO_ENCONTRADA"


def test_cambiar_el_minimo_recalcula_las_noticias(client, procesadas, db):
    assert client.get("/api/v1/config").json()["minimo_terminos_humor"] == 2

    respuesta = client.put("/api/v1/config", json={"periodicidad_cron_minutos": 30, "minimo_terminos_humor": 3})

    assert respuesta.status_code == 200
    assert respuesta.json()["minimo_terminos_humor"] == 3
    db.expire_all()
    assert all(n.metodo_calculo is None for n in procesadas)


def test_el_mismo_minimo_no_recalcula(client, procesadas, db):
    client.put("/api/v1/config", json={"periodicidad_cron_minutos": 30, "minimo_terminos_humor": 2})
    db.expire_all()
    assert procesadas[0].metodo_calculo == METODO_DICCIONARIO


def test_minimo_invalido_responde_400(client, fuente):
    respuesta = client.put("/api/v1/config", json={"periodicidad_cron_minutos": 30, "minimo_terminos_humor": 0})
    assert respuesta.status_code == 400


def test_el_barrido_no_recarga_el_diccionario_por_cada_noticia(db, fuente):
    """Regresión: cada commit vencía los términos y se recargaban uno por uno
    (unas 950 consultas por noticia con 1.000 términos)."""
    from sqlalchemy import event

    db.add_all([TerminoDiccionario(palabra=f"termino{i}", idioma="es", valor=1) for i in range(300)])
    db.commit()
    noticias = [_noticia(db, fuente, "termino1 termino2 termino3 guerra") for _ in range(10)]
    consultas = []
    motor = db.get_bind()
    contar = lambda *argumentos: consultas.append(1)  # noqa: E731
    event.listen(motor, "before_cursor_execute", contar)
    try:
        assert procesar_noticias(db, noticias, proveedor_ml=None) == 10
    finally:
        event.remove(motor, "before_cursor_execute", contar)

    assert len(consultas) < 10 * 8
    assert all(n.valor_humor is not None for n in noticias)
