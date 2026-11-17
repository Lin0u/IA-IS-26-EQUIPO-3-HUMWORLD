"""Servicio de captura RSS y composición del cron automático."""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

import feedparser
import httpx
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.exceptions import (
    FeedInvalidoError,
    FuenteRSSInactiveError,
    FuenteRSSNotFoundError,
)
from app.models.fuente import EstadoCircuitBreaker, FuenteRSS
from app.models.noticia import Noticia
from app.database import SessionLocal
from app.repositories.fuentes import FuenteRSSRepository
from app.repositories.noticias import NoticiaRepository
from app.schemas.captura import EstadoResultadoCaptura, ResultadoCaptura
from app.services.sentimiento_service import procesar_noticias

logger = logging.getLogger(__name__)


def _a_utc_naive(valor: datetime) -> datetime:
    """Normaliza un datetime a UTC sin zona.

    La columna DateTime de la BD se lee sin tzinfo; para comparar con `ahora`
    (aware) sin TypeError, se convierte todo a UTC-naive.
    """
    if valor.tzinfo is not None:
        valor = valor.astimezone(timezone.utc).replace(tzinfo=None)
    return valor


def _identificador_item(item: dict) -> str | None:
    # R7 (decisión PO 2026-11-17): si el ítem no trae guid/id, se usa el enlace
    # como identificador en vez de descartarlo. Solo se descarta (en _mapear_item)
    # si tampoco hay enlace o título.
    identificador = item.get("guid") or item.get("id") or item.get("link")
    if not identificador:
        return None
    return str(identificador).strip() or None


