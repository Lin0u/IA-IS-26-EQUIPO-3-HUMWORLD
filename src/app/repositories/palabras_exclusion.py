"""Repositorio de la lista de exclusión de noticias (HU-SENT-009)."""

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.palabra_exclusion import PalabraExclusion


class PalabraExclusionRepository:
    def listar(self, db: Session) -> list[PalabraExclusion]:
        return list(db.scalars(select(PalabraExclusion).order_by(PalabraExclusion.palabra)))

    def obtener(self, db: Session, palabra_id: int) -> PalabraExclusion | None:
        return db.get(PalabraExclusion, palabra_id)

    def insertar(self, db: Session, palabra: str) -> PalabraExclusion:
        registro = PalabraExclusion(palabra=palabra)
        db.add(registro)
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            raise
        db.refresh(registro)
        return registro

    def eliminar(self, db: Session, registro: PalabraExclusion) -> None:
        db.delete(registro)
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            raise
