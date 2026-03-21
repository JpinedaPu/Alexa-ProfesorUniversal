# Qué Hace Cada Cosa — Profesor Universal IA

## `lambda/handlers/`

### `AskProfeIntentHandler.js`
Handler principal. Recibe toda pregunta del usuario y decide la ruta:
1. Detecta si es matemática → `mathRoute.js`
2. Detecta si es científica → `scienceRoute.js`
3. Si no → flujo normal (Wikipedia + Gemini + Claude)

Maneja: caché S3, historial DynamoDB, APL, whisper mode, zoom, ambigüedad, ubicación.

### `mathRoute.js`
Ruta especializada para derivadas, integrales, límites, ecuaciones.
- Llama Wolfram fase1 (`isStepByStep:false`) para imágenes + detección de podstates
- Claude corre **en paralelo** con Wolfram (arranca con pregunta sola, se relanza con texto Wolfram si hay tiempo)
- Devuelve `stepByStepData` para que el botón APL active SBS sin re-llamar Wolfram
- APL: título matemático + resultado Wolfram + resumen proceso Claude

### `WolframAlphaModeIntentHandler.js`
Modo paso a paso. Tres flujos:
- **hasStepByStepData** (botón APL): usa podstates guardados → llama Wolfram fase2 directamente
- **hasInjectedData** (flujo antiguo): usa imágenes ya expandidas
- **nuevo query** (voz): GPT convierte español → Wolfram 2 llamadas → DynamoDB caché

Paginación: 3 pasos por turno. Claude explica cada página.

### `ContinueWolframIntentHandler.js`
Intercepta "continúa", "siguiente", "sí" cuando hay SBS activo. Delega a `WolframAlphaModeIntentHandler` con flag `CONTINUE_WOLFRAM_MODE`.

### `SkipToResultIntentHandler.js`
Salta al resultado final del SBS. Busca pod "Result" en `imagenesNormales` primero, luego en `allSteps`.

### `scienceRoute.js`
Ruta para astronomía, física, química, biología. Consultas paralelas: Wolfram + Wikipedia + NASA/Wikimedia.

### `RepeatLastQuestionIntentHandler.js`
"Repite mi última pregunta" → busca en DynamoDB historial del usuario.

### `SecretRouteIntentHandler.js` *(privado)*
Modo Boaz / 7 Artes Liberales. Activa voz ElevenLabs premium.

### `artesLiberalesRoutes.js` *(privado)*
Lógica de las 7 artes liberales con prompts especializados.

---

## `lambda/services/`

### `claude.js`
Claude Haiku 4.5 vía Bedrock (`us-east-1`). Fallback a API directa si AccessDenied.
- `max_tokens: 700`, `temperature: 0.3`
- System prompt: profesor apasionado, JSON con `{speech, displayTop, displayBottom, keyword}`
- `sanitizeSpeech()` convierte símbolos matemáticos a palabras para Alexa

### `gpt.js`
Dos funciones:
- `obtenerKeyword()` — extrae keyword en inglés. **Fast path matemático** (~1ms) para derivadas/integrales/límites. Sistema de marcadores `__fn__` para funciones trigonométricas. Fallback a Gemini si GPT hace timeout.
- `traducirGPT()` — traducciones rápidas para títulos APL

### `wolfram.js`
Wolfram Alpha Full Results API v2.
- Llamada normal: 1 HTTP request, devuelve imágenes + texto + `stepByStepData`
- Modo SBS: 2 llamadas — fase1 detecta podstates, fase2 expande pasos
- `timeoutMs` se respeta en ambos modos (BUG 1 corregido)
- `scantimeout` y `podtimeout` se ajustan dinámicamente al budget

### `gemini.js`
Gemini 3.1 Flash Lite Preview. Contexto adicional para Claude. Fallback de keywords cuando GPT falla.

### `wikipedia.js`
Wikipedia REST API. Extrae resumen del artículo principal.

### `elevenlabs.js` *(privado)*
Genera audio premium. Formato `mp3_22050_32` (compatible Alexa). Sube a S3 `/audio/premium/`.

### `apl.js`
Genera el documento APL dinámicamente según `darkMode`. Modo oscuro/claro.

### `traduccion.js`
Traduce títulos de keywords (inglés → español) para el APL.

---

## `lambda/utils/`

### `cache.js`
Caché LRU en memoria (100 entradas, TTL 5min). Primera capa antes de S3.

### `s3Cache.js`
Caché persistente en S3. Guarda respuestas de preguntas conceptuales. URLs de Wolfram no se cachean (expiran en ~1-2h).

### `dynamoCache.js`
Caché de sesiones SBS en DynamoDB. Guarda todos los pasos para paginación sin re-llamar Wolfram.

### `userHistory.js`
Historial de preguntas por usuario en DynamoDB. Últimas 5 preguntas, TTL 90 días.

### `timeoutManager.js`
`withTimeout(promise, ms, fallback)` — wrapper que resuelve con fallback si la promise excede el tiempo.

### `ambiguityDetector.js`
Detecta preguntas ambiguas ("¿cuánto mide?") y pide aclaración antes de procesar.

### `reconstruccionPregunta.js`
Reconstruye preguntas con pronombres usando contexto de sesión ("¿y él?" → "¿y Einstein?").

### `imagenesExtra.js`
Busca imágenes en NASA y Wikimedia Commons. Máximo 6 imágenes guardadas en sesión.

### `mathNotation.js`
`normalizarNotacionMatematica()` — limpia keywords matemáticos antes de enviar a Wolfram.

### `fallback.js`
Mensajes de fallback según tipo de error (timeout, red, sin datos).

### `logger.js`
Logging estructurado con `logStep()`.

### `validateResponse.js`
`validateSpeech()` — verifica que el speech de Claude no sea un mensaje de error.

### `cacheabilityAnalyzer.js`
Determina si una pregunta es cacheable (no contextual, no dinámica, no ambigua).

---

## `lambda/config/`

### `timeouts.js`
Todos los timeouts centralizados. Ver tabla en `DOCUMENTACION_PROYECTO.md`.

### `constants.js`
Constantes globales: `PERFORMANCE.GLOBAL_DEADLINE_MS = 7850`, límites de Wolfram, configuración de UI, límites de input.

---

## `lambda/index.js`
Punto de entrada. Registra todos los handlers en orden de prioridad. Maneja eventos APL (zoom, dark mode, StepByStep, verMasImagenes). `NavigateHomeIntentHandler` limpia contexto conversacional.

---

## `skill-package/`
Manifiesto Alexa y modelo de interacción `es-ES.json`. `invocationName: "profesor universal"`.

## `.github/workflows/deploy-lambda-private.yml`
Único workflow activo. Trigger: push a `main`. Incluye `wait function-updated` antes y después del deploy. Verifica archivos secretos presentes.

## `scripts/configure-lambda-env.ps1`
Sincroniza `.env` local → variables de entorno Lambda.
