# ADR-007: Modelo de ML local (TF-IDF + Ridge) en reemplazo de los embeddings de Gemini

- Estado: Propuesto *(decisión de la PO del 2026-11-17; pendiente de ratificación del equipo)*
- Fecha: 2026-11-17
- Responsables: Equipo 3 (PO y arquitectura)
- Reemplaza: ADR-004, puntos 1, 2 y 7 de la Decisión. Los puntos 3 a 6 de ADR-004 (disparo manual, umbral mínimo, versionado y criterio de evaluación) se conservan y se heredan aquí.
- Relacionado con: PDF de especificaciones, Objetivos específicos punto 2 ("basado en diccionario, LLM u otro método justificado"); ADR-003 (algoritmo de diccionario); ADR-004 (arquitectura original del modelo); `docs/architecture.md` §9; instrucciones del proyecto, secciones 8 y 13.

---

## Contexto

### 1. Qué decidió ADR-004 y qué supuesto no se cumplió

ADR-004 (2026-09-28) eligió **embeddings externos de Google Gemini + un regresor Ridge local**. La razón decisiva fue un *free tier* permanente, sin tarjeta de crédito, con una cuota que entonces se informaba en 1.500 solicitudes por día. El propio ADR dejó dos riesgos abiertos:

- La cuota diaria **no estaba validada contra el volumen real** de noticias, ni para el entrenamiento (todas las noticias históricas de una vez) ni para la predicción (una llamada por cada noticia capturada).
- Las condiciones comerciales podían cambiar sin aviso, y debían reconfirmarse antes de implementar.

Ninguno de los dos riesgos se pudo cerrar con la evidencia disponible.

### 2. Evidencia observada en el sistema real

| Fecha | Hecho observado | Fuente |
|---|---|---|
| 2026-11-11 | Primer `POST /api/v1/trainings` con más de 1.000 noticias: falla con 502. Los 3 reintentos se agotaban en unos 4 s mientras la cuota era por minuto. Se ajustó solo el entrenamiento (ADR-004 v1.4: lotes de 20, timeout de 60 s, 6 reintentos, espera según `retryDelay`). | ADR-004, punto 8 |
| 2026-11-17 | Diagnóstico de QA: la clave del equipo funciona (una llamada de prueba devuelve un vector de 3.072 dimensiones) y hay **1.467 noticias** aptas para entrenar (umbral: 1.000). | Prueba en el contenedor `api` |
| 2026-11-17 | Segundo entrenamiento: tras unos 20 MB de respuestas (alrededor de un tercio de las noticias, estimado por el tráfico de red del contenedor), Gemini responde **`HTTP 429: You exceeded your current quota`** en forma persistente. El código agota sus 7 intentos y responde **502**. No queda ningún modelo activo. | `docker compose logs api` |
| 2026-11-17 | Google ya solo emite claves de API con el formato nuevo `AQ.`. En foros oficiales hay reportes de claves de ese formato rechazadas en el mismo endpoint que usa el proyecto. En este caso funcionó, pero agrega incertidumbre operativa. | Foro de desarrolladores de Google AI; DEV Community |

### 3. Por qué el problema no se resuelve solo con "esperar a mañana"

- **Entrenamiento:** si la cuota diaria es menor que el número de noticias de entrenamiento, el entrenamiento **no termina nunca** en un solo intento, sin importar cuántas veces se reintente.
- **Predicción:** con un modelo activo, HU-SENT-002-v3 llama a Gemini **una vez por cada noticia capturada**. Con cientos de noticias diarias y una cuota que no alcanza ni para entrenar, el Circuit Breaker se abriría a las pocas horas y el sistema volvería al diccionario la mayor parte del día. ADR-004 ya lo había anticipado como "riesgo operativo observado". En la práctica, el camino de ML funcionaría solo una fracción del tiempo.

### 4. Restricciones del proyecto que pesan en esta decisión

- **Curso académico sin presupuesto:** no se pueden contratar planes pagos (ADR-004, Contexto §2).
- **Plazo:** el proyecto está en su cierre y tiene una **demostración en vivo**. Un servicio externo con cuota insuficiente es un riesgo que el equipo no controla.
- **Stack definido (instrucciones, §8):** `scikit-learn` y `joblib` ya están en `src/requirements.txt` y el esquema de versionado (tabla `modelos_sentimiento` + archivo `.joblib`) ya está implementado. Cualquier alternativa que reutilice esas piezas reduce el riesgo del cambio.
- **Criterio de proporcionalidad** (`docs/architecture.md`): no introducir infraestructura que exceda el alcance de un prototipo.