def _fecha_publicacion(item: dict) -> datetime | None:
    """Fecha del propio ítem RSS (pubDate/updated), en UTC.

    feedparser entrega published_parsed/updated_parsed ya convertidas a UTC
    como struct_time. Si el feed no la trae o es inválida, queda None y los
    dashboards usan fecha_registro (fecha de referencia).
    """
    fecha = item.get("published_parsed") or item.get("updated_parsed")
    if not fecha:
        return None
    try:
        return datetime(*fecha[:6], tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def _mapear_item(item: dict, fuente: FuenteRSS, fecha_registro: datetime) -> Noticia | None:
    identificador = _identificador_item(item)
    titulo = str(item.get("title") or "").strip()
    enlace = str(item.get("link") or "").strip()
    if not identificador or not titulo or not enlace:
        return None

    contenido = item.get("content") or item.get("summary") or item.get("description")
    if isinstance(contenido, list):
        contenido = contenido[0].get("value") if contenido else None
    elif isinstance(contenido, dict):
        contenido = contenido.get("value")

    return Noticia(
        fuente_rss_id=fuente.id,
        identificador_item_rss=identificador,
        titulo=titulo,
        contenido=contenido,
        enlace_original=enlace,
        fecha_publicacion=_fecha_publicacion(item),
        fecha_registro=fecha_registro,
        idioma_detectado=None,
        # La noticia hereda la categoría IPTC de su fuente (HU-RSS-002; dataset
        # de HU-RSS-009-v2: solo feeds de sección, una categoría por fuente).
        categoria_iptc=fuente.categoria_iptc,
    )


async def _descargar_feed(fuente: FuenteRSS) -> feedparser.FeedParserDict:
    timeout = httpx.Timeout(
        connect=settings.captura_timeout_conexion_segundos,
        read=settings.captura_timeout_lectura_segundos,
        write=settings.captura_timeout_lectura_segundos,
        pool=settings.captura_timeout_conexion_segundos,
    )
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(fuente.url)
        response.raise_for_status()
        return feedparser.parse(response.content)


async def _capturar_con_retries(
    fuente: FuenteRSS,
    max_reintentos: int | None = None,
) -> tuple[bool, str | None, list[dict]]:
    # R1: en SEMI_ABIERTO se hace un único intento de prueba (max_reintentos=0).
    if max_reintentos is None:
        max_reintentos = settings.captura_max_reintentos
    ultimo_error: Exception | None = None
    for intento in range(max_reintentos + 1):
        try:
            parsed = await _descargar_feed(fuente)
            # R2: un feed sin ítems es un error de CONTENIDO (no se reintenta).
            # bozo=1 por sí solo NO invalida el feed: feedparser lo marca ante
            # detalles de formato comunes (entidades HTML, codificación,
            # Content-Type) que no impiden entregar los ítems.
            if not parsed.entries:
                raise FeedInvalidoError("El feed no contiene ítems")
            if parsed.bozo:
                logger.warning(
                    "Feed con bozo=1 pero con ítems fuente_id=%s tipo=%s",
                    fuente.id,
                    type(parsed.get("bozo_exception")).__name__,
                )
            return True, None, list(parsed.entries)
        except FeedInvalidoError as exc:
            # Error de contenido: fallar de inmediato, sin reintentos.
            logger.error(
                "Feed inválido fuente_id=%s motivo=%s", fuente.id, exc
            )
            return False, str(exc), []
        except (httpx.HTTPError, TypeError) as exc:
            # Error transitorio: reintentar con backoff exponencial acotado.
            ultimo_error = exc
            if intento >= max_reintentos:
                break
            delay = min(0.5 * (2**intento), 5.0)
            logger.warning(
                "Reintento fuente_id=%s intento=%s motivo=%s",
                fuente.id,
                intento + 1,
                type(exc).__name__,
            )
            await asyncio.sleep(delay)
    return False, str(ultimo_error), []


def _calcular_humor_en_hilo(noticia_ids: list[int], session_factory) -> None:
    """Calcula el humor en un hilo, con una sesión propia (R5).

    `ejecutar_captura_multiple` comparte una única Session entre corrutinas y la
    Session de SQLAlchemy no es segura entre hilos. Por eso el hilo recibe solo
    los IDs, abre su propia sesión, carga las noticias y la cierra siempre.
    """
    db = session_factory()
    try:
        noticias = (
            db.query(Noticia).filter(Noticia.id.in_(noticia_ids)).all()
            if noticia_ids
            else []
        )
        procesar_noticias(db, noticias)
    except Exception:  # noqa: BLE001
        # Un fallo aquí no revierte la captura: las noticias quedan sin
        # metodo_calculo y las retoma el barrido (procesar_pendientes).
        logger.exception("Fallo del cálculo de humor (hilo) ids=%s", noticia_ids)
    finally:
        db.close()


async def _persistir_captura(
    db: Session,
    fuente: FuenteRSS,
    entries: list[dict],
    fecha_registro: datetime,
    session_factory=None,
) -> tuple[int, bool]:
    if session_factory is None:
        session_factory = SessionLocal
    noticias_repository = NoticiaRepository()

    # R3: deduplicar DENTRO del lote. Un feed puede repetir el mismo guid
    # (medios que republican); sin esto, dos ítems idénticos pasan el filtro y
    # chocan con el índice único al insertar, lo que revertía TODO el lote.
    # Se conserva el primer ítem de cada identificador.
    mapeadas: list[Noticia] = []
    vistos: set[str] = set()
    for entry in entries:
        noticia = _mapear_item(entry, fuente, fecha_registro)
        if noticia is None:
            logger.warning("Omitido ítem inválido fuente_id=%s", fuente.id)
            continue
        if noticia.identificador_item_rss in vistos:
            continue
        vistos.add(noticia.identificador_item_rss)
        mapeadas.append(noticia)

    # R6 + dedup por canal (HU-RSS-006-v2): una sola consulta que excluye los
    # identificadores ya presentes en cualquier fuente del mismo canal. Así, el
    # mismo ítem publicado por dos fuentes de secciones distintas del mismo canal
    # se guarda una sola vez (se conserva la primera noticia guardada).
    existentes = noticias_repository.identificadores_existentes_en_canal(
        db, fuente.canal_id, list(vistos)
    )
    noticias = [n for n in mapeadas if n.identificador_item_rss not in existentes]

    try:
        noticias_repository.insertar_lote(db, noticias)
        fuente.fecha_ultima_captura_exitosa = fecha_registro
        # R1: un éxito cierra el circuito y reinicia el contador de fallos,
        # tanto desde CERRADO como desde el intento de prueba SEMI_ABIERTO.
        fuente.estado_circuit_breaker = EstadoCircuitBreaker.CERRADO
        fuente.fallos_consecutivos = 0
        fuente.circuito_abierto_desde = None
        db.commit()
    except IntegrityError:
        # Resguardo ante una carrera con otra captura de la misma fuente: no se
        # silencia (se registra) y se reporta como fallo de persistencia.
        logger.exception("IntegrityError al insertar lote fuente_id=%s", fuente.id)
        db.rollback()
        return 0, False

    # HU-SENT-002-v2: cálculo del humor DESPUÉS de confirmar la captura.
    # R5: se ejecuta en un hilo con sesión propia para no bloquear el event
    # loop de FastAPI mientras lematiza o llama a Gemini. Se pasan solo los IDs
    # porque la Session compartida no es segura entre hilos. Un fallo del
    # cálculo no revierte las noticias ya confirmadas.
    noticia_ids = [n.id for n in noticias]
    await asyncio.to_thread(_calcular_humor_en_hilo, noticia_ids, session_factory)
    return len(noticias), True


def _registrar_fallo_circuito(
    db: Session, fuente: FuenteRSS, desde_semiabierto: bool, ahora: datetime
) -> None:
    """Contabiliza un fallo y abre el circuito si corresponde (R1).

    Antes, en una falla no se persistía nada: el contador nunca subía y el
    circuito jamás se abría. Ahora cada fallo suma uno y, al alcanzar el umbral
    —o si el fallo ocurre durante el intento de prueba SEMI_ABIERTO—, la fuente
    pasa a ABIERTO y se registra el momento de apertura.
    """
    fuente.fallos_consecutivos = (fuente.fallos_consecutivos or 0) + 1
    if (
        desde_semiabierto
        or fuente.fallos_consecutivos >= settings.circuit_breaker_umbral_fallos
    ):
        fuente.estado_circuit_breaker = EstadoCircuitBreaker.ABIERTO
        fuente.circuito_abierto_desde = _a_utc_naive(ahora)
        logger.warning(
            "Circuito ABIERTO fuente_id=%s fallos=%s",
            fuente.id,
            fuente.fallos_consecutivos,
        )
    try:
        db.commit()
    except IntegrityError:
        logger.exception("No se pudo persistir el estado del circuito fuente_id=%s", fuente.id)
        db.rollback()


async def ejecutar_captura(
    fuente_id: int,
    db: Session,
    ahora: datetime | None = None,
    session_factory=None,
) -> ResultadoCaptura:
    """Ejecuta una captura de una fuente activa y devuelve su resultado.

    `ahora` se inyecta en los tests para ejercitar la ventana de espera del
    Circuit Breaker sin depender del reloj real ni de sleeps. `session_factory`
    permite que el cálculo de humor en hilo (R5) use la misma BD en memoria que
    los tests.
    """
    if ahora is None:
        ahora = datetime.now(timezone.utc)
    # Se resuelve en cada llamada (no como default del parámetro) para que los
    # tests puedan sustituir captura_service.SessionLocal (R5).
    if session_factory is None:
        session_factory = SessionLocal
    fuente = FuenteRSSRepository().buscar_activa(db, fuente_id)
    if fuente is None:
        return ResultadoCaptura(
            fuente_id=fuente_id,
            estado=EstadoResultadoCaptura.FALLIDA_TRANSITORIA,
            noticias_nuevas=0,
            mensaje="La fuente no existe o está inactiva",
        )

    # R1: con el circuito ABIERTO, mientras no termine la espera NO se descarga.
    # Cuando la espera termina, se permite un único intento de prueba
    # (SEMI_ABIERTO, sin reintentos).
    semiabierto = False
    if fuente.estado_circuit_breaker == EstadoCircuitBreaker.ABIERTO:
        espera = timedelta(minutes=settings.circuit_breaker_espera_minutos)
        abierto_desde = fuente.circuito_abierto_desde
        # La BD devuelve el DateTime sin zona (naive); se comparan ambos en
        # UTC-naive para evitar el TypeError entre aware y naive.
        espera_terminada = (
            abierto_desde is not None
            and _a_utc_naive(ahora) - _a_utc_naive(abierto_desde) >= espera
        )
        if not espera_terminada:
            return ResultadoCaptura(
                fuente_id=fuente_id,
                estado=EstadoResultadoCaptura.FALLIDA_CIRCUITO_ABIERTO,
                noticias_nuevas=0,
                mensaje="Circuit breaker abierto",
            )
        fuente.estado_circuit_breaker = EstadoCircuitBreaker.SEMI_ABIERTO
        semiabierto = True

    try:
        max_reintentos = 0 if semiabierto else None
        capturado, error, entries = await _capturar_con_retries(fuente, max_reintentos)
        if not capturado:
            logger.error("Fallo de captura fuente_id=%s motivo=%s", fuente_id, error)
            _registrar_fallo_circuito(db, fuente, semiabierto, ahora)
            return ResultadoCaptura(
                fuente_id=fuente_id,
                estado=EstadoResultadoCaptura.FALLIDA_TRANSITORIA,
                noticias_nuevas=0,
                mensaje=error or "Error de captura",
            )

        noticias_nuevas, persistido = await _persistir_captura(
            db, fuente, entries, ahora, session_factory
        )
        if not persistido:
            return ResultadoCaptura(
                fuente_id=fuente_id,
                estado=EstadoResultadoCaptura.FALLIDA_TRANSITORIA,
                noticias_nuevas=0,
                mensaje="Error de persistencia",
            )
        return ResultadoCaptura(
            fuente_id=fuente_id,
            estado=EstadoResultadoCaptura.EXITOSA,
            noticias_nuevas=noticias_nuevas,
        )
    except Exception as exc:
        logger.exception("Fallo inesperado fuente_id=%s", fuente_id)
        return ResultadoCaptura(
            fuente_id=fuente_id,
            estado=EstadoResultadoCaptura.FALLIDA_TRANSITORIA,
            noticias_nuevas=0,
            mensaje=type(exc).__name__,
        )


async def ejecutar_captura_manual_fuente(
    fuente_id: int, db: Session
) -> ResultadoCaptura:
    """Valida la fuente solicitada y ejecuta la captura compartida."""
    fuente = FuenteRSSRepository().buscar_por_id(db, fuente_id)
    if fuente is None:
        raise FuenteRSSNotFoundError(fuente_id)
    if not fuente.activo:
        raise FuenteRSSInactiveError(fuente_id)
    return await ejecutar_captura(fuente_id, db)


async def ejecutar_captura_manual_multiple(
    fuente_ids: list[int], db: Session
) -> list[ResultadoCaptura]:
    """Captura el lote de forma aislada usando una única sesión de DB."""
    resultados: list[ResultadoCaptura] = []
    for fuente_id in fuente_ids:
        try:
            resultados.append(await ejecutar_captura(fuente_id, db))
        except Exception as exc:
            logger.exception("La captura manual falló fuente_id=%s", fuente_id)
            resultados.append(
                ResultadoCaptura(
                    fuente_id=fuente_id,
                    estado=EstadoResultadoCaptura.FALLIDA_TRANSITORIA,
                    noticias_nuevas=0,
                    mensaje=type(exc).__name__,
                )
            )
    return resultados


async def ejecutar_captura_multiple(
    fuente_ids: list[int], db: Session
) -> list[ResultadoCaptura]:
    """Ejecuta varias fuentes con concurrencia acotada y aislamiento."""
    semaphore = asyncio.Semaphore(settings.captura_concurrencia_maxima)

    async def capturar(fuente_id: int) -> ResultadoCaptura:
        async with semaphore:
            try:
                return await ejecutar_captura(fuente_id, db)
            except Exception as exc:
                logger.exception("La fuente_id=%s no pudo completarse", fuente_id)
                return ResultadoCaptura(
                    fuente_id=fuente_id,
                    estado=EstadoResultadoCaptura.FALLIDA_TRANSITORIA,
                    noticias_nuevas=0,
                    mensaje=type(exc).__name__,
                )

    return await asyncio.gather(*(capturar(fuente_id) for fuente_id in fuente_ids))


async def ejecutar_captura_todas_las_activas(
    db: Session,
) -> list[ResultadoCaptura]:
    """Recorre todas las fuentes activas para el cron automático."""
    fuentes = FuenteRSSRepository().listar_activas(db)
    return await ejecutar_captura_multiple([fuente.id for fuente in fuentes], db)
