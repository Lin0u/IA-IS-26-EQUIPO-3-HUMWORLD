"""
Pruebas del ranking de palabras candidatas para el diccionario
(scripts/candidatos_diccionario.py; PDF §4.2.2, HU-SENT-001). Usan los modelos
reales de spaCy, que son locales; SQLite en memoria, sin red.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 - registra todas las tablas
from app.database import Base
from app.models.canal import CanalNoticias
from app.models.fuente import FuenteRSS
from app.models.noticia import Noticia
from app.models.termino_diccionario import TerminoDiccionario
from scripts import candidatos_diccionario as script
from scripts.candidatos_diccionario import contar_candidatas


def _noticia(id_, titulo, terminos, idioma="en", motivo="minimo_terminos"):
    return Noticia(
        id=id_, titulo=titulo, contenido="", idioma_detectado=idioma,
        cantidad_terminos_evaluados=terminos, motivo_exclusion=motivo,
    )


TERMINOS = {"en": [TerminoDiccionario(id=1, palabra="war", idioma="en", valor=-4)], "es": []}


def test_cuenta_noticias_y_recuperables_y_descarta_lo_conocido():
    noticias = [
        _noticia(1, "Tariffs hit farmers during the war", 2),
        _noticia(2, "New tariff announced by Trump", 1),
        _noticia(3, "Farmers protest tariffs", 2),
    ]
    ranking = contar_candidatas(noticias, TERMINOS, minimo=3)
    por_palabra = {c.palabra: c for c in ranking}
    assert len(por_palabra["tariff"].noticias) == 3
    assert len(por_palabra["tariff"].recupera) == 2  # las que tienen 2 de 3
    assert ranking[0].palabra in {"tariff", "farmer"}
    assert "war" not in por_palabra  # ya es término
    assert "the" not in por_palabra and "during" not in por_palabra  # palabras vacías
    assert "trump" not in por_palabra  # nunca aparece en minúscula: nombre propio


def test_idioma_desconocido_evalua_ambos_idiomas():
    ranking = contar_candidatas([_noticia(1, "Grave sequía en el norte", 0, idioma=None)], TERMINOS, minimo=3)
    assert {c.idioma for c in ranking} <= {"es", "en"}
    assert any(c.palabra == "sequia" for c in ranking)


@pytest.fixture()
def session_factory():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    yield sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.drop_all(bind=engine)


def test_main_lee_solo_las_sin_humor_por_falta_de_terminos(session_factory, tmp_path, capsys):
    from datetime import datetime, timezone

    db = session_factory()
    canal = CanalNoticias(nombre="Medio", continente="America")
    fuente = FuenteRSS(url="https://medio.test/rss", categoria_iptc="Política", canal=canal)
    db.add_all([canal, fuente])
    db.flush()
    base = dict(fuente_rss_id=fuente.id, enlace_original="https://medio.test/n",
                fecha_registro=datetime.now(timezone.utc), idioma_detectado="en",
                metodo_calculo="diccionario")
    db.add_all([
        Noticia(identificador_item_rss="a", titulo="Tariffs rise", contenido="new tariffs", cantidad_terminos_evaluados=0, **base),
        Noticia(identificador_item_rss="b", titulo="Lottery tariffs", motivo_exclusion="palabra_exclusion",
                cantidad_terminos_evaluados=0, **base),
        Noticia(identificador_item_rss="c", titulo="Tariffs good", valor_humor=4.0,
                cantidad_terminos_evaluados=3, **base),
    ])
    db.commit()
    db.close()

    salida = tmp_path / "candidatas.csv"
    assert script.main(["--salida", str(salida)], session_factory) == 0
    impreso = capsys.readouterr().out
    assert impreso.startswith("1 noticias sin humor")
    contenido = salida.read_text(encoding="utf-8-sig")
    assert contenido.splitlines()[0].startswith("palabra,idioma,noticias,recupera")
    assert "tariff,en,1," in contenido
