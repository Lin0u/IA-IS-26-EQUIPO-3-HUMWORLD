"""Agrega a modelos_sentimiento las noticias usadas y el MAE de referencia.

Origina en: HU-SENT-010 (tarjeta del modelo activo en el panel) y ADR-007,
punto 2 (MAE de una predicción constante como referencia). Decisión de la PO
del 2026-11-17.

Ambas columnas admiten NULL: los modelos entrenados antes de este cambio no
registraron esos datos y el panel los muestra como "sin dato".
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c4d9e7a1b2f5"
down_revision: Union[str, Sequence[str], None] = "b7e2c4a9d1f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("modelos_sentimiento", sa.Column("cantidad_noticias", sa.Integer(), nullable=True))
    op.add_column("modelos_sentimiento", sa.Column("mae_referencia", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("modelos_sentimiento", "mae_referencia")
    op.drop_column("modelos_sentimiento", "cantidad_noticias")
