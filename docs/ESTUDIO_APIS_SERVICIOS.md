# Estudio de APIs y Servicios — Profesor Universal IA
**Última actualización:** Marzo 2026  
**Estado:** ✅ Producción

---

## Resumen ejecutivo

| Servicio | Proveedor | Región/Endpoint | Modelo/Versión | Costo | Estado |
|----------|-----------|-----------------|----------------|-------|--------|
| Claude | AWS Bedrock | us-east-1 | claude-haiku-4-5-20251001-v1:0 | Por token | ✅ Activo |
| GPT | OpenAI | api.openai.com (global) | gpt-4.1-mini-2025-04-14 | Por token | ✅ Activo |
| Gemini | Google | generativelanguage.googleapis.com (global) | gemini-3.1-flash-lite-preview | Por token | ✅ Activo |
| Wolfram Alpha | Wolfram | api.wolframalpha.com (global) | Full Results API v2 | Por query | ✅ Activo (Show Steps provisionado por Blake) |
| Wikipedia | Wikimedia | en.wikipedia.org (global CDN) | REST API v1 | Gratis | ✅ Activo |
| NASA Images | NASA | images-api.nasa.gov (global) | Images API v1 | Gratis | ✅ Activo |
| Wikimedia Commons | Wikimedia | commons.wikimedia.org (global CDN) | API v1 | Gratis | ✅ Activo |
| ElevenLabs | ElevenLabs | api.elevenlabs.io (global) | eleven_multilingual_v2 | Por caracter | ✅ Activo (solo modo secreto) |
| S3 | AWS | us-east-1 | — | Por GB/request | ✅ Activo |
| DynamoDB | AWS | us-east-1 | — | Por RCU/WCU | ✅ Activo |
| Lambda | AWS | us-east-1 | Node.js 22.x | Por invocación | ✅ Activo |

---

## 1. Claude — AWS Bedrock

- **Endpoint:** AWS Bedrock SDK (`BedrockRuntimeClient`)
- **Región:** `us-east-1` (N. Virginia) — hardcodeado en `claude.js`
- **Modelo:** `us.anthropic.claude-haiku-4-5-20251001-v1:0` (Inference Profile)
- **Autenticación:** IAM Role de Lambda (sin API key)
- **Fallback:** API directa `api.anthropic.com/v1/messages` con `CLAUDE_API_KEY` si Bedrock da AccessDenied
- **Uso:** Síntesis educativa principal — genera el speech, displayTop, displayBottom y keyword
- **Parámetros:** max_tokens=700, temperature=0.3
- **Timeout:** Variable según budget disponible (máx ~6.5s)
- **Costo:** ~$0.00025/1K input tokens, ~$0.00125/1K output tokens

---

## 2. GPT — OpenAI

- **Endpoint:** `api.openai.com/v1/chat/completions` (global, sin región específica)
- **Modelo:** `gpt-4.1-mini-2025-04-14`
- **Autenticación:** `OPENAI_API_KEY` en Lambda env vars
- **Usos:**
  - `obtenerKeyword()` — extrae keyword en inglés para Wolfram/Wikipedia (timeout: 1500ms)
  - `traducirGPT()` — traduce títulos para el APL (timeout: 4000ms)
  - `convertirANotacionMatematica()` — convierte expresiones matemáticas en español a notación Wolfram (timeout: 3000ms)
- **Fallback keyword:** Gemini (`_keywordConGemini`) cuando GPT hace timeout o falla
- **Parámetros keyword:** max_tokens=25, temperature=0.1
- **Nota:** Key renovada el 20 mar 2026 — la anterior estaba inválida causando timeouts

---

## 3. Gemini — Google

- **Endpoint:** `generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent`
- **Región:** Global (Google gestiona la distribución)
- **Modelo:** `gemini-3.1-flash-lite-preview`
- **Autenticación:** `GEMINI_API_KEY` en Lambda env vars
- **Uso principal:** Contexto enciclopédico complementario (hasta 600 tokens, ~1.5s)
- **Uso secundario:** Fallback de keyword extraction cuando GPT falla
- **Parámetros:** maxOutputTokens=600, temperature=0.2
- **Timeout:** 5000ms
- **Modelos disponibles en la cuenta** (verificado 20 mar 2026):
  - `gemini-2.0-flash` ✅
  - `gemini-2.0-flash-lite-001` ✅
  - `gemini-2.5-flash` ✅
  - `gemini-3.1-flash-lite-preview` ✅ (en uso)
  - `gemini-3-flash-preview` ✅
  - `gemini-2.5-flash-lite` ✅

