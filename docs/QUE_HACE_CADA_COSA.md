# Qué Hace Cada Cosa — Profesor Universal IA

---

## Las 5 IAs + 2 APIs de Imagen

| Servicio | Archivo | Rol | Cuándo se usa |
|----------|---------|-----|---------------|
| **Claude 4.5 Haiku** | `services/claude.js` | Síntesis final — genera el speech y displayTop/Bottom | Siempre, es el "profesor" que habla |
| **GPT-4.1 Mini** | `services/gpt.js` | Extrae keyword, convierte notación matemática | Inicio de cada request |
| **Gemini 2.0 Flash** | `services/gemini.js` | Contexto web actualizado | Preguntas con datos recientes |
| **Wolfram Alpha** | `services/wolfram.js` | Datos técnicos, gráficas, step-by-step | Matemáticas, física, datos numéricos |
| **Wikipedia** | `services/wikipedia.js` | Contexto enciclopédico | Preguntas conceptuales/biográficas |
| **NASA Images API** | `utils/imagenesExtra.js` | Imágenes científicas | Temas espaciales/científicos |
| **Wikimedia Commons** | `utils/imagenesExtra.js` | Imágenes educativas | Temas generales |

---

## Handlers — Qué Procesa Cada Uno

### `AskProfeIntentHandler.js` — El cerebro principal
Procesa toda pregunta educativa general. Decide si va por ruta ESTÁTICA (conceptual) o DINÁMICA (datos actualizados/cálculos), coordina las IAs en paralelo y construye la respuesta final.

**Rutas internas:**
- `mathRoute.js` — detecta y procesa preguntas matemáticas (ecuaciones, derivadas, integrales)
- `scienceRoute.js` — detecta y procesa preguntas científicas (física, química, astronomía)
- Flujo normal — todo lo demás (historia, geografía, biología, etc.)

### `WolframAlphaModeIntentHandler.js` — Modo paso a paso
Activa cuando el usuario dice "modo wolfram" o toca el botón APL. Convierte lenguaje natural a notación matemática (GPT), hace 2 llamadas a Wolfram (pods normales + pasos SBS), pagina de 3 en 3 y cachea en DynamoDB.

### `ContinueWolframIntentHandler.js` — Paginación
Avanza a los siguientes 3 pasos. Lee de DynamoDB si existe caché, si no usa `sessionAttributes.wolframData`.

### `SkipToResultIntentHandler.js` — Saltar al final
Muestra directamente el último pod (resultado) sin recorrer todos los pasos.

### `RepeatLastQuestionIntentHandler.js` — Repetir
Recupera la última pregunta del historial DynamoDB del usuario y la re-procesa.

---

## Services — Qué Hace Cada Servicio

### `apl.js` — Generador visual
Genera el documento APL 1.6 completo. Recibe `isDark` (boolean) y devuelve el JSON del documento. Los datos llegan vía `datasources.templateData`. Soporta:
- Header con 8 logos (estáticos)
- Logo dinámico Wolfram sobre primer pod (cuando `fuenteWolfram=true`)
- Pods de imágenes Wolfram con zoom dinámico
- Botones step-by-step, continuar, saltar, ver más imágenes
- Barra de controles: zoom ±, modo oscuro, susurro

### `wolfram.js` — Wolfram Alpha
Hace 1 o 2 llamadas según el modo:
- **Normal:** 1 llamada, devuelve pods con imágenes + texto plano
- **Step-by-step:** 2 llamadas — primera detecta podstate SBS, segunda lo expande

Devuelve: `{ imagenes, imagenesNormales, texto, canStepByStep, stepByStepInputs }`

### `claude.js` — Síntesis educativa
Recibe: pregunta + texto Wolfram + texto Wikipedia + texto Gemini + keyword + historial
Devuelve JSON: `{ speech, displayTop, displayBottom, keyword }`

