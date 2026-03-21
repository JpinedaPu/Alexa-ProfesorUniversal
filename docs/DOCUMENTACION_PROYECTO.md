# Profesor Universal IA — Documentación Técnica
**Versión:** 7.7.x | **Última actualización:** Marzo 2026 | **Estado:** ✅ Producción

---

## Stack y Configuración

| Componente | Valor |
|---|---|
| Runtime | Node.js 22.x |
| Región | us-east-1 (N. Virginia) |
| Función Lambda | `AlexaProfesorUniversal` |
| ARN | `arn:aws:lambda:us-east-1:811710375370:function:AlexaProfesorUniversal` |
| Timeout Lambda | 15s (Alexa corta a ~8s) |
| Deadline interno | 7850ms (`PERFORMANCE.GLOBAL_DEADLINE_MS`) |
| Memory | 1024 MB |
| CI/CD | GitHub Actions → repo privado `Alexa-ProfesorUniversal-private` |

---

## Fuentes de Conocimiento (7)

| Servicio | Uso | Modelo/Endpoint | Latencia típica |
|---|---|---|---|
| Claude (Bedrock) | Síntesis de voz principal | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | ~2-3s |
| Wolfram Alpha | Cálculo, imágenes matemáticas, SBS | Full Results API v2 | ~1.5-5s |
| GPT-4.1 Mini | Extracción de keywords, fast path matemático | `gpt-4.1-mini` | ~1ms (fast path) / ~800ms (GPT) |
| Gemini | Contexto adicional, fallback de keywords | `gemini-3.1-flash-lite-preview` | ~1.3s |
| Wikipedia | Respaldo enciclopédico | REST API | ~60ms |
| NASA Images | Imágenes científicas/espaciales | `images.nasa.gov` | ~300ms |
| Wikimedia Commons | Imágenes educativas | REST API | ~300ms |

---

## Infraestructura AWS

### DynamoDB (us-east-1)
- **ProfesorUniversal-StepByStep** — caché de sesiones paso a paso (TTL 24h)
- **ProfesorUniversal-UserHistory** — historial de preguntas por usuario (TTL 90 días, últimas 5)

### S3 (us-east-1)
- **Bucket:** `alexa-profesor-universal-cache-us-east-1`
- `/cache/` — caché de preguntas conceptuales (S3 + LRU en memoria)
- `/logos/` — logos públicos para APL
- `/audio/premium/` — audio ElevenLabs (modo secreto)

---

## Rutas de Procesamiento

### 1. Ruta Matemática (`mathRoute.js`)
Activada por: `derivada`, `integral`, `limite`, `ecuacion`, `seno`, `coseno`, `logaritmo`, etc.

```
T+0ms    → esPreguntaMatematica() — regex síncrono
T+~1ms   → obtenerKeyword() — FAST PATH (sin llamada GPT)
T+~1ms   → Claude arranca en paralelo con Wolfram (prompt matemático)
T+~1ms   → Wolfram fase1 arranca (isStepByStep:false, timeout=FASE1_TIMEOUT)
T+~2500ms → Claude responde (con conocimiento propio)
T+~3500ms → Wolfram fase1 completa (imágenes + stepByStepData)
           → Si queda ≥1800ms: Claude se relanza con texto Wolfram
T+~5500ms → Respuesta final
```

**Salida APL:**
- `titulo` — notación matemática formateada (`d/dx x²·sen(x)`)
- `textoSuperior` — resultado concreto de Wolfram (`Derivative: 2x·sin(x) + x²·cos(x)`)
- `textoInferior` — resumen del proceso de Claude (diferente al speech)
- `imagenes` — pods de Wolfram (gráficas, resultado, propiedades)
- `canStepByStep` — true si Wolfram detectó podstates

**sessionAttributes guardados:**
- `lastStepByStepData` — podstates para activar SBS sin re-llamar Wolfram

### 2. Ruta Paso a Paso (`WolframAlphaModeIntentHandler.js`)
Activada por: botón APL "Paso a Paso" o voz "modo wolfram [ecuación]"

**Flujo botón APL (hasStepByStepData):**
```
index.js inyecta stepByStepData en wolframData
→ WolframAlphaModeIntentHandler detecta hasStepByStepData
→ Salta GPT → llama Wolfram fase2 directamente (~2s)
→ Claude explica pasos 1-3 → "di continúa para más"
```

