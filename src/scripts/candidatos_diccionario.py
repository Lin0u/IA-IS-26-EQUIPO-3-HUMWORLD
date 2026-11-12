"""
Ranking de palabras candidatas para el diccionario, a partir de las noticias
que quedaron sin humor por falta de términos.

Origina en: PDF §4.2.2 (diccionario de términos) y HU-SENT-001 (gestión del
diccionario); apoya la revisión de docs/Backlog/Dataset-lexico-noticias.md.
Herramienta de análisis para el equipo: no modifica la base de datos ni el
diccionario. Qué palabra se agrega y con qué valor lo decide el equipo.

Qué hace:
- Lee las noticias calculadas por diccionario que quedaron sin humor porque no
  tenían términos o tenían menos que el mínimo (HU-SENT-007-v4). No considera
  las excluidas por la lista (HU-SENT-009).
- Lematiza su título y resumen con spaCy (igual que el cálculo de humor) y
  descarta palabras vacías, números, nombres propios, palabras de menos de 3
  letras y las que ya coinciden con un término del diccionario.
- Nombres propios: los titulares en inglés suelen venir con Mayúscula Inicial
  en Cada Palabra y spaCy los confunde con nombres propios. Por eso el texto se
  analiza en minúsculas y se descartan las palabras que nunca aparecen escritas
  en minúscula en ninguna noticia (Trump, Gaza), que casi siempre son nombres.
- Por cada lema cuenta en cuántas noticias aparece y cuántas "recupera": las
  que tienen exactamente un término menos que el mínimo, que llegarían a tener
  humor si esa palabra se agregara al diccionario.

Uso (dentro del contenedor):
    docker compose exec api python -m scripts.candidatos_diccionario
    docker compose exec api python -m scripts.candidatos_diccionario --top 100 --salida candidatas.csv
    docker compose cp api:/tmp/candidatas.csv .

--salida recibe solo un nombre de archivo .csv (letras, números, "_" o "-"), que
se escribe en el directorio temporal del sistema (/tmp en el contenedor). No
acepta rutas, para que el argumento no pueda escribir fuera de ese directorio
(SonarQube: Path Traversal, CWE-22).
"""
import argparse
import csv
import os
import re
import tempfile
import sys
from collections import defaultdict
from dataclasses import dataclass, field

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.noticia import Noticia
from app.services import lematizacion
from app.services.configuracion_service import consultar_minimo_terminos
from app.services.sentimiento_service import (
    IDIOMAS_SOPORTADOS,
    METODO_DICCIONARIO,
    MOTIVO_MINIMO_TERMINOS,
    _cargar_terminos,
    _normalizar,
    _sin_html,
    texto_de_noticia,
)

LARGO_MINIMO = 3
DIRECTORIO_SALIDA = tempfile.gettempdir()
_NOMBRE_CSV = re.compile(r"[A-Za-z0-9_-]{1,80}\.csv")
_PALABRA = re.compile(r"\w+")
EJEMPLOS_POR_PALABRA = 2


@dataclass
class Candidata:
    palabra: str
    idioma: str
    noticias: set[int] = field(default_factory=set)
    recupera: set[int] = field(default_factory=set)
    formas: set[str] = field(default_factory=set)
    ejemplos: list[str] = field(default_factory=list)


def _formas_del_diccionario(terminos_por_idioma) -> dict[str, set[str]]:
    """Palabras sueltas del diccionario, normalizadas, por idioma."""
    return {
        idioma: {_normalizar(t.palabra) for t in terminos if " " not in _normalizar(t.palabra)}
        for idioma, terminos in terminos_por_idioma.items()
    }


def _lemas_candidatos(texto: str, idioma: str, conocidas: set[str]) -> dict[str, str]:
    """{lema: forma} de las palabras del texto que podrían ser términos nuevos."""
    modelo = lematizacion.cargar_modelo(idioma)
    if modelo is None:
        return {}
    encontrados: dict[str, str] = {}
    for token in modelo(_sin_html(texto).casefold()):
        if token.is_punct or token.is_space or token.is_stop or token.like_num:
            continue
        if not token.is_alpha:
            continue
        forma, lema = _normalizar(token.text), _normalizar(token.lemma_)
        if len(lema) < LARGO_MINIMO or forma in conocidas or lema in conocidas:
            continue
        encontrados.setdefault(lema, forma)
    return encontrados


