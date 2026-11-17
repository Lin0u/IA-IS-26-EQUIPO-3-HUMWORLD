"""
Modelo ORM: FuenteRSS.

Origina en: HU-RSS-002 (alta de fuente RSS dentro de un canal), HU-RSS-004
(modificación), HU-RSS-005 (eliminación).
Decisión de arquitectura: ADR-002, sección 1 y 3 (patrones de resiliencia).
"""
import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from app.database import Base


class EstadoCircuitBreaker(str, enum.Enum):
    """Ver ADR-002, sección 3 — Circuit Breaker por fuente RSS individual."""

    CERRADO = "cerrado"
    ABIERTO = "abierto"
    SEMI_ABIERTO = "semi_abierto"


class FuenteRSS(Base):
    __tablename__ = "fuentes_rss"

    id = Column(Integer, primary_key=True, index=True)
    canal_id = Column(Integer, ForeignKey("canales_noticias.id"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    categoria_iptc = Column(String(100), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    fecha_ultima_captura_exitosa = Column(DateTime, nullable=True)
    estado_circuit_breaker = Column(
        Enum(EstadoCircuitBreaker),
        nullable=False,
        default=EstadoCircuitBreaker.CERRADO,
    )
    # R1 (ADR-002, resiliencia — Circuit Breaker por fuente). Cuenta los fallos
    # consecutivos; al llegar al umbral la fuente pasa a ABIERTO y se omite en
    # las siguientes ejecuciones del cron hasta que termina la espera.
    fallos_consecutivos = Column(
        Integer, nullable=False, default=0, server_default="0"
    )
    # Momento en que el circuito se abrió, para medir la ventana de espera.
    circuito_abierto_desde = Column(DateTime, nullable=True)

    canal = relationship("CanalNoticias", back_populates="fuentes")
    noticias = relationship("Noticia", back_populates="fuente")
