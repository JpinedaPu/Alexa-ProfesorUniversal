# Referencia Rápida — Profesor Universal IA

---

## Comandos Esenciales

```powershell
# Deploy (el más usado)
git add . && git commit -m "feat: descripción" && git push origin main

# Sincronizar .env local → Lambda
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"

# Deploy modo secreto (sin GitHub)
.\scripts\deploy-secreto.ps1 -FunctionName "AlexaProfesorUniversal"

# Ver logs en tiempo real
aws logs tail /aws/lambda/AlexaProfesorUniversal --follow --region us-east-1

# Buscar errores
aws logs filter-log-events --log-group-name /aws/lambda/AlexaProfesorUniversal --filter-pattern "ERROR" --region us-east-1
```

---

## Archivos que Más se Tocan

| Archivo | Cuándo editarlo |
|---------|----------------|
| `lambda/handlers/AskProfeIntentHandler.js` | Cambiar flujo principal de preguntas |
| `lambda/handlers/WolframAlphaModeIntentHandler.js` | Ajustar modo paso a paso |
| `lambda/services/apl.js` | Cambiar diseño visual APL |
| `lambda/services/claude.js` | Ajustar prompts de síntesis |
| `lambda/services/wolfram.js` | Optimizar consultas Wolfram |
| `lambda/config/timeouts.js` | Ajustar timeouts por servicio |
| `lambda/config/constants.js` | Cambiar límites UI, zoom, performance |
| `skill-package/interactionModels/custom/es-ES.json` | Agregar utterances |

---

## Patrones de Logs

```
[IN-ASK] Pregunta: "..." | T+0ms          ← Inicio del request
[KEYWORD] "sol" | T+55ms                  ← GPT extrajo keyword
[ROUTE] Detectada pregunta MATEMÁTICA     ← Ruta especializada activada
[WOLFRAM-MODE] DINAMICA | gracia=800ms    ← Modo dinámico con Wolfram
[WOLFRAM-MODE] ESTATICA | wiki=1200ch     ← Modo estático sin Wolfram
[WOLFRAM-LATE] imgs=4 | T+4200ms         ← Wolfram llegó tarde pero útil
[CACHE] HIT | T+120ms                    ← Cache S3 hit
[WOLF-MODE] ✅ OK 5800ms | paso 1-3/9   ← Step-by-step exitoso
[TOTAL] 5700ms                           ← Tiempo total del request
```

---

## Errores Comunes

| Log | Causa | Acción |
|-----|-------|--------|
| `ERR_TIMEOUT` | API externa lenta | Normal si es puntual, revisar si es frecuente |
| `ERR_PARSE` | Claude devolvió JSON inválido | Fallback automático, revisar prompt |
| `NO_PODS` | Wolfram no entendió la query | GPT re-intenta con notación diferente |
| `[APL] Error` | Directiva APL inválida | Revisar datasource en el handler |
| `[HISTORY] Error` | DynamoDB no disponible | No crítico, historial no se guarda |

---

## Variables de Entorno Requeridas

```
OPENAI_API_KEY      → GPT-4.1 Mini (keywords + conversión matemática)
WOLFRAM_APP_ID      → Wolfram Alpha Full Results API
GEMINI_API_KEY      → Gemini 2.0 Flash
CLAUDE_API_KEY      → Claude 4.5 Haiku (si no usas Bedrock directo)
ELEVENLABS_API_KEY  → Solo para modo secreto (opcional)
```

---

## Servicios AWS Requeridos

```
Lambda    → AlexaProfesorUniversal (us-east-1)
DynamoDB  → ProfesorUniversal-StepByStep
DynamoDB  → ProfesorUniversal-UserHistory
S3        → alexa-profesor-universal-cache-us-east-1
Bedrock   → Claude 4.5 Haiku (us-east-1)
```

---

## Testing

**Alexa Developer Console** → Test → escribir:
```
abre profesor universal
pregunta qué es la fotosíntesis
pregunta cuánto es la derivada de x al cuadrado
activa modo wolfram y escribe: x^2 + 2x + 1
modo oscuro
acercar
modo susurro
```

---

## Frases de Voz Disponibles

| Frase | Intent | Efecto |
|-------|--------|--------|
| "modo oscuro / modo claro" | DarkModeIntent | Cambia tema APL |
| "modo susurro / voz normal" | WhisperModeIntent | Toggle SSML whisper |
| "acercar / alejar" | ZoomIntent | Zoom ±10% (55–120%) |
| "modo wolfram" | WolframAlphaModeIntent | Activa step-by-step |
| "continúa" | ContinueWolframIntent | Siguiente página de pasos |
| "ir al resultado" | SkipToResultIntent | Salta al resultado final |
| "repite mi última pregunta" | RepeatLastQuestionIntent | Recupera historial |
| "ver más imágenes" | VerMasImagenesIntent | Siguiente lote NASA/Wiki |

---

## Emergencias

```powershell
# Skill no responde — verificar Lambda
aws lambda get-function-configuration --function-name AlexaProfesorUniversal --region us-east-1

# Rollback rápido
git revert HEAD
git push origin main

# Verificar variables de entorno
aws lambda get-function-configuration --function-name AlexaProfesorUniversal --region us-east-1 --query "Environment.Variables"
```

---

## Documentación Completa

| Doc | Contenido |
|-----|-----------|
| `docs/DOCUMENTACION_PROYECTO.md` | Arquitectura, AWS, despliegue, troubleshooting |
| `docs/QUE_HACE_CADA_COSA.md` | Cada archivo explicado, flujo de sesión |
| `docs/DIAGRAMA_ARQUITECTURA.md` | Diagramas ASCII de flujos y estructura |
| `docs/FLUJO-STEP-BY-STEP.md` | Reglas críticas de la API Wolfram SBS |
| `docs/MODO_SECRETO.md` | Las 7 voces ElevenLabs, deploy privado |
