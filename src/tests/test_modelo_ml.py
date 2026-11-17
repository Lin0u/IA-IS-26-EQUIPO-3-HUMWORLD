"""
Pruebas del modelo de ML de humor (HU-SENT-006-v2) y de su uso en el cálculo
híbrido (HU-SENT-002-v4). ADR-007: TF-IDF + Ridge locales.

Desde ADR-007 no hay servicios externos: se entrena un modelo real y pequeño
con un dataset de fixture determinista. SQLite en memoria y archivos .joblib en
un directorio temporal.
"""
from datetime import datetime

import joblib
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.canal import CanalNoticias
from app.models.fuente import FuenteRSS
from app.models.modelo_sentimiento import ModeloSentimiento
from app.models.noticia import Noticia
from app.models.termino_diccionario import TerminoDiccionario
from app.repositories.modelos_sentimiento import ModeloSentimientoRepository
from app.services import modelo_ml_service
from app.services.modelo_ml_service import (
    DatosInsuficientesError,
    ProveedorRegresor,
    construir_pipeline,
    entrenar_modelo,
    preparar_texto,
    proveedor_activo,
)
from app.services.sentimiento_service import METODO_DICCIONARIO, METODO_ML, procesar_noticias

AHORA = datetime(2026, 11, 17, 12, 0, 0)

# Vocabulario de fixture: cada palabra empuja el humor en una dirección fija.
NEGATIVAS = ["guerra", "ataque", "muertos", "crisis", "derrumbe"]
POSITIVAS = ["acuerdo", "paz", "rescate", "victoria", "celebra"]
NEUTRAS = ["gobierno", "ciudad", "informe", "lunes", "pais"]


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, autoflush=False, autocommit=False)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def configuracion_ml(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "ml_directorio_modelos", str(tmp_path / "modelos"))
    monkeypatch.setattr(settings, "ml_umbral_entrenamiento", 10)
    modelo_ml_service.invalidar_cache()
    yield
    modelo_ml_service.invalidar_cache()


@pytest.fixture()
def fuente(db):
    canal = CanalNoticias(nombre="Canal ML", continente="Europa")
    db.add(canal)
    db.flush()
    fuente = FuenteRSS(canal_id=canal.id, url="https://ml.example.test", categoria_iptc="11000000")
    db.add(fuente)
    db.commit()
    return fuente


_n = [0]


def _noticia(db, fuente, titulo, valor=None, metodo=METODO_DICCIONARIO, contenido=None):
    _n[0] += 1
    noticia = Noticia(
        fuente_rss_id=fuente.id,
        identificador_item_rss=f"ml-{_n[0]}",
        titulo=titulo,
        contenido=contenido,
        enlace_original=f"https://ml.example.test/{_n[0]}",
        fecha_registro=AHORA,
        valor_humor=valor,
        metodo_calculo=metodo,
    )
    db.add(noticia)
    db.commit()
    return noticia


def _datos(db, fuente, cantidad=60):
    """Noticias negativas (-6), positivas (+6) y neutras (0), con contexto neutro."""
    for i in range(cantidad):
        neutra = NEUTRAS[i % len(NEUTRAS)]
        if i % 3 == 0:
            titulo, valor = f"{NEGATIVAS[i % 5]} en la {neutra}", -6.0
        elif i % 3 == 1:
            titulo, valor = f"{POSITIVAS[i % 5]} en la {neutra}", 6.0
        else:
            titulo, valor = f"{neutra} {NEUTRAS[(i + 1) % 5]} sin novedad", 0.0
        _noticia(db, fuente, titulo, valor=valor, contenido="<p>Texto de la noticia.</p>")


def _modelos(db):
    return db.execute(select(ModeloSentimiento).order_by(ModeloSentimiento.id)).scalars().all()


# --- HU-SENT-006-v2: entrenamiento ------------------------------------------

def test_entrenamiento_exitoso_registra_y_activa_una_version(db, fuente, tmp_path):
    _datos(db, fuente)

    modelo = entrenar_modelo(db, ahora=AHORA)

    assert modelo.activo is True
    assert modelo.version == "20261117T120000000000Z"
    assert modelo.modelo_embeddings_usado == "tfidf-1-2"
    assert modelo.fecha_entrenamiento == AHORA
    assert 0 <= modelo.mae_evaluacion < 3.0  # mejor que adivinar (MAE de la media ≈ 4)
    assert (tmp_path / "modelos" / f"modelo-sentimiento-{modelo.version}.joblib").exists()


