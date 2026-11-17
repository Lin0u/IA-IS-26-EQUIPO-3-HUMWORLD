"""Deduplicación por canal: unicidad compuesta (fuente_rss_id, identificador_item_rss).

Origina en: HU-RSS-006-v2 (decisión de la PO del 2026-11-17, hallazgo R4 del QA
de captura RSS). La unicidad del identificador de ítem deja de ser global y pasa
a ser por fuente; la regla de deduplicación por canal se aplica en el servicio
de captura.

Antes: índice único global ix_noticias_identificador_item_rss. Después: índice
no único sobre identificador_item_rss + restricción única compuesta
uq_noticias_fuente_identificador (fuente_rss_id, identificador_item_rss).

Los datos existentes no rompen la migración: si hoy los identificadores son
únicos globalmente, también lo son por fuente.

Revision ID: d4b8e1f6a2c9
Revises: c9a1f3b7e2d5
Create Date: 2026-11-17 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "d4b8e1f6a2c9"
down_revision: Union[str, Sequence[str], None] = "c9a1f3b7e2d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Quitar el índice único global y recrearlo NO único (búsqueda rápida).
    op.drop_index("ix_noticias_identificador_item_rss", table_name="noticias")
    op.create_index(
        "ix_noticias_identificador_item_rss",
        "noticias",
        ["identificador_item_rss"],
        unique=False,
    )
    # 2. Unicidad compuesta por fuente. batch_alter_table hace el cambio también
    # en SQLite (copy-and-move), además de MySQL.
    with op.batch_alter_table("noticias") as batch:
        batch.create_unique_constraint(
            "uq_noticias_fuente_identificador",
            ["fuente_rss_id", "identificador_item_rss"],
        )


def downgrade() -> None:
    with op.batch_alter_table("noticias") as batch:
        batch.drop_constraint(
            "uq_noticias_fuente_identificador", type_="unique"
        )
    op.drop_index("ix_noticias_identificador_item_rss", table_name="noticias")
    op.create_index(
        "ix_noticias_identificador_item_rss",
        "noticias",
        ["identificador_item_rss"],
        unique=True,
    )
