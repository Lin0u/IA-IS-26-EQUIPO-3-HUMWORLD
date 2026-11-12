"""Esquemas de la lista de exclusión (GET/POST/DELETE /api/v1/exclusions, HU-SENT-009)."""
from pydantic import BaseModel, ConfigDict, Field, field_validator


class PalabraExclusionCrear(BaseModel):
    palabra: str = Field(min_length=1, max_length=100)

    @field_validator("palabra")
    @classmethod
    def con_letras(cls, valor: str) -> str:
        if not any(c.isalnum() for c in valor):
            raise ValueError("La palabra debe contener al menos una letra o número.")
        return valor


class PalabraExclusion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    palabra: str
