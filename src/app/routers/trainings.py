"""
Router: /api/v1/trainings

Origina en: HU-SENT-006-v2 (entrenamiento manual del modelo de ML). ADR-007.
Contrato: contrato-sentimiento-diccionario.openapi.yaml v1.6.0, tag trainings.

Códigos de error:
- 409 DATOS_INSUFICIENTES: no se alcanza el umbral de noticias evaluadas. El
  modelo activo previo no cambia.
Desde ADR-007 el entrenamiento es local: ya no existen 502 ni 503.
"""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.common import Error
from app.schemas.modelo_sentimiento import ModeloSentimientoLeer
from app.services.modelo_ml_service import DatosInsuficientesError, entrenar_modelo

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