---

## Decisión

Se reemplaza la representación del texto por **TF-IDF calculado localmente con `scikit-learn`**. El regresor (`Ridge`) y el resto del ciclo de vida del modelo se mantienen. El camino de ML deja de depender de cualquier servicio externo.

### 1. Representación del texto (reemplaza ADR-004, punto 1)

El texto de cada noticia (título + contenido, sin HTML, con la misma función `texto_de_noticia` que usa el diccionario) se convierte en un vector **TF-IDF** con `sklearn.feature_extraction.text.TfidfVectorizer`.

**Valores propuestos, pendientes de ratificación del equipo** (todos configurables en `src/app/core/config.py`, ninguno fijo en el código):

| Parámetro | Valor propuesto | Justificación |
|---|---|---|
| `ngram_range` | (1, 2) | Unigramas y bigramas: captura expresiones como "alto el fuego" o "death toll", que una palabra suelta no distingue. |
| `min_df` | 2 | Descarta palabras que aparecen en una sola noticia (ruido, errores de tipeo, nombres propios aislados). |
| `max_df` | 0,9 | Descarta palabras presentes en más del 90 % de las noticias, que no aportan señal. |
| `max_features` | 20.000 | Acota memoria y tamaño del `.joblib` con unas 1.500 noticias, sin perder vocabulario relevante. |
| `sublinear_tf` | `True` | Usa 1 + log(tf): una palabra repetida muchas veces no domina el vector. |
| `strip_accents` | `"unicode"` | Coherente con la normalización del diccionario (sin tildes). |
| `lowercase` | `True` | Coherente con la comparación sin mayúsculas de HU-SENT-007. |

El corpus mezcla español e inglés en un solo vocabulario. No se separan modelos por idioma: con el volumen actual, dos modelos tendrían la mitad de los datos cada uno.

### 2. Regresor y artefacto

- **Regresor:** `Ridge(alpha=1.0)`, sin cambios respecto de ADR-004 (valor propuesto).
- **Artefacto único:** el vectorizador y el regresor se guardan juntos como un `sklearn.pipeline.Pipeline` en **un solo archivo `.joblib`**. Así es imposible usar un regresor con un vocabulario distinto del que se usó al entrenar.
- **Partición y evaluación:** 20 % de validación con semilla 42, igual que hoy. El vectorizador se ajusta **solo con la partición de entrenamiento**, dentro del `Pipeline`, para que el MAE de validación no esté contaminado por vocabulario de las noticias de validación.
- **Referencia de comparación:** además del MAE del modelo, el entrenamiento calcula el MAE de una predicción constante (la media de entrenamiento). Si el modelo no mejora esa referencia, no está aprendiendo nada útil. Desde v1.1 se guarda en `modelos_sentimiento.mae_referencia`, junto con las noticias usadas, y el panel los muestra (HU-SENT-010).

### 3. Ciclo de vida que se conserva de ADR-004

| Punto de ADR-004 | Se mantiene | Ajuste |
|---|---|---|
| 3. Disparo manual (`POST /api/v1/trainings`) | Sí | — |
| 4. Umbral mínimo (1.000 noticias evaluadas por diccionario) | Sí | — |
| 5. Versionado (`modelos_sentimiento` + `.joblib` en el volumen `modelos_ml`) | Sí | El campo `modelo_embeddings_usado` **conserva su nombre** (para no requerir migración ni romper el contrato), pero pasa a guardar el **identificador de la representación**, por ejemplo `tfidf-1-2`. Renombrarlo queda como deuda menor documentada. |
| 6. Evaluación por MAE contra el diccionario | Sí | La limitación metodológica se **acentúa** (ver Consecuencias). |

### 4. Compatibilidad con modelos anteriores

Un registro de `modelos_sentimiento` cuya representación **no** sea TF-IDF (cualquier modelo entrenado con embeddings de Gemini) **no se carga**: el proveedor devuelve `None` y el cálculo usa el diccionario, con un aviso en el log. A la fecha no existe ningún modelo activo, así que el caso es preventivo.

### 5. Patrones de resiliencia (reemplaza ADR-004, punto 7)

Conforme a la sección 13 de las instrucciones, se reevalúan los 4 patrones:

