"""Esquemas del modelo de ML: versión del modelo y predicción de prueba.

Origina en: HU-SENT-006-v2 y HU-SENT-010. Coherente con
contrato-sentimiento-diccionario.openapi.yaml (componentes ModeloSentimiento,
PrediccionCrear y PrediccionResultado; ruta_archivo no se expone).
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ModeloSentimientoLeer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: str
    modelo_embeddings_usado: str
    mae_evaluacion: float
    fecha_entrenamiento: datetime
    activo: bool
    # HU-SENT-010: null en los modelos entrenados antes de registrarlos.
    cantidad_noticias: Optional[int] = None
    mae_referencia: Optional[float] = None


class PrediccionCrear(BaseModel):
    """HU-SENT-010: texto que el administrador quiere probar con el modelo activo."""

    texto: str = Field(min_length=1, max_length=5000)

    @field_validator("texto")
    @classmethod
    def no_vacio(cls, valor: str) -> str:
        if not valor.strip():
            raise ValueError("El texto no puede estar vacío.")
        return valor


class PrediccionResultado(BaseModel):
    valor_humor: float
    modelo_id: int
    version: str
