# Léxico de noticias: términos de evento propuestos para el diccionario

**Estado:** Propuesto y cargado en la base de datos local de la PO el 2026-11-12. Los valores siguen pendientes de revisión del equipo.
**Origina en:** PDF de especificaciones §4.2.2 (diccionario de términos indexados, escala de -10 a +10) y HU-SENT-001 (gestión y carga del diccionario). Complementa a `Dataset-diccionario-inicial.md`.
**Archivo de datos:** `src/scripts/data/lexico_noticias_propuesto.csv` (236 términos: 119 en inglés y 117 en español).
**Versión del documento:** v1.1.

## 1. Por qué hace falta

El diccionario inicial viene de AFINN-en-165, un léxico armado para textos de redes sociales. Es fuerte en adjetivos y expresiones de opinión (*outstanding*, *awful*), pero débil en las palabras que en una noticia cargan el tono: los **sustantivos y verbos de evento** (*earthquake*, *hostage*, *ceasefire*, *inflation*, *vaccine*).

Medición del 2026-11-11, con el mínimo de 3 términos (HU-SENT-007-v4) sobre 2.251 noticias guardadas: 864 con humor, 908 con menos de 3 términos, 465 sin ningún término y 14 excluidas por la lista. El 61 % de las noticias queda sin humor por falta de términos. Además, el español tiene 8 veces menos términos que el inglés.

## 2. Criterios usados para la propuesta

1. **Solo términos nuevos.** Se descartaron automáticamente los que ya están en `diccionario_seed.csv` (más de 80 de la lista original ya existían, como *famine*, *recession* o *corrupción*). Sus valores actuales no se tocan.
2. **Misma escala que el diccionario base.** Valores pares de -10 a +10, igual que AFINN × 2, para que los términos nuevos y los existentes sean comparables. Criterio de intensidad propuesto:
   - **±2**: tono leve o técnico (*tariff*, *treatment*, *reforma*).
   - **±4**: tono claro (*inflation*, *tregua*, *vacuna*).
   - **±6**: hecho grave o muy positivo (*earthquake*, *despido*, *reencuentro*).
   - **±8**: hecho con víctimas o daño severo (*airstrike*, *sobredosis*, *tsunami*).
   - **±10**: crímenes masivos o extremos (*genocide*, *masacre*, *femicidio*).
3. **Forma base.** El texto de la noticia se lematiza y el diccionario no (ADR-003, punto 6), así que se usa singular e infinitivo: "inundaciones" coincide con "inundación". Hay 4 plurales agregados a propósito (*shootings*, *balaceras*, *emboscadas*, *represalias*) porque spaCy no lleva esas formas al singular correcto. Ninguno se cuenta doble, por la regla de un concepto por lema (ADR-003 v1.6).
4. **Frases sin solapamiento.** Una frase cuyas palabras ya son términos contaría dos veces lo mismo, así que se descartaron *ayuda humanitaria*, *medalla de oro*, *ataque aéreo* y *crimen de guerra*. Quedan *alto el fuego*, *golpe de estado*, *trata de personas*, *derramamiento de sangre* y *ola de calor*.
5. **Fuera las palabras ambiguas.** No se incluyen palabras que cambian de sentido según el contexto, porque subirían la cobertura con errores (como *loss* en *weight loss*):
   - En inglés: *record*, *deal*, *strike*, *storm*, *crash*, *surge*, *soar*, *boom*, *default*, *execution*, *occupation*.
   - En español: *cura* (sanar o sacerdote), *temporal* (tormenta o pasajero), *tratado* (acuerdo o participio de tratar), *escalada*, *embargo*, *militante*.
6. **Sesgo negativo esperado.** 163 términos negativos y 73 positivos. Refleja que las noticias de eventos son mayormente negativas, y el equipo debe tenerlo presente al interpretar el humor global.

## 3. Cómo revisarlo (equipo)

1. Revisen el valor de cada término en las tablas de la sección 6 (o en el CSV). Cambien el valor o borren la fila si no están de acuerdo. **Los valores son una propuesta, no un valor definitivo.**
2. Verifiquen que inglés y español tengan valores coherentes entre sí (por ejemplo, *earthquake* y *terremoto*, los dos en -6). Cuando el inglés ya estaba en el diccionario base, el español propuesto usa su mismo valor: *medalla* +6 (*medal*), *campeón* +4 (*champion*), *tumor* -4, *brote* -4 (*outbreak*), *innovación* +2.
   - **Punto a decidir:** AFINN tiene *cancer* en -2, un valor bajo para noticias. Se dejó *cáncer* también en -2 por coherencia; si el equipo lo sube, debe cambiar los dos desde Administración → Diccionario.
