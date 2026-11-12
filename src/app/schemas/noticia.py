"""
Esquemas de lectura de noticias.

Origina en: HU-DASH-002-v3 (antes HU-DASH-002-v2). Coherente con contrato-noticias.openapi.yaml,
componentes NoticiaResumen, NoticiaDetalle y NoticiaListado.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class OrdenNoticias(str, Enum):
    FECHA = "fecha"
    INFLUENCIA = "influencia"


class SignoHumor(str, Enum):
    TODAS = "todas"
    POSITIVAS = "positivas"
    NEGATIVAS = "negativas"


class NoticiaResumen(BaseModel):
    id: int
    titulo: str
    enlace_original: str
    canal: str
    continente: str
    pais: Optional[str] = None
    categoria_iptc: Optional[str] = None
    fecha_publicacion: Optional[datetime] = None
    fecha_registro: datetime
    valor_humor: Optional[float] = None
    metodo_calculo: Optional[str] = None


class TerminoCoincidente(BaseModel):
    """Término del diccionario encontrado en el texto (HU-DASH-002-v3, HU-SENT-005-v2).

    Explica el valor de humor: con metodo_calculo = "diccionario", valor_humor es
    el promedio simple de estos valores (ADR-003).
    """

    palabra: str
    idioma: str
    valor: int


class NoticiaDetalle(NoticiaResumen):
    contenido: Optional[str] = None
    cantidad_terminos_evaluados: Optional[int] = None
    # HU-DASH-002-v3: términos que explican el humor (coincidencias de HU-SENT-008).
    terminos: List[TerminoCoincidente] = Field(default_factory=list)
    # HU-SENT-007-v4 / HU-SENT-009: por qué quedó sin humor ("minimo_terminos" o
    # "palabra_exclusion"); null si tiene humor o no tiene ningún término.
    motivo_exclusion: Optional[str] = None


class NoticiasEstadisticas(BaseModel):
    """Cuántas noticias tienen humor y por qué quedaron fuera las demás (HU-SENT-009)."""

    total: int
    con_humor: int
    sin_terminos: int
    bajo_minimo_terminos: int
    excluidas_por_lista: int
    pendientes: int
    minimo_terminos_humor: int


class NoticiaListado(BaseModel):
    items: List[NoticiaResumen]
    pagina: int
    tamanio_pagina: int
    total: int


class ResultadoPurgado(BaseModel):
    """Resumen de un purgado de noticias (HU-ADMIN-002 y HU-ADMIN-003)."""

    noticias_eliminadas: int
    fecha_limite: datetime
