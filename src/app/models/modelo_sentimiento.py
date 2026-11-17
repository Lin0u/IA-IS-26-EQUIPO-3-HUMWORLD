"""
Modelo ORM: ModeloSentimiento (tabla modelos_sentimiento).

Origina en: HU-SENT-006 (entrenamiento y versionado del modelo de ML) y
ADR-004, punto 5 (esquema de versionado). Solo guarda metadatos y la ruta del
regresor serializado (.joblib); el archivo vive en disco o en un volumen Docker.

Agregación con Noticia (rombo vacío, docs/UML/diagrama-clases.md): una
noticia calculada con ML referencia la versión usada, pero ambas tienen ciclos
de vida independientes.
"""
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String

from app.database import Base


class ModeloSentimiento(Base):
    __tablename__ = "modelos_sentimiento"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(50), nullable=False, unique=True)
    ruta_archivo = Column(String(500), nullable=False)
    # Representación del texto usada al entrenar. Desde ADR-007 es TF-IDF
    # ("tfidf-1-2"); el nombre del campo viene de ADR-004 y se conserva.
    modelo_embeddings_usado = Column(String(100), nullable=False)
    mae_evaluacion = Column(Float, nullable=False)
    # HU-SENT-010: noticias de entrenamiento y MAE de predecir siempre la media
    # (referencia de ADR-007). NULL en los modelos anteriores a ese cambio.
    cantidad_noticias = Column(Integer, nullable=True)
    mae_referencia = Column(Float, nullable=True)
    fecha_entrenamiento = Column(DateTime, nullable=False)
    activo = Column(Boolean, nullable=False, default=False, index=True)
