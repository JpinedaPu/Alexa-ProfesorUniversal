# Documentación Técnica — Profesor Universal IA

**Versión:** 7.7.0 | **Estado:** Producción | **Última actualización:** Marzo 2026

---

## Arquitectura

```
Usuario → Alexa → AWS Lambda (us-east-1) → 5 IAs + 2 APIs imagen → Respuesta voz + APL
```

### Stack

```
IAs y fuentes:
├── Claude 4.5 Haiku    (Amazon Bedrock)  — Síntesis de voz final
├── GPT-4.1 Mini        (OpenAI)          — Extracción de keywords
├── Gemini 3.1 Flash-Lite (Google)        — Contexto web actualizado
├── Wolfram Alpha       (Full Results API)— Datos técnicos + gráficas + step-by-step
├── Wikipedia API                         — Contexto enciclopédico
├── NASA Images API                       — Imágenes científicas
└── Wikimedia Commons                     — Imágenes educativas

Infraestructura AWS (us-east-1):
├── Lambda              — Función AlexaProfesorUniversal (Node.js 20.x, 1024MB, 15s)
├── S3                  — Caché conceptual (TTL 7 días) + logos públicos
├── DynamoDB            — Caché step-by-step (TTL 24h) + historial usuario (TTL 90d)
├── Bedrock             — Acceso a Claude 4.5 Haiku
└── CloudWatch          — Logs y métricas

CI/CD:
└── GitHub Actions      — Deploy automático al hacer push a main
```

### Estructura de archivos

```
lambda/
├── index.js                          ← Punto de entrada, handlers APL y sistema
├── handlers/
│   ├── AskProfeIntentHandler.js      ← Flujo principal de preguntas
│   ├── WolframAlphaModeIntentHandler.js ← Modo matemático paso a paso
│   ├── ContinueWolframIntentHandler.js  ← Paginación de pasos
│   ├── SkipToResultIntentHandler.js     ← Saltar al resultado final
│   ├── RepeatLastQuestionIntentHandler.js
│   ├── mathRoute.js                  ← Detección y ruta matemática
│   └── scienceRoute.js               ← Ruta científica
├── services/
│   ├── apl.js                        ← Generador APL 1.6 (visual)
│   ├── claude.js                     ← Claude vía Bedrock
│   ├── gpt.js                        ← GPT-4.1 Mini (keywords)
│   ├── gemini.js                     ← Gemini 3.1 Flash-Lite
│   ├── wolfram.js                    ← Wolfram Alpha (normal + SBS)
│   ├── wikipedia.js
│   └── traduccion.js
├── utils/
│   ├── cache.js                      ← LRU en memoria
│   ├── s3Cache.js                    ← Caché persistente S3
│   ├── dynamoCache.js                ← Caché step-by-step DynamoDB
│   ├── userHistory.js                ← Historial DynamoDB
│   ├── imagenesExtra.js              ← NASA + Wikimedia
│   ├── cacheabilityAnalyzer.js
│   ├── timeoutManager.js
│   ├── fallback.js
│   ├── validateResponse.js
│   ├── mathNotation.js
│   ├── comparacion.js
│   ├── reconstruccionPregunta.js
│   └── logger.js
└── config/
    ├── constants.js
    └── timeouts.js
```

---

## Flujo de una Pregunta

### Flujo normal (preguntas conceptuales)

```
T+0ms    → Recibe intent AskProfeIntent
T+~55ms  → GPT extrae keyword
T+~60ms  → Wikipedia responde (modo ESTÁTICO — Claude arranca en paralelo)
T+~2500ms→ Gemini responde (llega tarde, se usa para displayBottom)
T+~5500ms→ Claude completa síntesis
T+~5600ms→ APL renderizado
T+~5700ms→ Respuesta enviada
```

### Flujo dinámico (preguntas con datos actualizados)

Activado por `NECESITA_WOLFRAM_RE` — precios, cálculos, ecuaciones, datos actuales:

```
T+0ms    → Recibe intent
T+~55ms  → GPT extrae keyword
T+~1500ms→ Wiki + Gemini en paralelo
T+~2300ms→ Wolfram con gracia de 800ms (1500ms si es cálculo numérico)
T+~5500ms→ Claude sintetiza con todos los datos
T+~5700ms→ Respuesta enviada
```

### Flujo matemático paso a paso

```
T+0ms    → WolframAlphaModeIntent
T+~800ms → GPT convierte lenguaje natural → notación matemática
T+~1000ms→ Llamada 1 Wolfram (pods normales + detección podstate SBS)
T+~3500ms→ Llamada 2 Wolfram (pasos expandidos del pod primary:true)
T+~5500ms→ Claude explica pasos en español
T+~5700ms→ APL muestra 3 pasos + botones Continuar / Ir al resultado
```

Ver detalles técnicos del flujo SBS en `docs/FLUJO-STEP-BY-STEP.md`.

---

## Presupuesto de Tiempo

