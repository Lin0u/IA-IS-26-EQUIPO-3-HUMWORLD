"""
Cliente del servicio externo de embeddings (Google Gemini Embedding).

Origina en: HU-SENT-006 y HU-SENT-002-v3; ADR-004, puntos 1, 2 y 7.

Patrones de resiliencia (ADR-004, punto 7; misma regla que las fuentes RSS en
docs/architecture.md, sección 8):
- Timeout explícito en cada llamada (embeddings_timeout_segundos, propuesto 3 s).
- Retry acotado con backoff exponencial ante fallos transitorios (timeout,
  error de conexión, HTTP 429 y 5xx). Nunca reintento infinito. Los 4xx
  restantes (clave inválida, solicitud mal formada) no se reintentan.
- Cuota (HTTP 429) al entrenar: el cliente de entrenamiento espera lo que
  indica el servicio (retryDelay), con un tope, porque la cuota gratuita es por
  minuto y el backoff corto agotaba los reintentos en segundos. La predicción
  no espera: falla rápido y el cálculo cae al diccionario.
- Circuit Breaker en el camino de predicción (alta frecuencia): tras N fallos
  seguidos deja de llamar al servicio durante una ventana y el cálculo de humor
  cae directamente al diccionario.
- Bulkhead: no aplica (ADR-004: un único servicio externo de este tipo).

La clave de API se envía en la cabecera x-goog-api-key, nunca en la URL, para
que no quede en logs.
"""
import logging
import re
import time
from collections.abc import Callable, Sequence

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class ErrorServicioEmbeddings(Exception):
    """El servicio de embeddings falló de forma persistente o no es utilizable."""


class CircuitoAbiertoError(ErrorServicioEmbeddings):
    """El Circuit Breaker está abierto: no se intenta la llamada externa."""


class CircuitBreaker:
    """Circuit Breaker simple en memoria (cerrado → abierto → semiabierto)."""

    def __init__(
        self,
        umbral_fallos: int,
        espera_segundos: float,
        reloj: Callable[[], float] = time.monotonic,
    ) -> None:
        self.umbral_fallos = umbral_fallos
        self.espera_segundos = espera_segundos
        self._reloj = reloj
        self._fallos = 0
        self._abierto_desde: float | None = None

    @property
    def abierto(self) -> bool:
        if self._abierto_desde is None:
            return False
        # Pasada la espera queda semiabierto: se permite un intento de prueba.
        return self._reloj() - self._abierto_desde < self.espera_segundos

    def ejecutar(self, funcion: Callable[[], object]):
        if self.abierto:
            raise CircuitoAbiertoError("Circuito abierto: se omite la llamada a embeddings.")
        try:
            resultado = funcion()
        except Exception:
            self._fallos += 1
            if self._fallos >= self.umbral_fallos or self._abierto_desde is not None:
                if self._abierto_desde is None:
                    logger.warning("Circuit Breaker de embeddings abierto tras %s fallos", self._fallos)
                self._abierto_desde = self._reloj()
            raise
        self._fallos = 0
        self._abierto_desde = None
        return resultado


def _es_transitorio(exc: Exception) -> bool:
    if isinstance(exc, (httpx.TimeoutException, httpx.TransportError)):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        codigo = exc.response.status_code
        return codigo == 429 or codigo >= 500
    return False


_DEMORA = re.compile(r"^(\d+(?:\.\d+)?)s$")


def _detalle_http(exc: httpx.HTTPStatusError) -> tuple[str, float | None]:
    """Mensaje de error de Gemini y la espera que pide (retryDelay), si la indica."""
    try:
        error = exc.response.json().get("error", {})
    except ValueError:
        return f"HTTP {exc.response.status_code}", None
    mensaje = f"HTTP {exc.response.status_code}: {str(error.get('message', ''))[:200]}"
    for detalle in error.get("details", []) or []:
        coincidencia = _DEMORA.match(str(detalle.get("retryDelay", "")))
        if coincidencia:
            return mensaje, float(coincidencia.group(1))
    return mensaje, None


def _describir(exc: Exception) -> tuple[str, float | None]:
    if isinstance(exc, httpx.HTTPStatusError):
        return _detalle_http(exc)
    return type(exc).__name__, None


