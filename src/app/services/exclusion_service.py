"""
Caso de uso: lista de exclusión de noticias no relevantes para el humor.

Origina en: HU-SENT-009 y ADR-003, punto 7 (decisión de la PO del 2026-11-11).
Una noticia cuyo título contiene una de estas palabras o frases se guarda pero
no recibe humor. Cada alta o baja marca para recálculo las noticias calculadas
por diccionario, igual que un cambio del diccionario (HU-SENT-002-v3).
"""
from sqlalchemy.orm import Session

from app.exceptions import PalabraExclusionConflictError, PalabraExclusionNotFoundError
from app.models.palabra_exclusion import PalabraExclusion
from app.repositories.palabras_exclusion import PalabraExclusionRepository
from app.services.sentimiento_service import frase_normalizada, invalidar_calculos_diccionario


def listar_palabras(db: Session) -> list[PalabraExclusion]:
    return PalabraExclusionRepository().listar(db)


def crear_palabra(db: Session, palabra: str) -> PalabraExclusion:
    """Agrega una palabra o frase. Dos formas que solo difieren en mayúsculas,
    tildes o espacios se consideran la misma ("Lotería" = "loteria")."""
    repositorio = PalabraExclusionRepository()
    limpia = " ".join(palabra.split()).lower()
    normalizada = frase_normalizada(limpia)
    if any(frase_normalizada(p.palabra) == normalizada for p in repositorio.listar(db)):
        raise PalabraExclusionConflictError(limpia)
    registro = repositorio.insertar(db, limpia)
    invalidar_calculos_diccionario(db)
    return registro


def eliminar_palabra(db: Session, palabra_id: int) -> None:
    repositorio = PalabraExclusionRepository()
    registro = repositorio.obtener(db, palabra_id)
    if registro is None:
        raise PalabraExclusionNotFoundError(palabra_id)
    repositorio.eliminar(db, registro)
    invalidar_calculos_diccionario(db)
