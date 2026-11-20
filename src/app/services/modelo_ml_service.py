"""
Entrenamiento, versionado y uso del modelo de ML de humor.

Origina en: HU-SENT-006-v2 (entrenamiento y versionado, POST /api/v1/trainings)
y HU-SENT-002-v4 (camino ML del cálculo híbrido). Arquitectura: ADR-007, que
reemplaza los puntos 1, 2 y 7 de ADR-004 (los puntos 3 a 6 siguen vigentes).

AVISO (instrucciones del proyecto, sección 12): este módulo contiene lógica de
negocio del modelo de sentimiento. Debe ser revisado por el equipo antes de
fusionarse. Las cifras (umbral 1.000, validación 20 %, parámetros de TF-IDF,
alpha de Ridge 1.0) son valores propuestos, no ratificados.

Resumen del flujo de entrenamiento (ADR-007):
1. Datos: noticias con metodo_calculo = "diccionario" y valor_humor no nulo.
   Si no alcanzan ml_umbral_entrenamiento → DatosInsuficientesError (409).
2. Modelo: Pipeline de scikit-learn con TF-IDF (texto sin HTML, minúsculas y
   sin tildes) + Ridge. Todo se calcula localmente: sin servicios externos.
3. Partición fija entrenamiento/validación (semilla 42). El vectorizador se
   ajusta solo con la partición de entrenamiento (dentro del Pipeline).
4. Evaluación: MAE contra el valor del diccionario en validación, y como
   referencia el MAE de predecir siempre la media. Limitación metodológica
   (ADR-004 punto 6 y ADR-007): el diccionario es la única referencia de
   verdad y TF-IDF tiende a reaprender sus pesos.
5. Versionado: un solo .joblib (vectorizador + regresor) en
   ml_directorio_modelos + fila en modelos_sentimiento, que pasa a ser la
   versión activa. Si algo falla antes del registro, el modelo activo previo
   no cambia.
"""
import logging
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.modelo_sentimiento import ModeloSentimiento
from app.repositories.modelos_sentimiento import ModeloSentimientoRepository
from app.services.sentimiento_service import _sin_html

logger = logging.getLogger(__name__)

ESCALA_MIN, ESCALA_MAX = -10.0, 10.0  # escala del diccionario (ADR-003)
SEMILLA = 42
PREFIJO_REPRESENTACION = "tfidf"


class ModeloNoActivoError(Exception):
    """No hay un modelo de ML activo y utilizable (HU-SENT-010)."""


class DatosInsuficientesError(Exception):
    """No hay suficientes noticias evaluadas por diccionario (HU-SENT-006-v2)."""

    def __init__(self, disponibles: int, umbral: int) -> None:
        super().__init__(f"{disponibles} noticias evaluadas; se requieren {umbral}.")
        self.disponibles = disponibles
        self.umbral = umbral


def preparar_texto(texto: str) -> str:
    """Sin HTML, en minúsculas y sin tildes, igual que la normalización del diccionario.

    Función de módulo (no lambda) para que el Pipeline se pueda guardar con joblib.
    """
    limpio = unicodedata.normalize("NFKD", _sin_html(texto or "").lower())
    return "".join(c for c in limpio if not unicodedata.combining(c))


def _texto(titulo: str | None, contenido: str | None) -> str:
    # Mismo formato que sentimiento_service.texto_de_noticia (camino de predicción).
    return f"{titulo or ''} {contenido or ''}"


def representacion_actual() -> str:
    """Identificador de la representación, guardado en modelo_embeddings_usado (ADR-007)."""
    minimo, maximo = settings.ml_tfidf_ngramas_min, settings.ml_tfidf_ngramas_max
    return f"{PREFIJO_REPRESENTACION}-{minimo}-{maximo}"


def construir_pipeline() -> Pipeline:
    """TF-IDF + Ridge con los valores propuestos de ADR-007, punto 1."""
    return Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    preprocessor=preparar_texto,
                    ngram_range=(settings.ml_tfidf_ngramas_min, settings.ml_tfidf_ngramas_max),
                    min_df=settings.ml_tfidf_min_df,
                    max_df=settings.ml_tfidf_max_df,
                    max_features=settings.ml_tfidf_max_features,
                    sublinear_tf=True,
                ),
            ),
            ("ridge", Ridge(alpha=settings.ml_ridge_alpha)),
        ]
    )