def test_el_modelo_aprende_la_direccion_del_humor(db, fuente):
    _datos(db, fuente)
    modelo = entrenar_modelo(db, ahora=AHORA)
    pipeline = joblib.load(modelo.ruta_archivo)

    negativa, positiva = pipeline.predict(["guerra y ataque en la ciudad", "acuerdo de paz en la ciudad"])

    assert negativa < -1.0 < 1.0 < positiva


def test_el_entrenamiento_no_usa_servicios_externos(db, fuente, monkeypatch):
    """Escenario 'Entrenamiento sin conexión a internet ni clave de API'."""
    import socket

    def sin_red(*args, **kwargs):
        raise AssertionError("El entrenamiento intentó conectarse a la red")

    monkeypatch.setattr(socket.socket, "connect", sin_red)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    _datos(db, fuente)

    assert entrenar_modelo(db, ahora=AHORA).activo is True


def test_el_vectorizador_solo_aprende_de_la_particion_de_entrenamiento(db, fuente, monkeypatch):
    """Escenario 'Evaluación sin fuga de vocabulario'."""
    particiones = {}
    dividir = modelo_ml_service.train_test_split

    def espiar(textos, objetivos, **kwargs):
        t_ent, t_val, y_ent, y_val = dividir(textos, objetivos, **kwargs)
        particiones.update(entrenamiento=t_ent, validacion=t_val)
        return t_ent, t_val, y_ent, y_val

    monkeypatch.setattr(modelo_ml_service, "train_test_split", espiar)
    _datos(db, fuente, cantidad=50)

    modelo = entrenar_modelo(db, ahora=AHORA)

    assert (len(particiones["entrenamiento"]), len(particiones["validacion"])) == (40, 10)
    aprendido = joblib.load(modelo.ruta_archivo).named_steps["tfidf"].vocabulary_
    solo_entrenamiento = construir_pipeline().named_steps["tfidf"].fit(particiones["entrenamiento"]).vocabulary_
    assert aprendido == solo_entrenamiento


def test_un_nuevo_entrenamiento_desactiva_la_version_anterior(db, fuente):
    _datos(db, fuente)
    primero = entrenar_modelo(db, ahora=AHORA)
    segundo = entrenar_modelo(db, ahora=datetime(2026, 11, 18))

    estados = {m.id: m.activo for m in _modelos(db)}
    assert estados == {primero.id: False, segundo.id: True}


def test_datos_insuficientes_no_afecta_al_modelo_activo(db, fuente):
    _datos(db, fuente)
    activo = entrenar_modelo(db, ahora=AHORA)
    db.query(Noticia).delete()
    db.commit()
    _datos(db, fuente, cantidad=9)

    with pytest.raises(DatosInsuficientesError) as error:
        entrenar_modelo(db)

    assert (error.value.disponibles, error.value.umbral) == (9, 10)
    assert [(m.id, m.activo) for m in _modelos(db)] == [(activo.id, True)]


def test_solo_entrena_con_noticias_evaluadas_por_diccionario(db, fuente):
    _datos(db, fuente, cantidad=9)
    _noticia(db, fuente, "calculada por ml", valor=3.0, metodo=METODO_ML)
    _noticia(db, fuente, "sin terminos", valor=None)

    with pytest.raises(DatosInsuficientesError):
        entrenar_modelo(db)


def test_fallo_al_registrar_borra_el_archivo_y_no_cambia_el_activo(db, fuente, tmp_path):
    """Escenario 'Fallo al guardar la nueva versión'."""
    _datos(db, fuente)
    activo = entrenar_modelo(db, ahora=AHORA)

    class RepositorioQueFalla(ModeloSentimientoRepository):
        def registrar_como_activo(self, db, modelo):
            raise RuntimeError("fallo de la base")

    with pytest.raises(RuntimeError):
        entrenar_modelo(db, ahora=datetime(2026, 11, 18), repository=RepositorioQueFalla())

    assert [(m.id, m.activo) for m in _modelos(db)] == [(activo.id, True)]
    assert len(list((tmp_path / "modelos").iterdir())) == 1


def test_preparar_texto_quita_html_mayusculas_y_tildes():
    assert preparar_texto("<b>Política</b> &amp; ACCIÓN") == " politica  & accion"