```
LÍMITE ALEXA: 8000ms
DEADLINE INTERNO: 7700ms

Modo ESTÁTICO:   keyword(55) + wiki(60) + claude(5500) ≈ 5700ms ✅
Modo DINÁMICO:   keyword(55) + wiki+gemini(1500) + wolfram(800) + claude(5500) ≈ 7000ms ✅
Modo SBS:        conversión(800) + wolfram×2(3500) + claude(1500) ≈ 6000ms ✅
```

---

## Recursos AWS

### Lambda
- **Función:** `AlexaProfesorUniversal`
- **ARN:** `arn:aws:lambda:us-east-1:811710375370:function:AlexaProfesorUniversal`
- **Skill ID:** `amzn1.ask.skill.91893f76-ab13-4ee2-ad95-d803f3434ee5`

### DynamoDB
| Tabla | Partition Key | TTL | Uso |
|-------|--------------|-----|-----|
| `ProfesorUniversal-StepByStep` | `sessionId` | 24h | Caché pasos matemáticos |
| `ProfesorUniversal-UserHistory` | `userId` | 90d | Últimas 5 preguntas por usuario |

### S3 — `alexa-profesor-universal-cache-us-east-1`
- `logos/` — Logos públicos (PNG) para APL
- `cache/` — Respuestas cacheadas (privado)

### IAM Role — `AlexaProfesorUniversal-role-1xqb12bn`
Políticas: `AWSLambdaBasicExecutionRole`, DynamoDB, S3, Bedrock Claude

---

## Despliegue

### Dos repositorios

| | Repo público (`origin`) | Repo privado (`private`) |
|---|---|---|
| URL | `Alexa-ProfesorUniversal` | `Alexa-ProfesorUniversal-private` |
| Archivos secretos | ❌ No | ✅ Sí |
| Deploy a Lambda | ❌ Desactivado | ✅ Activo |

### Flujo normal
```bash
# Deploy principal — repo privado → Lambda con modo secreto incluido
git add .
git commit -m "feat: descripción"
git push private main
# GitHub Actions despliega en ~30s

# Deploy repo público (portfolio, opcional)
git push origin main
```

### Protección pre-push hook

El archivo `.git/hooks/pre-push` bloquea automáticamente `git push origin main` si los archivos del modo secreto están trackeados en git. Esto previene filtraciones accidentales.

Si el hook bloquea el push:
```bash
git rm --cached lambda/handlers/SecretRouteIntentHandler.js
git rm --cached lambda/handlers/artesLiberalesRoutes.js
git rm --cached lambda/services/elevenlabs.js
git commit -m "chore: eliminar archivos secretos del tracking"
```

> El hook vive en `.git/hooks/` y **no se sube a GitHub**. Si clonas el repo en una máquina nueva, cópialo manualmente desde el hook documentado en `REFERENCIA_RAPIDA.md`.

### Variables de entorno
```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

Variables requeridas: `OPENAI_API_KEY`, `WOLFRAM_APP_ID`, `GEMINI_API_KEY`, `CLAUDE_API_KEY`

---

## Caché Inteligente

| Capa | Tecnología | TTL | Qué cachea |
|------|-----------|-----|-----------|
| Memoria | LRU in-process | sesión | Respuestas recientes |
| S3 | JSON en bucket | 7 días | Respuestas conceptuales completas |
| DynamoDB | Tabla SBS | 24h | Pasos matemáticos por sesión |

**Nota:** Las URLs de imágenes Wolfram expiran (~1-2h). En cache HIT se re-consulta Wolfram solo para imágenes frescas, no para texto.

---

## APL Visual

Generado en `services/apl.js`. Soporta:
- Modo oscuro / claro (toggle por voz o botón)
- Zoom dinámico (30%–150%, paso 15%)
- Modo susurro (SSML `amazon:effect name="whispered"`)
- Logo dinámico Wolfram sobre primer pod (solo cuando hay resultados)
- Botones D-pad friendly (Fire Stick) con hover/focus
- Navegación por voz: "continúa", "ir al resultado", "ver más imágenes"

---

## Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `API KEY no configurada` | Variables de entorno faltantes | `.\scripts\configure-lambda-env.ps1` |
| `Timeout after 8000ms` | API externa lenta | Ya mitigado con timeouts dinámicos |
| `Access Denied` S3/DynamoDB | IAM sin permisos | Verificar role en Lambda Console |
| `NO_PODS` Wolfram | Query no reconocida | GPT re-intenta con notación matemática |
| `ERR_PARSE` Claude | JSON malformado | Fallback automático a respuesta básica |

### Logs CloudWatch
```powershell
aws logs tail /aws/lambda/AlexaProfesorUniversal --follow --region us-east-1
```

---

## Certificación Alexa

**Privacy & Compliance:**
- No compras, no datos personales, no dirigido a menores, sin publicidad
- Permiso: Device Address (Country & Postal Code) — para preguntas de duración del sol

**URLs:**
- Privacy: `https://jpinedapu.github.io/alexa-profesor-matematico/privacy-policy.html`
- Terms: `https://jpinedapu.github.io/alexa-profesor-matematico/terms-of-use.html`

---

**Mantenedor:** JpinedaPu | **Repo:** github.com/JpinedaPu/AlexaProfesorUniversal
