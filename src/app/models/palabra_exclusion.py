"""
Modelo ORM: PalabraExclusion (tabla palabras_exclusion).

Origina en: HU-SENT-009 (exclusión de noticias no relevantes para el humor) y
ADR-003, punto 7. Si una de estas palabras o frases aparece en el título de una
noticia (sin distinguir mayúsculas ni tildes, palabra completa), la noticia se
guarda pero no se calcula su humor: no cuenta en el mapa, la nube ni el listado.
Ejemplos: lotería, sorteo, horóscopo, lottery, horoscope.

Entidad independiente: no tiene relación persistida con Noticia; la regla se
aplica al calcular el humor y el resultado queda en Noticia.motivo_exclusion.
"""
from sqlalchemy import Column, Integer, String

from app.database import Base


class PalabraExclusion(Base):
    __tablename__ = "palabras_exclusion"

    id = Column(Integer, primary_key=True, index=True)
    palabra = Column(String(100), nullable=False, unique=True)