| Patrón | ¿Aplica? | Motivo |
|---|---|---|
| Timeout explícito | **Sí, se conserva** (3 s, valor propuesto) | Ya no protege de un servicio externo, sino de una predicción local anómala (por ejemplo, un `.joblib` corrupto o un texto desmedido). Es el timeout que ya existe en `sentimiento_service._predecir_con_timeout`. Los escenarios de timeout de HU-SENT-002 siguen siendo válidos. |
| Retry con backoff | **No** | No hay fallos transitorios de red que reintentar: una predicción local que falla volverá a fallar igual. El fallback a diccionario ya cubre el caso. |
| Circuit Breaker | **No** | Existía para no saturar Gemini con llamadas que iban a fallar. Sin servicio externo, no hay nada que proteger. |
| Bulkhead | **No** | Igual que en ADR-004: no hay integraciones externas compitiendo por recursos. |

Los patrones de las **fuentes RSS** no cambian: siguen siendo obligatorios (`docs/architecture.md` §9).

### 6. Retiro de la integración con Gemini

- Se elimina `src/app/services/embeddings_service.py` y sus pruebas.
- Se eliminan de `config.py` los parámetros `gemini_*` y `embeddings_*`, y la variable `GEMINI_API_KEY` de `docker-compose.yml`, `src/.env.example` y el README.
- `POST /api/v1/trainings` deja de responder **502** (`SERVICIO_EMBEDDINGS_NO_DISPONIBLE`) y **503** (`ML_NO_CONFIGURADO`). Se mantienen **201** y **409** (`DATOS_INSUFICIENTES`).
- El camino de ML queda **siempre disponible** cuando hay un modelo activo, sin depender de ninguna clave.
- El `.env` local del equipo puede borrarse. **La clave de Gemini del equipo debe revocarse en Google AI Studio**: ya no se usa y estuvo expuesta en una captura de pantalla.

---

## Alternativas consideradas

### Alternativa A — Mantener Gemini y reintentar cuando se reinicie la cuota

**Ventajas:** no cambia código ni documentación.
**Desventajas:** si la cuota diaria es menor que el conjunto de entrenamiento, nunca termina. Aunque termine, la predicción agota la cuota a las pocas horas (Contexto §3). El sistema seguiría dependiendo de condiciones comerciales que ya cambiaron una vez.
**Resultado:** descartada. No resuelve el problema; lo posterga.

### Alternativa B — Entrenamiento reanudable con caché de embeddings en MySQL

Guardar el vector de cada noticia al obtenerlo, para que cada intento continúe donde quedó el anterior.
**Ventajas:** conserva la representación semántica de ADR-004.
**Desventajas:** agrega una tabla de vectores (3.072 números por noticia, unos 18 MB con 1.500 noticias) y una migración. El entrenamiento tardaría varios días. **No resuelve la predicción**, que sigue consumiendo una llamada por noticia.
**Resultado:** descartada por costo y porque solo resuelve la mitad del problema.

### Alternativa C — Pasar a un plan pago de Gemini

**Ventajas:** elimina el límite de cuota con cambios mínimos.
**Desventajas:** contradice la restricción "sin presupuesto" (ADR-004, Contexto §2). Requiere una tarjeta de crédito de un integrante y un costo recurrente.
**Resultado:** descartada por restricción del proyecto.

### Alternativa D — Embeddings locales con `sentence-transformers` (ADR-004, Alternativa D)

**Ventajas:** representación semántica rica sin servicio externo.
**Desventajas:** agrega PyTorch y un modelo de cientos de MB a la imagen Docker, alarga el build, y la inferencia en CPU es más lenta. Es un cambio de infraestructura grande para la etapa de cierre del proyecto.
**Resultado:** descartada **por plazo**, no por diseño. Es la mejora natural si el proyecto continúa (ver Consecuencias).

### Alternativa E — Retirar el camino de ML y dejar solo el diccionario

**Ventajas:** la opción más simple. El PDF solo exige un método "basado en diccionario, LLM u otro método justificado".
**Desventajas:** deja sin implementar HU-SENT-006, que está comprometida en el backlog oficial (P3, Sprint 4), y pierde la parte de entrenamiento y versionado del entregable.
**Resultado:** descartada. El backlog oficial compromete la historia.

### Alternativa F — TF-IDF + Ridge local (elegida)

Es la Alternativa A de ADR-004, que en su momento se descartó por su menor riqueza semántica. Hoy se elige porque su principal desventaja (representación léxica) es **aceptable y documentable**, mientras que la desventaja de la opción elegida en ADR-004 (dependencia de una cuota insuficiente) **impide que el modelo funcione**.

---

## Consecuencias

### Positivas

