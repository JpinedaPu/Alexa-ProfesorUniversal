# Análisis Técnico — Profesor Universal IA
**Senior Developer Review | Marzo 2026**

---

## Resumen Ejecutivo

El proyecto está bien estructurado y funcional en producción. La arquitectura multi-fuente con presupuesto de tiempo dinámico es sólida. Se identificaron **bugs activos**, **código muerto**, **inconsistencias** y **oportunidades de mejora** que se detallan abajo.

---

## 1. BUGS ACTIVOS

### 🔴 BUG CRÍTICO — `scienceRoute.js` importa función inexistente
**Archivo:** `lambda/handlers/scienceRoute.js` línea 4
```js
const { buscarImagenesNASA } = require('../utils/imagenesExtra');
```
`imagenesExtra.js` **no exporta** `buscarImagenesNASA`. Solo exporta `buscarImagenesExtra`.
Esto hace que la ruta científica **falle en runtime** con `TypeError: buscarImagenesNASA is not a function`.

**Fix:**
```js
const { buscarImagenesExtra } = require('../utils/imagenesExtra');
// y en el uso:
tipo === 'astronomia' ? buscarImagenesExtra(keyword, 10) : Promise.resolve([])
```

---

### 🔴 BUG — `mathAgent.js` usa model ID incorrecto
**Archivo:** `lambda/handlers/mathAgent.js` línea 8
```js
const MODEL_HAIKU = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';
```
El resto del proyecto usa `'us.anthropic.claude-haiku-4-5-20251001-v1:0'` (Claude Haiku 4.5).
`mathAgent.js` usa Claude 3.5 Haiku — modelo diferente, más lento y menos capaz.
Además, `mathAgent.js` **no se usa en ningún lugar** del código actual (ver sección Código Muerto).

---

### 🟡 BUG — `dynamoCache.js` duplica lógica de `cacheabilityAnalyzer.js`
**Archivo:** `lambda/utils/dynamoCache.js` líneas 72–130
`dynamoCache.js` tiene su propia función `analizarCacheabilidad()` y `generarCacheKey()` que son casi idénticas a las de `cacheabilityAnalyzer.js`. El código real usa `cacheabilityAnalyzer.js` (importado en `s3Cache.js` y `AskProfeIntentHandler.js`). La versión en `dynamoCache.js` es código muerto que puede confundir.

---

### 🟡 BUG — `gpt.js` tiene `systemContent` duplicado
**Archivo:** `lambda/services/gpt.js`
Hay **dos constantes `systemContent`** definidas en el mismo archivo (líneas ~130 y ~200 aprox). La segunda sobreescribe la primera. La primera (más corta) nunca se usa. Esto es confuso y puede causar comportamiento inesperado si se refactoriza.

---

### 🟡 BUG — `keywordLocal()` definida pero nunca llamada
**Archivo:** `lambda/services/gpt.js`
```js
function keywordLocal(preguntaNorm) { ... }
```
Está definida dentro del scope de `obtenerKeyword` pero nunca se invoca. Es código muerto con riesgo de confusión.

---

### 🟡 BUG — `RepeatLastQuestionIntentHandler` guarda `pendingRepeat` pero nadie lo lee
**Archivo:** `lambda/handlers/RepeatLastQuestionIntentHandler.js`
```js
sessionAttributes.pendingRepeat = ultimaPregunta.pregunta;
```
Se guarda en sesión pero ningún handler lee `pendingRepeat`. Si el usuario dice "sí" después, cae en `FallbackIntentHandler`. La funcionalidad de repetir está incompleta.

---