3. Agreguen las palabras frecuentes de sus feeds que falten, con los mismos criterios.
4. Validen después de cargar: revisen 30 a 40 noticias en "¿Por qué…?" y confirmen que el humor tiene sentido.

## 4. Cómo cargarlo (una vez revisado)

```powershell
docker compose exec api python -m scripts.seed_diccionario scripts/data/lexico_noticias_propuesto.csv
```

La carga omite los términos que ya existen, así que se puede repetir, y marca las noticias calculadas por diccionario para recálculo (HU-SENT-001). El barrido las recalcula en su próxima ejecución. Después, presionen **Actualizar** en Parámetros → Cobertura para medir el efecto. También se pueden agregar términos uno por uno desde Administración → Diccionario.

## 5. Ampliación guiada por los datos (`scripts/candidatos_diccionario.py`)

Resultado de la carga del léxico (2026-11-12, mínimo 3): las noticias con humor pasaron de 864 a 964. Siguen 413 sin términos y 860 con menos de 3. Para la siguiente ampliación, el script lista las palabras que más aparecen en esas noticias y que no están en el diccionario. No modifica nada: solo informa.

```powershell
docker compose exec api python -m scripts.candidatos_diccionario --top 60 --salida /tmp/candidatas.csv
docker compose cp api:/tmp/candidatas.csv .
```

- **noticias:** en cuántas noticias sin humor aparece la palabra.
- **recupera:** cuántas de ellas tienen exactamente un término menos que el mínimo, es decir, cuántas tendrían humor si se agrega esa palabra. El ranking se ordena por esta columna.
- Se descartan palabras vacías, números, palabras de menos de 3 letras, las que ya son términos y las que nunca aparecen en minúscula, que casi siempre son nombres propios.
- El CSV trae la columna `valor_propuesto` vacía. El equipo la completa solo para las palabras con tono claro y descarta las neutras o ambiguas, con los criterios de la sección 2.

## 6. Términos propuestos

### Desastres y clima (22 en inglés, 22 en español)

| Inglés | Valor | Español | Valor |
|---|---|---|---|
| aftershock | -4 | aluvión | -6 |
| avalanche | -6 | apagón | -4 |
| blackout | -4 | avalancha | -6 |
| blizzard | -4 | ciclón | -6 |
| cyclone | -6 | damnificado | -6 |
| deforestation | -4 | deforestación | -4 |
| displaced | -4 | derrame | -4 |
| drought | -4 | desplazado | -4 |
| earthquake | -6 | erupción | -4 |
| eruption | -4 | escasez | -4 |
| flood | -6 | escombro | -4 |
| heatwave | -4 | evacuación | -4 |
| hurricane | -6 | evacuar | -4 |
| landslide | -6 | huracán | -6 |
| mudslide | -6 | inundación | -6 |
| rubble | -4 | ola de calor | -4 |
| spill | -4 | sequía | -4 |
| tornado | -6 | sismo | -6 |
| tsunami | -8 | terremoto | -6 |
| typhoon | -6 | tifón | -6 |
| wildfire | -6 | tornado | -6 |
| wreckage | -6 | tsunami | -8 |

### Conflicto y seguridad (36 en inglés, 32 en español)

| Inglés | Valor | Español | Valor |
|---|---|---|---|
| airstrike | -8 | alto el fuego | +4 |
| ambush | -6 | apuñalamiento | -8 |
| armistice | +4 | armisticio | +4 |
| bloodshed | -8 | asedio | -6 |
| bombing | -8 | atrocidad | -10 |
| ceasefire | +4 | balacera | -6 |
| coup | -6 | balaceras | -6 |
| crackdown | -6 | bombardeo | -8 |
| detainee | -4 | derramamiento de sangre | -8 |
| disarmament | +2 | desarme | +2 |
| explosion | -6 | emboscada | -6 |
| genocide | -10 | emboscadas | -6 |
| gunfire | -6 | explosión | -6 |
| gunman | -6 | extremista | -6 |
| hostage | -6 | genocidio | -10 |
| insurgency | -6 | golpe de estado | -6 |
| insurgent | -4 | hostilidad | -6 |
| liberation | +4 | insurgencia | -6 |
| massacre | -10 | insurgente | -4 |
| militia | -4 | liberación | +4 |
| missile | -4 | masacre | -10 |
| peacekeeping | +2 | milicia | -4 |
| persecution | -6 | misil | -4 |
| reconciliation | +4 | pistolero | -6 |
| refugee | -4 | reconciliación | +4 |
| retaliation | -4 | refugiado | -4 |
| sanction | -4 | represalia | -4 |
| shelling | -8 | represalias | -4 |
| shooting | -6 | sanción | -4 |
| shootings | -6 | tiroteo | -6 |
| siege | -6 | trata de personas | -6 |
| stabbing | -8 | tregua | +4 |
| trafficking | -6 |  |  |
| treaty | +4 |  |  |
| truce | +4 |  |  |
| wounded | -6 |  |  |