---

## 4. Wolfram Alpha

- **Endpoint:** `api.wolframalpha.com/v2/query` (global)
- **App ID:** `6U3PEET6LV`
- **Plan:** Gratuito + Show Steps provisionado manualmente por Blake Gilbert (Developer Relations)
- **Uso:** Cálculos matemáticos, datos científicos, imágenes de pods, step-by-step
- **Parámetros:** format=image,plaintext, mag=2, width=800, units=metric
- **Show Steps:** Requiere 2 llamadas:
  1. Llamada normal → detecta `pod.states[]` con `"step-by-step"` → guarda `state.input`
  2. Llamada con `podstate=X__Step-by-step+solution&podstate=X__Show+all+steps` → extrae subpods del pod `primary:true`
- **Timeout fase 1:** 2500ms | **Timeout fase 2 (SBS):** 4500ms paralelo con Claude
- **Costo Show Steps:** $20 CPM ($0.02/query) — mínimo comercial $1,000 prepago
- **Estado:** Acceso gratuito de testing activo (Blake lo restauró el 20 mar 2026)

---

## 5. Wikipedia

- **Endpoint:** `en.wikipedia.org/w/api.php` (global CDN Wikimedia)
- **API:** MediaWiki API con `action=query&prop=extracts|pageimages|categories`
- **Autenticación:** Ninguna (pública)
- **Uso:** Contexto enciclopédico — extracto hasta 800 chars + thumbnail
- **Timeout:** 1100ms (agresivo para no bloquear el flujo)
- **Costo:** Gratis

---

## 6. NASA Images API

- **Endpoint:** `images-api.nasa.gov/search` (global, CDN NASA)
- **Autenticación:** Ninguna (pública)
- **Uso:** Imágenes científicas/espaciales — solo activa cuando el keyword es espacial
- **Filtros:** Excluye diagramas, ilustraciones, logos, renders
- **Timeout:** 4000ms
- **Costo:** Gratis

---

## 7. Wikimedia Commons

- **Endpoint:** `commons.wikimedia.org/w/api.php` (global CDN)
- **Autenticación:** Ninguna (pública)
- **Uso:** Imágenes educativas complementarias para el APL
- **Filtros:** Solo imágenes (no SVG), mínimo 200×100px, relevancia por keyword
- **Timeout:** 3000ms
- **Costo:** Gratis
- **Nota:** Reducido a máx 6 imágenes (antes 30) para no exceder límite 24KB de Alexa

---

## 8. ElevenLabs

- **Endpoint:** `api.elevenlabs.io/v1/text-to-speech/{voiceId}` (global)
- **Modelo:** `eleven_multilingual_v2`
- **Output format:** `mp3_24000_48` (24kHz, 48kbps — requisito mínimo de Alexa para `<audio>` SSML)
- **Autenticación:** `ELEVENLABS_API_KEY` en Lambda env vars
- **Uso:** Solo en modo secreto (Las 7 Artes Liberales) — voz premium por arte
- **Voces por arte:**
  - `maestro`: Daniel (`onwK4e9ZLuTAKqWW03F9`) — sabio, equilibrado
  - `gramatica`/`logica`: Antoni (`ErXwobaYiN019PkySvjV`) — analítico
  - `retorica`/`astronomia`: Adam (`pNInz6obpgDQGcFmaJgB`) — narrativo
  - `aritmetica`: Arnold (`VR6AewLTigWG4xSOukaG`) — metódico
  - `geometria`/`musica`: Bella (`EXAVITQu4vr4xnSDxMaL`) — descriptiva
- **Flujo:** Genera MP3 → sube a S3 `audio/premium/` → Alexa reproduce via `<audio src="..."/>`
- **Timeout:** 10000ms
- **Costo:** Plan gratuito tiene límite de caracteres/mes

---

## 9. AWS S3