- **El entrenamiento termina siempre**, en segundos y sin conexión a internet. Se puede reentrenar en la demostración sin riesgo.
- **La predicción es instantánea** (milisegundos por noticia) y no consume cuota. Esto también reduce el bloqueo de la API durante la captura (QA, hallazgo R5).
- **Se elimina toda una clase de fallos:** sin clave, sin cuota, sin errores 429/502/503, sin cambios de formato de clave de terceros.
- **Menos código y menos configuración:** desaparecen el cliente HTTP de embeddings, su Circuit Breaker y unos 10 parámetros de configuración.
- **Pruebas más simples y deterministas:** se entrena un modelo real y pequeño en las pruebas, sin mocks de un servicio externo.
- **Se conserva todo el ciclo de vida** de HU-SENT-006 (disparo manual, umbral, versionado, MAE), así que el cambio para el usuario es invisible salvo por la velocidad.

### Negativas y deuda aceptada

- **Representación léxica:** TF-IDF no entiende sinónimos, contexto ni sarcasmo. Como las etiquetas de entrenamiento vienen del propio diccionario, que también es léxico, el modelo **tenderá a reaprender los pesos del diccionario** más las palabras que suelen aparecer junto a ellas. Su valor agregado es generalizar a palabras que no están en el diccionario pero co-ocurren con términos evaluados, no "entender" mejor la noticia. Cualquier informe o presentación debe declararlo (refuerza la limitación de ADR-004, punto 6).
- **Nombre heredado:** el campo `modelo_embeddings_usado` describe ahora una representación que no son embeddings. Se conserva por compatibilidad; renombrarlo requiere migración y una versión incompatible del contrato.
- **Mejora futura documentada:** si el proyecto continúa, la Alternativa D (embeddings locales) es el siguiente paso, con el mismo ciclo de vida.

### Riesgo de producto que debe decidir la PO antes de activar un modelo

Con un modelo activo, HU-SENT-002-v3 calcula por ML **todas** las noticias no excluidas por la lista de HU-SENT-009, **incluidas** las que el diccionario deja sin humor por no tener términos o tener menos que el mínimo (HU-SENT-007-v4). Hoy son la mayoría de las noticias sin humor. Un modelo entrenado solo con noticias que sí tienen humor por diccionario les asignará valores cercanos a la media del entrenamiento, que hoy es levemente negativa. Esto **sube la cobertura** pero puede **sesgar el humor global** hacia ese valor medio. Este comportamiento no lo introduce este ADR: ya existía con Gemini. Pero hasta ahora nunca se había activado un modelo. Se registra como **decisión pendiente de la PO** en HU-SENT-002-v4, con tres opciones: (a) mantenerlo; (b) usar ML solo en noticias con al menos el mínimo de términos; (c) usar ML solo en las que el diccionario no puede evaluar.

---

## Historias de usuario relacionadas

- **HU-SENT-006-v2:** entrenamiento y versionado del modelo de ML (reemplaza a HU-SENT-006).
- **HU-SENT-002-v4:** cálculo híbrido de humor (reemplaza a HU-SENT-002-v3).
- **HU-SENT-007-v4:** método de diccionario. Es la fuente de las etiquetas de entrenamiento y la referencia del MAE. No cambia.
- **HU-SENT-003:** persistencia de `metodo_calculo` y `modelo_sentimiento_id`. No cambia.
- **HU-SENT-010:** visualización y prueba del modelo activo en el panel.

## Contratos afectados

- `contrato-sentimiento-diccionario.openapi.yaml` **v1.6.0**: `POST /trainings` sin respuestas 502 ni 503. El esquema `ModeloSentimiento` cambia solo en la descripción de `modelo_embeddings_usado`. Cambio compatible para los clientes: solo se retiran respuestas de error.

## Tabla de control de versiones

| Versión | Fecha | Motivo del cambio |
|---|---|---|
| v1.0 | 2026-11-17 | Creación. Decisión de la PO del 2026-11-17, tras el diagnóstico de QA del entrenamiento (HTTP 429 persistente de Gemini por cuota agotada; 502; sin modelo activo). Reemplaza los puntos 1, 2 y 7 de ADR-004. |
| v1.1 | 2026-11-17 | Decisión de la PO (HU-SENT-010): el MAE de referencia y la cantidad de noticias de entrenamiento se guardan en `modelos_sentimiento` y se exponen en el contrato v1.7.0, para mostrarlos en el panel. Sin cambios en la Decisión de arquitectura. |