class ClienteEmbeddingsGemini:
    """Genera embeddings con la API REST de Gemini (embedContent / batchEmbedContents)."""

    def __init__(
        self,
        api_key: str | None = None,
        modelo: str | None = None,
        url_base: str | None = None,
        http: httpx.Client | None = None,
        esperar: Callable[[float], None] = time.sleep,
        timeout_segundos: float | None = None,
        max_reintentos: int | None = None,
        esperar_cuota: bool = False,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.gemini_api_key
        if not self.api_key:
            raise ErrorServicioEmbeddings("GEMINI_API_KEY no está configurada.")
        self.modelo = modelo or settings.gemini_modelo_embeddings
        self._url_base = (url_base or settings.gemini_url_base).rstrip("/")
        self._timeout = timeout_segundos or settings.embeddings_timeout_segundos
        self._max_reintentos = (
            max_reintentos if max_reintentos is not None else settings.embeddings_max_reintentos
        )
        self._esperar_cuota = esperar_cuota
        self._http = http or httpx.Client(timeout=self._timeout)
        self._esperar = esperar

    def _espera(self, exc: Exception, intento: int, demora: float | None) -> float:
        """Segundos antes del próximo intento."""
        cuota = isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429
        if cuota and self._esperar_cuota:
            sugerida = demora + 1 if demora is not None else (
                settings.embeddings_espera_cuota_segundos * 2 ** (intento - 1)
            )
            return min(sugerida, settings.embeddings_espera_maxima_segundos)
        return settings.embeddings_backoff_base_segundos * 2 ** (intento - 1)

    def _texto(self, texto: str) -> dict:
        recortado = texto[: settings.embeddings_max_caracteres]
        return {"model": f"models/{self.modelo}", "content": {"parts": [{"text": recortado}]}}

    def _post(self, accion: str, cuerpo: dict) -> dict:
        url = f"{self._url_base}/models/{self.modelo}:{accion}"
        intentos = self._max_reintentos + 1
        for intento in range(1, intentos + 1):
            try:
                respuesta = self._http.post(
                    url,
                    json=cuerpo,
                    headers={"x-goog-api-key": self.api_key},
                    timeout=self._timeout,
                )
                respuesta.raise_for_status()
                return respuesta.json()
            except Exception as exc:  # noqa: BLE001 - se clasifica abajo
                # El detalle es el mensaje de Gemini; nunca incluye la clave.
                detalle, demora = _describir(exc)
                if not _es_transitorio(exc) or intento == intentos:
                    logger.warning(
                        "Embeddings: fallo definitivo en %s tras %s intento(s): %s",
                        accion,
                        intento,
                        detalle,
                    )
                    raise ErrorServicioEmbeddings(detalle) from exc
                espera = self._espera(exc, intento, demora)
                logger.info("Embeddings: reintento %s en %.1f s (%s)", intento, espera, detalle)
                self._esperar(espera)
        raise ErrorServicioEmbeddings("Sin intentos disponibles.")  # pragma: no cover

    def embeber(self, texto: str) -> list[float]:
        datos = self._post("embedContent", self._texto(texto))
        try:
            return [float(v) for v in datos["embedding"]["values"]]
        except (KeyError, TypeError) as exc:
            raise ErrorServicioEmbeddings("Respuesta de embeddings inesperada.") from exc

    def embeber_lote(self, textos: Sequence[str]) -> list[list[float]]:
        vectores: list[list[float]] = []
        tamanio = max(1, settings.embeddings_lote)
        for inicio in range(0, len(textos), tamanio):
            parte = textos[inicio : inicio + tamanio]
            logger.info("Embeddings: lote %s-%s de %s", inicio + 1, inicio + len(parte), len(textos))
            datos = self._post("batchEmbedContents", {"requests": [self._texto(t) for t in parte]})
            try:
                nuevos = [[float(v) for v in e["values"]] for e in datos["embeddings"]]
            except (KeyError, TypeError) as exc:
                raise ErrorServicioEmbeddings("Respuesta de embeddings inesperada.") from exc
            if len(nuevos) != len(parte):
                raise ErrorServicioEmbeddings("El servicio devolvió una cantidad distinta de embeddings.")
            vectores.extend(nuevos)
        return vectores
