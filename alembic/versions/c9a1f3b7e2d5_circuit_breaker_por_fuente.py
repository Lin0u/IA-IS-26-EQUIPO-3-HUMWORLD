"""Circuit Breaker por fuente: fallos consecutivos y apertura.

Origina en: R1 del QA de captura RSS (ADR-002, resiliencia — Circuit Breaker
por fuente). Agrega a `fuentes_rss` los campos que faltaban para que el
circuito pueda contar fallos consecutivos y recordar desde cuándo está abierto.

Motivo: el estado_circuit_breaker ya existía, pero ningún código lo abría
porque no había dónde contar los fallos ni medir la ventana de espera.

Revision ID: c9a1f3b7e2d5
Revises: b7e2c4a9d1f3
Create Date: 2026-11-17 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9a1f3b7e2d5"
down_revision: Union[str, Sequence[str], None] = "b7e2c4a9d1f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "fuentes_rss",
        sa.Column(
            "fallos_consecutivos",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "fuentes_rss",
        sa.Column("circuito_abierto_desde", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("fuentes_rss", "circuito_abierto_desde")
    op.drop_column("fuentes_rss", "fallos_consecutivos")