def contar_candidatas(noticias, terminos_por_idioma, minimo: int) -> list[Candidata]:
    """Ranking de candidatas: primero las que más noticias recuperan."""
    conocidas = _formas_del_diccionario(terminos_por_idioma)
    en_minuscula: set[str] = set()
    candidatas: dict[tuple[str, str], Candidata] = {}
    for noticia in noticias:
        idiomas = (
            (noticia.idioma_detectado,)
            if noticia.idioma_detectado in IDIOMAS_SOPORTADOS
            else IDIOMAS_SOPORTADOS
        )
        le_falta_uno = (noticia.cantidad_terminos_evaluados or 0) == minimo - 1
        texto = texto_de_noticia(noticia)
        en_minuscula.update(
            _normalizar(p) for p in _PALABRA.findall(_sin_html(texto)) if p == p.casefold()
        )
        for idioma in idiomas:
            for lema, forma in _lemas_candidatos(texto, idioma, conocidas.get(idioma, set())).items():
                candidata = candidatas.setdefault((lema, idioma), Candidata(lema, idioma))
                candidata.noticias.add(noticia.id)
                candidata.formas.add(forma)
                if le_falta_uno:
                    candidata.recupera.add(noticia.id)
                if len(candidata.ejemplos) < EJEMPLOS_POR_PALABRA:
                    candidata.ejemplos.append(noticia.titulo)
    reales = [c for c in candidatas.values() if c.formas & en_minuscula]
    return sorted(
        reales,
        key=lambda c: (-len(c.recupera), -len(c.noticias), c.idioma, c.palabra),
    )


def noticias_sin_humor_por_terminos(db: Session) -> list[Noticia]:
    """Calculadas por diccionario, sin humor, por falta de términos (no por la lista)."""
    return list(
        db.scalars(
            select(Noticia).where(
                Noticia.metodo_calculo == METODO_DICCIONARIO,
                Noticia.valor_humor.is_(None),
                or_(
                    Noticia.motivo_exclusion.is_(None),
                    Noticia.motivo_exclusion == MOTIVO_MINIMO_TERMINOS,
                ),
            )
        )
    )


def ruta_salida(nombre: str, directorio: str = DIRECTORIO_SALIDA) -> str:
    """Ruta segura del CSV: solo un nombre de archivo dentro del directorio dado."""
    if not _NOMBRE_CSV.fullmatch(nombre):
        raise ValueError(
            "--salida debe ser solo un nombre de archivo .csv (letras, números, '_' o '-'), sin rutas."
        )
    base = os.path.realpath(directorio)
    ruta = os.path.realpath(os.path.join(base, nombre))
    if os.path.dirname(ruta) != base:
        raise ValueError("--salida debe quedar dentro del directorio de salida.")
    return ruta


def escribir_csv(candidatas: list[Candidata], ruta: str) -> None:
    with open(ruta, "w", encoding="utf-8-sig", newline="") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(
            ["palabra", "idioma", "noticias", "recupera", "formas", "ejemplo", "valor_propuesto"]
        )
        for c in candidatas:
            escritor.writerow(
                [
                    c.palabra,
                    c.idioma,
                    len(c.noticias),
                    len(c.recupera),
                    " ".join(sorted(c.formas)),
                    " | ".join(c.ejemplos),
                    "",  # lo completa el equipo
                ]
            )


def main(
    argv: list[str] | None = None,
    session_factory=SessionLocal,
    directorio_salida: str = DIRECTORIO_SALIDA,
) -> int:
    parser = argparse.ArgumentParser(description="Palabras candidatas para el diccionario")
    parser.add_argument("--top", type=int, default=40, help="filas a mostrar (40 por defecto)")
    parser.add_argument(
        "--salida",
        help="nombre del CSV con el ranking completo, que se escribe en el directorio temporal",
    )
    args = parser.parse_args(argv)
    try:
        destino = ruta_salida(args.salida, directorio_salida) if args.salida else None
    except ValueError as error:
        print(error, file=sys.stderr)
        return 2

    db = session_factory()
    try:
        minimo = consultar_minimo_terminos(db)
        noticias = noticias_sin_humor_por_terminos(db)
        candidatas = contar_candidatas(noticias, _cargar_terminos(db), minimo)
    finally:
        db.close()

    faltan_uno = sum((n.cantidad_terminos_evaluados or 0) == minimo - 1 for n in noticias)
    print(
        f"{len(noticias)} noticias sin humor por falta de términos (mínimo {minimo}); "
        f"{faltan_uno} tienen {minimo - 1} y les falta un solo término."
    )
    print(f"{'palabra':<22} {'idioma':<6} {'noticias':>8} {'recupera':>8}  ejemplo")
    for c in candidatas[: args.top]:
        ejemplo = (c.ejemplos[0] if c.ejemplos else "")[:70]
        print(f"{c.palabra:<22} {c.idioma:<6} {len(c.noticias):>8} {len(c.recupera):>8}  {ejemplo}")
    if destino:
        escribir_csv(candidatas, destino)
        print(f"Ranking completo ({len(candidatas)} palabras) en {destino}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
