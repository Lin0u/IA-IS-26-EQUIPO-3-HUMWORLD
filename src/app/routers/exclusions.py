"""
Router: /api/v1/exclusions — lista de exclusión de noticias no relevantes.

Origina en: HU-SENT-009 y ADR-003, punto 7. Contrato:
contrato-sentimiento-diccionario.openapi.yaml (v1.4.0, tag exclusions).
"""
from fastapi import APIRouter, Depends, Path
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.exceptions import PalabraExclusionConflictError, PalabraExclusionNotFoundError
from app.schemas.common import Error
from app.schemas.exclusion import PalabraExclusion, PalabraExclusionCrear
from app.services.exclusion_service import crear_palabra, eliminar_palabra, listar_palabras

router = APIRouter(prefix="/exclusions", tags=["exclusions"])


def _error(status_code: int, codigo: str, mensaje: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=Error(codigo=codigo, mensaje=mensaje).model_dump())


@router.get("", response_model=list[PalabraExclusion])
def listar(db: Session = Depends(get_db)):
    """Palabras y frases de la lista, en orden alfabético."""
    return listar_palabras(db)


@router.post(
    "",
    response_model=PalabraExclusion,
    status_code=201,
    responses={400: {"model": Error}, 409: {"model": Error}},
)
def crear(payload: PalabraExclusionCrear, db: Session = Depends(get_db)):
    """Agrega una palabra o frase. Las noticias se recalculan en el próximo barrido."""
    try:
        return crear_palabra(db, payload.palabra)
    except PalabraExclusionConflictError:
        return _error(409, "PALABRA_DUPLICADA", "Esa palabra ya está en la lista de exclusión.")


@router.delete("/{palabra_id}", status_code=204, responses={404: {"model": Error}})
def eliminar(palabra_id: int = Path(ge=1), db: Session = Depends(get_db)):
    """Quita una palabra. Las noticias se recalculan en el próximo barrido."""
    try:
        eliminar_palabra(db, palabra_id)
    except PalabraExclusionNotFoundError:
        return _error(404, "PALABRA_NO_ENCONTRADA", "La palabra no existe en la lista de exclusión.")
    return Response(status_code=204)
