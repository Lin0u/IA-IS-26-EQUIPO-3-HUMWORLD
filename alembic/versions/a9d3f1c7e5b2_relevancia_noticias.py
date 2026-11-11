"""Mínimo de términos y lista de exclusión de noticias no relevantes.

Origina en: HU-SENT-007-v4 (mínimo de términos del diccionario para calcular el
humor) y HU-SENT-009 (lista de exclusión por palabras del título); ADR-003,
punto 7. Decisiones de la PO del 2026-11-11:
- Mínimo inicial: 2 términos (editable en /config).
- Lista inicial de exclusión, editable en /exclusions.

Marca para recálculo las noticias calculadas por diccionario, para que el
barrido de humor (HU-SENT-002-v3) aplique las reglas nuevas.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "a9d3f1c7e5b2"
down_revision: Union[str, Sequence[str], None] = "e1f4a8c2b6d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Lista inicial propuesta: sorteos, juegos de azar y pasatiempos, en español e
# inglés. Pendiente de revisión del equipo.
PALABRAS_INICIALES = (
    "lotería",
    "sorteo",
    "baloto",
    "horóscopo",
    "crucigrama",
    "sudoku",
    "lottery",
    "powerball",
    "mega millions",
    "horoscope",
    "crossword",
    "wordle",
)


def upgrade() -> None:
    op.add_column("noticias", sa.Column("motivo_exclusion", sa.String(30), nullable=True))
    tabla = op.create_table(
        "palabras_exclusion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("palabra", sa.String(100), nullable=False, unique=True),
    )
    op.bulk_insert(tabla, [{"palabra": palabra} for palabra in PALABRAS_INICIALES])
    op.execute("INSERT INTO configuracion (clave, valor) VALUES ('minimo_terminos_humor', 2)")
    op.execute("UPDATE noticias SET metodo_calculo = NULL WHERE metodo_calculo = 'diccionario'")


def downgrade() -> None:
    op.execute("DELETE FROM configuracion WHERE clave = 'minimo_terminos_humor'")
    op.drop_table("palabras_exclusion")
    op.drop_column("noticias", "motivo_exclusion")
