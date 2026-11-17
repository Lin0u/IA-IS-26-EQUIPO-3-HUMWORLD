"""
Router: /api/v1/trainings

Origina en: HU-SENT-006-v2 (entrenamiento manual del modelo de ML). ADR-007.
Contrato: contrato-sentimiento-diccionario.openapi.yaml v1.6.0, tag trainings.

Códigos de error:
- 409 DATOS_INSUFICIENTES: no se alcanza el umbral de noticias evaluadas. El
  modelo activo previo no cambia.
- 404 MODELO_NO_ACTIVO (HU-SENT-010): no hay un modelo activo utilizable.
Desde ADR-007 el entrenamiento es local: ya no existen 502 ni 503.

HU-SENT-010 agrega GET /trainings/active (tarjeta del modelo activo) y
POST /trainings/active/predictions (probar el modelo con un texto, sin
persistir nada).
"""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.common import Error
from app.schemas.modelo_sentimiento import ModeloSentimientoLeer, PrediccionCrear, PrediccionResultado
from app.services.modelo_ml_service import (
    DatosInsuficientesError,
    ModeloNoActivoError,
    entrenar_modelo,
    modelo_activo,
    predecir_texto,
)

router = APIRouter(prefix="/trainings", tags=["trainings"])


def _error(status: int, codigo: str, mensaje: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content=Error(codigo=codigo, mensaje=mensaje).model_dump(exclude_none=True),
    )


@router.post(
    "",
    status_code=201,
    response_model=ModeloSentimientoLeer,
    responses={409: {"model": Error}},
)
def entrenar(db: Session = Depends(get_db)):
    """Entrena y activa una nueva versión del modelo de humor (HU-SENT-006-v2)."""
    try:
        return entrenar_modelo(db)
    except DatosInsuficientesError as exc:
        return _error(
            409,
            "DATOS_INSUFICIENTES",
            f"Hay {exc.disponibles} noticias evaluadas por diccionario; se requieren {exc.umbral}.",
        )


@router.get("/active", response_model=ModeloSentimientoLeer, responses={404: {"model": Error}})
def obtener_modelo_activo(db: Session = Depends(get_db)):
    """Versión activa del modelo y sus métricas (HU-SENT-010)."""
    try:
        return modelo_activo(db)
    except ModeloNoActivoError as exc:
        return _error(404, "MODELO_NO_ACTIVO", str(exc))


@router.post(
    "/active/predictions",
    response_model=PrediccionResultado,
    responses={400: {"model": Error}, 404: {"model": Error}},
)
def predecir(payload: PrediccionCrear, db: Session = Depends(get_db)):
    """Humor que el modelo activo asigna a un texto, sin guardarlo (HU-SENT-010)."""
    try:
        valor, modelo = predecir_texto(db, payload.texto)
    except ModeloNoActivoError as exc:
        return _error(404, "MODELO_NO_ACTIVO", str(exc))
    return PrediccionResultado(valor_humor=valor, modelo_id=modelo.id, version=modelo.version)