def _ahora_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def entrenar_modelo(
    db: Session,
    ahora: datetime | None = None,
    repository: ModeloSentimientoRepository | None = None,
) -> ModeloSentimiento:
    """Entrena, evalúa y activa una nueva versión del modelo (HU-SENT-006-v2)."""
    repositorio = repository or ModeloSentimientoRepository()
    umbral = settings.ml_umbral_entrenamiento
    disponibles = repositorio.contar_datos_entrenamiento(db)
    if disponibles < umbral:
        raise DatosInsuficientesError(disponibles, umbral)

    filas = repositorio.listar_datos_entrenamiento(db)
    textos = [_texto(titulo, contenido) for titulo, contenido, _ in filas]
    objetivos = np.array([valor for _, _, valor in filas], dtype=float)

    t_ent, t_val, y_ent, y_val = train_test_split(
        textos, objetivos, test_size=settings.ml_proporcion_validacion, random_state=SEMILLA
    )
    pipeline = construir_pipeline()
    pipeline.fit(t_ent, y_ent)  # el vocabulario sale solo de la partición de entrenamiento
    predicciones = np.clip(pipeline.predict(t_val), ESCALA_MIN, ESCALA_MAX)
    mae = float(mean_absolute_error(y_val, predicciones))
    mae_referencia = float(mean_absolute_error(y_val, np.full(len(y_val), y_ent.mean())))

    fecha = ahora or _ahora_utc()
    version = fecha.strftime("%Y%m%dT%H%M%S%fZ")
    directorio = Path(settings.ml_directorio_modelos)
    directorio.mkdir(parents=True, exist_ok=True)
    ruta = directorio / f"modelo-sentimiento-{version}.joblib"
    joblib.dump(pipeline, ruta)

    modelo = ModeloSentimiento(
        version=version,
        ruta_archivo=str(ruta),
        modelo_embeddings_usado=representacion_actual(),
        mae_evaluacion=mae,
        fecha_entrenamiento=fecha,
        cantidad_noticias=len(filas),
        mae_referencia=mae_referencia,
    )
    try:
        modelo = repositorio.registrar_como_activo(db, modelo)
    except Exception:
        ruta.unlink(missing_ok=True)
        raise
    invalidar_cache()
    logger.info(
        "Modelo de humor %s entrenado con %s noticias (%s términos de vocabulario): "
        "MAE vs. diccionario = %.3f; MAE de predecir siempre la media = %.3f",
        version,
        len(filas),
        len(pipeline.named_steps["tfidf"].vocabulary_),
        mae,
        mae_referencia,
    )
    return modelo


# --- HU-SENT-002-v4: proveedor del modelo activo ------------------------------


@dataclass
class ProveedorRegresor:
    """Predice el humor de un texto con el Pipeline activo (ProveedorModeloML)."""

    modelo_id: int
    pipeline: object

    def predecir(self, texto: str) -> float:
        valor = float(self.pipeline.predict([texto])[0])
        return float(np.clip(valor, ESCALA_MIN, ESCALA_MAX))


_cache: dict[str, object] = {}


def invalidar_cache() -> None:
    _cache.clear()


def proveedor_activo(db: Session) -> ProveedorRegresor | None:
    """Proveedor del modelo activo, o None si el camino ML no está disponible.

    None (y por tanto diccionario) cuando: no hay modelo activo, el modelo
    activo no es TF-IDF (p. ej. entrenado con embeddings de Gemini, ADR-004) o
    su archivo .joblib no se puede cargar. Nunca lanza excepciones: el cálculo
    de humor no debe fallar por el camino ML.
    """
    try:
        modelo = ModeloSentimientoRepository().obtener_activo(db)
        if modelo is None:
            return None
        if not (modelo.modelo_embeddings_usado or "").startswith(PREFIJO_REPRESENTACION):
            logger.warning(
                "El modelo activo %s usa la representación '%s', incompatible con ADR-007; se usa diccionario",
                modelo.version,
                modelo.modelo_embeddings_usado,
            )
            return None
        if _cache.get("id") != modelo.id:
            pipeline = joblib.load(modelo.ruta_archivo)
            if not hasattr(pipeline, "predict"):
                raise ValueError("El archivo del modelo no contiene un modelo entrenado.")
            _cache.update(id=modelo.id, proveedor=ProveedorRegresor(modelo.id, pipeline))
        return _cache["proveedor"]
    except (OSError, ValueError, EOFError) as exc:
        logger.warning("No se pudo cargar el modelo de ML activo: %s; se usa diccionario", exc)
        return None
    except Exception:  # noqa: BLE001 - p. ej. tabla inexistente sin migrar o pickle corrupto
        logger.exception("Error al obtener el modelo de ML activo; se usa diccionario")
        return None


# --- HU-SENT-010: consulta y prueba del modelo activo -------------------------


def modelo_activo(db: Session) -> ModeloSentimiento:
    """Versión activa del modelo, o ModeloNoActivoError si no hay ninguna."""
    modelo = ModeloSentimientoRepository().obtener_activo(db)
    if modelo is None:
        raise ModeloNoActivoError("No hay un modelo de ML activo.")
    return modelo


def predecir_texto(db: Session, texto: str) -> tuple[float, ModeloSentimiento]:
    """Humor que el modelo activo asigna a un texto arbitrario. No persiste nada.

    ModeloNoActivoError si no hay modelo activo o si no se puede usar
    (incompatible con ADR-007 o archivo ilegible).
    """
    modelo = modelo_activo(db)
    proveedor = proveedor_activo(db)
    if proveedor is None or proveedor.modelo_id != modelo.id:
        raise ModeloNoActivoError("El modelo activo no se puede usar; vuelve a entrenarlo.")
    return proveedor.predecir(texto), modelo
