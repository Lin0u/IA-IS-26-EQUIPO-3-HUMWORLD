"""Singular y plural del diccionario cuentan como un solo concepto.

Origina en: HU-SENT-007-v4, corrección del 2026-11-11 (un concepto por lema aunque el diccionario tenga
varias formas, p. ej. "award" y "awards"); ADR-003, punto 6. Decisión de la PO
del 2026-11-11.

No cambia el esquema: solo marca para recálculo las noticias calculadas por
diccionario, para que el barrido de humor (HU-SENT-002-v3) aplique la regla.
"""

from typing import Sequence, Union

from alembic import op


revision: str = "b7e2c4a9d1f3"
down_revision: Union[str, Sequence[str], None] = "a9d3f1c7e5b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE noticias SET metodo_calculo = NULL WHERE metodo_calculo = 'diccionario'")


def downgrade() -> None:
    # Sin cambios de esquema que revertir: el barrido vuelve a calcular.
    pass