### Economía (15 en inglés, 10 en español)

| Inglés | Valor | Español | Valor |
|---|---|---|---|
| austerity | -4 | arancel | -2 |
| downturn | -4 | austeridad | -4 |
| hiring | +2 | desaceleración | -4 |
| inflation | -4 | despido | -6 |
| investment | +2 | estanflación | -6 |
| layoff | -6 | inflación | -4 |
| plunge | -4 | inversión | +2 |
| rebound | +4 | recuperación | +4 |
| recovery | +4 | repunte | +4 |
| slump | -4 | subsidio | +2 |
| stagflation | -6 |  |  |
| subsidy | +2 |  |  |
| tariff | -2 |  |  |
| tumble | -4 |  |  |
| upturn | +4 |  |  |

### Salud (16 en inglés, 19 en español)

| Inglés | Valor | Español | Valor |
|---|---|---|---|
| cholera | -6 | brote | -4 |
| cure | +6 | cáncer | -2 |
| ebola | -8 | cólera | -6 |
| epidemic | -6 | desnutrición | -6 |
| eradication | +2 | epidemia | -6 |
| immunization | +4 | erradicación | +2 |
| malnutrition | -6 | infección | -4 |
| measles | -4 | inmunización | +4 |
| mortality | -4 | mortalidad | -4 |
| overdose | -8 | pandemia | -6 |
| pandemic | -6 | remisión | +6 |
| remission | +6 | sarampión | -4 |
| treatment | +2 | sobredosis | -8 |
| vaccination | +4 | tratamiento | +2 |
| vaccine | +4 | tumor | -4 |
| virus | -4 | vacuna | +4 |
|  |  | vacunación | +4 |
|  |  | virus | -4 |
|  |  | ébola | -8 |

### Sociedad y política (12 en inglés, 16 en español)

| Inglés | Valor | Español | Valor |
|---|---|---|---|
| arson | -6 | acoso | -6 |
| bribery | -6 | censura | -4 |
| censorship | -4 | contrabando | -4 |
| discrimination | -6 | deportación | -4 |
| femicide | -10 | desalojo | -4 |
| homelessness | -6 | desigualdad | -4 |
| inequality | -4 | destitución | -4 |
| looting | -6 | discriminación | -6 |
| repression | -6 | femicidio | -10 |
| resignation | -2 | feminicidio | -10 |
| unrest | -4 | malversación | -6 |
| vandalism | -4 | narcotráfico | -6 |
|  |  | renuncia | -2 |
|  |  | represión | -6 |
|  |  | saqueo | -6 |
|  |  | vandalismo | -4 |

### Logros y noticias positivas (18 en inglés, 18 en español)

| Inglés | Valor | Español | Valor |
|---|---|---|---|
| aid | +4 | beca | +4 |
| championship | +4 | campeonato | +4 |
| conservation | +2 | campeón | +4 |
| discovery | +4 | conservación | +2 |
| graduation | +4 | descubrimiento | +4 |
| inauguration | +2 | donación | +4 |
| inclusion | +2 | graduación | +4 |
| milestone | +4 | inclusión | +2 |
| rebuild | +4 | innovación | +2 |
| reconstruction | +2 | medalla | +6 |
| reform | +2 | reconstrucción | +2 |
| relief | +4 | reconstruir | +4 |
| renewable | +2 | reencuentro | +6 |
| restoration | +2 | reforma | +2 |
| reunion | +4 | renovable | +2 |
| reunite | +6 | restauración | +2 |
| scholarship | +4 | solidaridad | +4 |
| volunteer | +2 | voluntario | +2 |

## Tabla de control de versiones

| Versión | Fecha/Sesión | Motivo del cambio |
|---|---|---|
| v1.0 | 2026-11-12 | Creación a pedido de la PO tras medir la cobertura con mínimo 3 (61 % de noticias sin humor por falta de términos). 236 términos de evento en 6 categorías, con valores propuestos pendientes de revisión del equipo. Se agrega al script `seed_diccionario` la opción de cargar otro CSV y pruebas de validez del léxico en `test_seed_diccionario.py`. |
| v1.1 | 2026-11-12 | Se registra el resultado de la carga (864 → 964 noticias con humor) y se agrega la sección 5 con el script de palabras candidatas (`scripts/candidatos_diccionario.py`, con pruebas en `test_candidatos_diccionario.py`). Las tablas de términos pasan a la sección 6. |