### `gpt.js` — Utilidades rápidas
- `obtenerKeyword()` — extrae el tema principal de la pregunta
- `traducirGPT()` — traducciones rápidas
- Conversión notación matemática en `WolframAlphaModeIntentHandler`

---

## Utils — Herramientas Compartidas

| Archivo | Función |
|---------|---------|
| `cache.js` | LRU en memoria, TTL corto, para requests repetidos en la misma sesión |
| `s3Cache.js` | Caché persistente en S3, TTL 7 días, para preguntas conceptuales |
| `dynamoCache.js` | Caché step-by-step por sessionId, TTL 24h |
| `userHistory.js` | Guarda/recupera últimas 5 preguntas por userId en DynamoDB |
| `imagenesExtra.js` | Busca imágenes en NASA Images API y Wikimedia Commons |
| `cacheabilityAnalyzer.js` | Decide si una pregunta es cacheable y genera su cacheKey |
| `timeoutManager.js` | `withTimeout(promise, ms, fallback)` — envuelve cualquier promesa con timeout |
| `mathNotation.js` | Normaliza expresiones matemáticas en español a notación estándar |
| `reconstruccionPregunta.js` | Reconstruye preguntas ambiguas usando contexto de sesión |
| `comparacion.js` | Detecta preguntas comparativas ("compara X con Y") |
| `fallback.js` | Mensajes de error amigables para el usuario |
| `validateResponse.js` | Valida que el speech de Claude sea usable |
| `inputValidator.js` | Sanitiza y valida la entrada del usuario |
| `logger.js` | Logging estructurado con prefijos `[MÓDULO]` |

---

## Config

### `constants.js`
- `UI` — `MIN_ZOOM`, `MAX_ZOOM`, `ZOOM_STEP`
- `INPUT` — `MAX_QUESTION_LENGTH`, `MIN_QUESTION_LENGTH`
- `PERFORMANCE` — `GLOBAL_DEADLINE_MS` (7700)

### `timeouts.js`
Timeouts centralizados por servicio: `WOLFRAM_TIMEOUT`, `WIKI_TIMEOUT`, `GEMINI_TIMEOUT`, `KEYWORD_EXTRACTION_TIMEOUT`, `IMAGES_EXTRA_TIMEOUT`

---

## `index.js` — Punto de Entrada

Registra todos los handlers y maneja:
- `LaunchRequest` — bienvenida, inicializa sesión
- `APLUserEventHandler` — eventos táctiles (zoom, modo oscuro, susurro, botones SBS)
- `DarkModeIntentHandler` — "modo oscuro / modo claro"
- `WhisperModeIntentHandler` — "modo susurro"
- `ZoomIntentHandler` — "acercar / alejar"
- `VerMasImagenesIntentHandler` — "ver más imágenes"
- Helpers: `renderAPL()`, `aplDatasource()`, `normalizarModoVisual()`, `normalizarDireccionZoom()`

---

## Flujo de Sesión (sessionAttributes)

```
lastQuestion        ← pregunta completa del usuario
lastKeyword         ← keyword extraído por GPT
lastSubject         ← tema principal (para contexto en preguntas ambiguas)
lastDisplayTop      ← texto superior APL
lastDisplayBottom   ← texto inferior APL
lastImagenes        ← pods Wolfram actuales (hasta 12)
lastImagenesPasos   ← pasos SBS (hasta 20) — para botón APL sin re-llamar Wolfram
lastFuenteWolfram   ← boolean
lastFuenteWikipedia ← boolean
wolframData         ← datos completos para paginación SBS
currentWolframStep  ← índice actual en paginación SBS
imagenesExtraPool   ← pool completo NASA/Wikimedia (hasta 30)
imagenesExtraOffset ← índice actual del pool
darkMode            ← boolean
whisperMode         ← boolean
zoomLevel           ← número (55–120, default 85)
history             ← últimas 8 interacciones para contexto Claude
pendingLocationRequest ← 'duracion_sol' | null
```