### 🟡 BUG — `gemini.js` apunta a modelo inexistente
**Archivo:** `lambda/services/gemini.js` línea 35
```js
path: `/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
```
El modelo `gemini-3.1-flash-lite-preview` no existe en la API de Google. El modelo correcto es `gemini-2.0-flash-lite` o `gemini-2.0-flash`. Esto causa que **todas las consultas a Gemini fallen** con 404, y el log dice `[GEMINI] ❌ ERR_API_404`. El README dice "Gemini 2.0 Flash Lite" pero el código usa un nombre incorrecto.

---

### 🟡 BUG — `wikipedia.js` timeout interno vs `timeouts.js` desincronizados
**Archivo:** `lambda/services/wikipedia.js` línea 43
```js
timeout: 3200
```
`timeouts.js` define `WIKI_TIMEOUT: 1200`. El archivo de Wikipedia usa 3200ms hardcodeado ignorando la constante centralizada. Si se cambia `timeouts.js`, Wikipedia no se actualiza.

---

### 🟡 BUG — `traduccion.js` puede retornar `fallbackSpeech('timeout')` como traducción
**Archivo:** `lambda/services/traduccion.js` línea 52
```js
resultado = await withTimeout(traducirGPT(...), 2500, fallbackSpeech('timeout'));
```
Si la traducción hace timeout, el título visual del APL mostrará `"Mi respuesta tardó demasiado. ¿Puedes repetir?"` en lugar del título original. Debería hacer fallback al texto original, no al mensaje de error.

**Fix:**
```js
resultado = await withTimeout(traducirGPT(...), 2500, texto); // fallback al original
```

---

## 2. CÓDIGO MUERTO

### `mathAgent.js` — No se usa en ningún lugar
`generarPasosMatematicos()` no es importado por ningún archivo. `mathRoute.js` usa directamente `consultarClaude()` para explicar pasos. Este archivo puede eliminarse o es una feature pendiente de integrar.

### `consultarGPT()` en `gpt.js` — No se usa
La función `consultarGPT()` (la respuesta completa vía GPT) no es llamada desde ningún handler. El proyecto usa `consultarClaude()` para síntesis. GPT solo se usa para `obtenerKeyword()`, `traducirGPT()`, `enriquecerConWolfram()` y `auditarRespuesta()`.

### `enriquecerConWolfram()` y `auditarRespuesta()` en `gpt.js` — No se usan
Exportadas pero no importadas en ningún handler activo. Son funciones de una arquitectura anterior.

### `mathAgent.js` — Model ID desactualizado
Usa `claude-3-5-haiku` cuando el proyecto ya migró a `claude-haiku-4-5`.

---

## 3. INCONSISTENCIAS

### Timeouts hardcodeados vs `timeouts.js`
Varios archivos ignoran las constantes centralizadas:

| Archivo | Timeout hardcodeado | Constante en `timeouts.js` |
|---------|--------------------|-----------------------------|
| `wikipedia.js` | 3200ms | `WIKI_TIMEOUT: 1200` |
| `wolfram.js` | 5000ms (interno) | `WOLFRAM_TIMEOUT: 5500` |
| `gemini.js` | 5000ms | `GEMINI_TIMEOUT: 5000` ✅ |
| `claude.js` | 3000ms default | `CLAUDE_TIMEOUT: 3500` |

### Versión del modelo Gemini en logs vs realidad
- `gemini.js` log: `"Consultando Gemini 3.1 Flash Lite"`
- `gemini.js` path: `gemini-3.1-flash-lite-preview` (no existe)
- README: `Gemini 2.0 Flash Lite`
- `gpt.js` systemContent: menciona `"Gemini Grounding"`

### `CACHE.S3_BUCKET` en `constants.js` vs nombre real
```js
S3_BUCKET: 'alexa-profesor-universal-cache'  // constants.js
```
El bucket real es `alexa-profesor-universal-cache-us-east-1`. `s3Cache.js` usa el nombre correcto hardcodeado, ignorando la constante.

### `claude.js` — `max_tokens` inconsistente
- `constants.js` define `CLAUDE.MAX_TOKENS: 1024`
- `claude.js` usa `max_tokens: 700` hardcodeado
- La constante no se usa

### Versión en JSDoc desactualizada
Varios archivos dicen `@version 7.4.0` cuando el proyecto está en `7.7.0`:
- `wolfram.js`: `@version 7.4.0`
- `wikipedia.js`: `@version 7.4.0`
- `gpt.js`: `@version 7.4.0`

---

## 4. ARQUITECTURA — OBSERVACIONES

### `AskProfeIntentHandler.js` — Demasiado grande (God Object)
El handler tiene ~400 líneas y hace demasiado: validación, ubicación, reconstrucción, caché, orquestación de IAs, APL, historial. Funciona bien pero es difícil de mantener. Las rutas `mathRoute` y `scienceRoute` son el camino correcto — seguir extrayendo lógica a rutas especializadas.

### `gpt.js` — Archivo con demasiadas responsabilidades
Contiene: traducción, extracción de keywords, respuesta completa (no usada), enriquecimiento (no usado), auditoría (no usada). Debería dividirse en `keyword.js` y mantener solo lo que se usa.

### `dynamoCache.js` — Responsabilidad mixta
Mezcla caché de step-by-step con análisis de cacheabilidad (que ya está en `cacheabilityAnalyzer.js`). La función `analizarCacheabilidad` de `dynamoCache.js` debería eliminarse.

### `ContinueWolframIntentHandler.js` — Diseño correcto
Delega a `WolframAlphaModeIntentHandler` con flag. Limpio y correcto.

### `SkipToResultIntentHandler.js` — Lógica de búsqueda robusta
La cascada de fallbacks para encontrar el pod Result (imagenesNormales → allSteps → último) es correcta y defensiva.

### Sistema de caché en 3 capas — Bien diseñado
LRU memoria → S3 → consulta fresca. La decisión de no cachear URLs de Wolfram (expiran) y re-consultarlas en cache HIT es correcta.

---

## 5. SEGURIDAD

### ✅ Bien
- API keys en variables de entorno Lambda
- `.env` en `.gitignore`
- `elevenlabs.js` removido del repo
- IAM roles con permisos mínimos

### ⚠️ Observación
- `claude.js` tiene `keepAliveAgent` con `maxSockets: 50` — en Lambda con concurrencia alta esto puede causar problemas de conexión. Reducir a 5-10.
- `gpt.js` también tiene `maxSockets: 50` — mismo problema.

---

## 6. RENDIMIENTO

### Bien optimizado
- Fast paths en `obtenerKeyword()` para planetas, presidentes comunes
- Modo ESTÁTICO vs DINÁMICO según tipo de pregunta
- `withTimeout()` en todas las llamadas externas
- Progressive Response para comprar tiempo

### Oportunidad de mejora
- `buscarImagenesExtra()` siempre busca 30 imágenes aunque solo se muestren 6. Podría buscar solo 12 en primera instancia y el resto lazy.
- `userHistory.js` hace GET + PUT en cada pregunta (2 operaciones DynamoDB). Podría usar `UpdateExpression` con `list_append` para hacerlo en 1 operación.

---

## 7. RESUMEN DE ACCIONES RECOMENDADAS

### Crítico (afecta funcionalidad en producción)
1. **Corregir `scienceRoute.js`** — `buscarImagenesNASA` → `buscarImagenesExtra`
2. **Corregir `gemini.js`** — model path a `gemini-2.0-flash-lite`

### Importante (limpieza y consistencia)
3. **Eliminar código muerto** — `mathAgent.js`, `consultarGPT`, `enriquecerConWolfram`, `auditarRespuesta`, `keywordLocal`, `analizarCacheabilidad` en `dynamoCache.js`
4. **Corregir `traduccion.js`** — fallback al texto original, no al mensaje de error
5. **Completar `RepeatLastQuestionIntentHandler`** — leer `pendingRepeat` en un handler de AMAZON.YesIntent
6. **Sincronizar `CACHE.S3_BUCKET`** en `constants.js` con el nombre real del bucket

### Menor (deuda técnica)
7. Unificar `systemContent` duplicado en `gpt.js`
8. Usar `CLAUDE.MAX_TOKENS` de `constants.js` en `claude.js`
9. Actualizar versiones JSDoc a 7.7.0
10. Reducir `maxSockets` de 50 a 10 en agentes HTTP

---

**Fecha del análisis:** Marzo 2026
**Archivos revisados:** 35 (todos los archivos de `lambda/`)
**Estado general:** ✅ Funcional en producción con bugs menores identificados