- **Bucket:** `alexa-profesor-universal-cache-us-east-1`
- **Región:** `us-east-1`
- **Usos:**
  - `logos/` — logos públicos del header APL (acceso público)
  - `audio/premium/` — audios ElevenLabs del modo secreto (acceso público)
  - `cache/` — caché de respuestas conceptuales (privado, acceso Lambda)
- **Política pública:** `logos/*` y `audio/premium/*`
- **TTL caché:** No hay TTL en S3 (las URLs de Wolfram expiran ~1-2h, por eso no se cachean)

---

## 10. AWS DynamoDB

- **Región:** `us-east-1`
- **Tablas:**
  - `ProfesorUniversal-StepByStep` — caché matemático paso a paso (TTL 24h)
  - `ProfesorUniversal-UserHistory` — historial de preguntas por usuario (últimas 5, TTL 90 días)

---

## 11. AWS Lambda

- **Función:** `AlexaProfesorUniversal`
- **ARN:** `arn:aws:lambda:us-east-1:811710375370:function:AlexaProfesorUniversal`
- **Región:** `us-east-1`
- **Runtime:** Node.js 22.x
- **Memory:** 1024 MB
- **Timeout Lambda:** 15s (Alexa corta a 8s — objetivo <7.8s)
- **Deploy:** GitHub Actions desde `Alexa-ProfesorUniversal-private` en cada push a `main`

---

## Análisis de latencias (log real 20 mar 2026)

```
T+0ms     → Request recibido
T+38ms    → Slot capturado
T+647ms   → GPT keyword ✅ ("World War II")
T+761ms   → Keyword confirmado
T+918ms   → Progressive response enviado
T+1006ms  → Wikipedia ✅ (56ms desde inicio paralelo)
T+1006ms  → Claude inicia (con wiki disponible)
T+629ms   → Imágenes extra ✅ (6 Wikimedia)
T+2224ms  → Gemini ✅
T+2882ms  → Wolfram ✅ (9 imgs, llega tarde)
T+3826ms  → Claude ✅
T+4833ms  → TOTAL
```

---

## Problemas conocidos y fixes aplicados

| Problema | Causa | Fix | Fecha |
|----------|-------|-----|-------|
| Audio ElevenLabs rechazado por Alexa | Formato `mp3_22050_32` (22kHz/32kbps) incompatible | `output_format=mp3_24000_48` | 21 mar 2026 |
| `ArteLiberalIntent` no matcheaba "lógica" sola | Samples solo tenían `{arte} {pregunta}` (2 slots) | Añadir samples de 1 slot: `"{arte}"`, `"enséñame {arte}"` | 21 mar 2026 |
| `outputSpeech: undefined` en logs modo secreto | `response.response?.outputSpeech` (nivel extra) | `response.outputSpeech` directo | 20 mar 2026 |
| "Se ha producido un error" en preguntas normales | 30 imágenes en `sessionAttributes` excedían 24KB | Reducir a 6 imágenes, no guardar pool | 20 mar 2026 |
| Keyword `"mundial"` en vez de `"World War II"` | OpenAI API key inválida → timeout → fallback malo | Renovar key + fallback a Gemini | 20 mar 2026 |
| `canStepByStep: false` en integrales | Budget SBS de 1500ms insuficiente | Aumentar a 4500ms paralelo con Claude | 20 mar 2026 |

---

## Variables de entorno Lambda (requeridas)

```
OPENAI_API_KEY      → GPT keyword + traducción + notación matemática
GEMINI_API_KEY      → Contexto enciclopédico + fallback keyword
WOLFRAM_APP_ID      → Cálculos + imágenes + step-by-step
CLAUDE_API_KEY      → Fallback si Bedrock da AccessDenied
ELEVENLABS_API_KEY  → Audio premium modo secreto
```

---

## Oportunidades de mejora identificadas

1. **Gemini modelo** — Considerar migrar a `gemini-2.5-flash` (más capaz, similar latencia)
2. **Wolfram Show Steps** — Negociar tier académico con Blake ($100-200 prepago)
3. **ElevenLabs** — Monitorear uso de caracteres del plan gratuito
4. **Wikipedia** — Actualmente solo en inglés; considerar fallback a `es.wikipedia.org` para temas hispanohablantes
5. **Claude modelo** — `claude-haiku-4-5` es el más rápido; evaluar si `claude-sonnet` mejora calidad en respuestas complejas