# --- POST /api/v1/trainings ---------------------------------------------------

@pytest.fixture()
def client(db):
    def override():
        yield db

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_post_trainings_201(client, db, fuente):
    _datos(db, fuente)

    respuesta = client.post("/api/v1/trainings")

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert set(cuerpo) == {
        "id", "version", "modelo_embeddings_usado", "mae_evaluacion", "fecha_entrenamiento", "activo",
    }
    assert cuerpo["activo"] is True
    assert cuerpo["modelo_embeddings_usado"] == "tfidf-1-2"


def test_post_trainings_409_con_datos_insuficientes(client, db, fuente):
    _datos(db, fuente, cantidad=3)
    respuesta = client.post("/api/v1/trainings")
    assert respuesta.status_code == 409
    assert respuesta.json()["codigo"] == "DATOS_INSUFICIENTES"


# --- HU-SENT-002-v4: uso del modelo activo -----------------------------------

def test_sin_modelo_no_hay_proveedor(db):
    assert proveedor_activo(db) is None


def test_proveedor_carga_el_modelo_activo_y_lo_cachea(db, fuente):
    _datos(db, fuente)
    modelo = entrenar_modelo(db, ahora=AHORA)

    proveedor = proveedor_activo(db)

    assert isinstance(proveedor, ProveedorRegresor)
    assert proveedor.modelo_id == modelo.id
    assert proveedor_activo(db) is proveedor


def test_modelo_activo_de_gemini_es_incompatible_y_se_usa_diccionario(db, fuente, tmp_path):
    """Escenario 'Modelo activo incompatible (entrenado con embeddings de Gemini)'."""
    ruta = tmp_path / "viejo.joblib"
    joblib.dump(construir_pipeline(), ruta)
    ModeloSentimientoRepository().registrar_como_activo(
        db,
        ModeloSentimiento(
            version="20261019T120000000000Z",
            ruta_archivo=str(ruta),
            modelo_embeddings_usado="gemini-embedding-001",
            mae_evaluacion=1.0,
            fecha_entrenamiento=AHORA,
        ),
    )

    assert proveedor_activo(db) is None


def test_archivo_del_modelo_ilegible_vuelve_al_diccionario(db, fuente):
    _datos(db, fuente)
    modelo = entrenar_modelo(db, ahora=AHORA)
    with open(modelo.ruta_archivo, "wb") as archivo:
        archivo.write(b"no es un joblib")
    modelo_ml_service.invalidar_cache()

    assert proveedor_activo(db) is None


def test_prediccion_se_limita_a_la_escala_del_diccionario():
    class Pipeline:
        def predict(self, textos):
            return [25.0]

    assert ProveedorRegresor(1, Pipeline()).predecir("texto") == 10.0


def test_noticia_calculada_con_ml_guarda_la_version_del_modelo(db, fuente):
    _datos(db, fuente)
    modelo = entrenar_modelo(db, ahora=AHORA)
    db.add(TerminoDiccionario(palabra="guerra", idioma="es", valor=-8))
    db.commit()
    nueva = _noticia(db, fuente, "guerra en la ciudad", metodo=None)

    procesar_noticias(db, [nueva], proveedor_ml=proveedor_activo(db))

    db.refresh(nueva)
    assert nueva.metodo_calculo == METODO_ML
    assert nueva.modelo_sentimiento_id == modelo.id
    assert nueva.valor_humor < -1.0
    assert nueva.polarizacion_terminos == 0.0  # HU-SENT-003: sale del diccionario
    assert len(nueva.coincidencias) == 1  # HU-SENT-008: también en el camino ML


def test_si_la_prediccion_falla_se_usa_el_diccionario(db, fuente):
    db.add(TerminoDiccionario(palabra="guerra", idioma="es", valor=-8))
    db.commit()
    nueva = _noticia(db, fuente, "guerra", metodo=None)

    class PipelineRoto:
        def predict(self, textos):
            raise ValueError("archivo corrupto")

    procesar_noticias(db, [nueva], proveedor_ml=ProveedorRegresor(1, PipelineRoto()))

    db.refresh(nueva)
    assert nueva.metodo_calculo == METODO_DICCIONARIO
    assert nueva.valor_humor == -8.0
    assert nueva.modelo_sentimiento_id is None
