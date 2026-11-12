"""Configuración común de las pruebas.

HU-SENT-007-v4 fija en 2 el mínimo de términos para calcular el humor de una
noticia. Las pruebas escritas antes de ese cambio usan noticias de un solo
término para verificar otras reglas (barrido, nube, ML, polarización); por eso
aquí el mínimo por defecto es 1. Las pruebas del mínimo lo fijan explícitamente
(tests/test_relevancia_noticias.py).
"""
import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def minimo_terminos_uno(monkeypatch):
    monkeypatch.setattr(settings, "sentimiento_minimo_terminos_defecto", 1)
