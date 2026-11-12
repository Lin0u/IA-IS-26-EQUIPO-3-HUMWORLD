"""Esquemas Pydantic de la configuración general (GET/PUT /api/v1/config).

Origina en: HU-RSS-007 (periodicidad del cron), HU-ADMIN-001-v2 (caducidad de
noticias, PDF §4.2.5) y HU-SENT-007-v4 (mínimo de términos por noticia).
"""

from typing import Optional

from pydantic import BaseModel, Field, StrictInt


class Configuracion(BaseModel):
    periodicidad_cron_minutos: StrictInt = Field(ge=1)
    caducidad_noticias_dias: StrictInt = Field(ge=1)
    minimo_terminos_humor: StrictInt = Field(ge=1)


class ConfiguracionActualizar(BaseModel):
    periodicidad_cron_minutos: StrictInt = Field(ge=1)
    # Opcional para no romper a los clientes de HU-RSS-007 que solo envían la
    # periodicidad; si se omite, se conserva el valor vigente.
    caducidad_noticias_dias: Optional[StrictInt] = Field(default=None, ge=1)
    # HU-SENT-007-v4: opcional por la misma razón. Si cambia, las noticias
    # calculadas por diccionario se recalculan en el próximo barrido.
    minimo_terminos_humor: Optional[StrictInt] = Field(default=None, ge=1)