**Flujo voz (nuevo query):**
```
convertirANotacionMatematica() — GPT ~800ms
→ Progressive Response en paralelo
→ consultarWolfram(isStepByStep:true) — 2 llamadas HTTP (~5s)
→ guardarSessionCache() — DynamoDB
→ Claude explica pasos 1-3
```

**Paginación:** 3 pasos por turno, `ContinueWolframIntentHandler` avanza.

### 3. Ruta Científica (`scienceRoute.js`)
Activada por: `agujero negro`, `estrella`, `planeta`, `átomo`, `ADN`, etc.

Consultas paralelas: Wolfram + Wikipedia + NASA/Wikimedia → Claude síntesis.

### 4. Flujo Normal (`AskProfeIntentHandler.js`)
Para todo lo demás. Dos modos:

- **ESTÁTICO** (preguntas históricas/biográficas): Wikipedia → Claude + Gemini en paralelo
- **DINÁMICO** (datos actualizados: precios, clima, cálculos): Wolfram + Wikipedia + Gemini → Claude

---

## Fast Path Matemático (`gpt.js`)

Convierte español fonético a notación Wolfram sin llamar GPT (~1ms).

**Ejemplos:**
| Entrada | Salida |
|---|---|
| `derivada del logaritmo natural de tres equis mas uno` | `derivative of ln(3 x + 1)` |
| `integral de e a la equis por el seno de equis` | `integral of e^(x) * sin(x)` |
| `derivada del coseno al cuadrado de equis` | `derivative of cos(x)^2` |
| `derivada del logaritmo natural del seno de equis` | `derivative of ln(sin(x))` |
| `derivada de uno sobre equis al cuadrado mas uno` | `derivative of 1/(x^2 + 1)` |

**Sistema de marcadores:** funciones como `seno de` → `__sin__` → resuelto después de convertir variables/números → `sin(x)`. Evita que `sin(` trague el resto de la expresión.

**Manejo de mojibake:** repara encoding UTF-8/Latin-1 roto (`Ã¡` → `á`) antes del regex.

---

## Timeouts (`config/timeouts.js`)

| Servicio | Timeout |
|---|---|
| Wolfram Alpha | 6000ms (normal) |
| Claude Bedrock | 4000ms |
| Gemini | 5000ms |
| GPT keyword | 1700ms |
| Wikipedia | 1200ms |
| Imágenes extra | 2000ms |
| S3 caché | 800ms |

**Deadline global:** `PERFORMANCE.GLOBAL_DEADLINE_MS = 7850ms`

---

## Repos y Deploy

| Repo | Propósito | Deploy |
|---|---|---|
| `Alexa-ProfesorUniversal-private` | Producción — incluye modo secreto | Automático en push a `main` |
| `Alexa-ProfesorUniversal` | Público — sin archivos secretos | Manual en avances significativos |

**Archivos secretos** (solo en repo privado):
- `SecretRouteIntentHandler.js`
- `artesLiberalesRoutes.js`
- `elevenlabs.js`

**Pre-push hook:** `.git/hooks/pre-push` bloquea secretos en repo público.

---

## Variables de Entorno (Lambda)

```
OPENAI_API_KEY      — GPT-4.1 Mini
WOLFRAM_APP_ID      — Wolfram Alpha (acceso Blake Gilbert, activo hasta 20 mar 2026)
GEMINI_API_KEY      — Gemini Flash Lite
CLAUDE_API_KEY      — Fallback API directa (Bedrock es el principal vía IAM)
ELEVENLABS_API_KEY  — Solo modo secreto
```

---

## Límites Conocidos

- **Alexa sessionAttributes:** máx 24KB — pool de imágenes limitado a 6, no guardar arrays grandes
- **Audio Alexa:** MP3 mínimo 48kbps, 16kHz o 24kHz (ElevenLabs: `mp3_24000_48`)
- **Wolfram SBS:** requiere acceso especial (Blake Gilbert, Wolfram Research) — tier académico en negociación
- **Claude max_tokens:** 700 en respuestas normales

---

## Modo Secreto (Boaz / 7 Artes Liberales)

Activado con: `"la palabra es Boaz"` → `SecretModeIntentHandler`

- Voz premium via ElevenLabs (Daniel/Bella)
- Audio subido a S3 `/audio/premium/`
- Prompt especializado en las 7 Artes Liberales
- `sessionAttributes.modoSecreto = true`
