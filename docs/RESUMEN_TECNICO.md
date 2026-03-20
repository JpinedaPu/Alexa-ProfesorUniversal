# Resumen Técnico - Profesor Universal IA

## Arquitectura General

### Stack Tecnológico
- **Runtime:** Node.js 20.x en AWS Lambda
- **Región:** us-east-1 (N. Virginia)
- **Timeout Lambda:** 15s (Alexa corta a 8s, optimizado para <7.8s)
- **Memory:** 1024 MB
- **CI/CD:** GitHub Actions automático

### Fuentes de Conocimiento (7)
1. **Wolfram Alpha** - Datos técnicos, matemáticos, pods visuales
2. **Wikipedia** - Respaldo enciclopédico y biográfico
3. **Claude 4.5 Haiku** (Bedrock) - Síntesis de voz carismática
4. **Gemini 2.0 Flash Lite** - Contexto especializado y búsqueda web
5. **GPT-4.1 Mini** - Lógica auxiliar y traducciones
6. **NASA Images API** - Imágenes científicas de dominio público
7. **Wikimedia Commons** - Imágenes educativas libres

### Infraestructura AWS

#### Lambda
- **Función:** `AlexaProfesorUniversal`
- **ARN:** `arn:aws:lambda:us-east-1:811710375370:function:AlexaProfesorUniversal`
- **Deployment:** Automático via GitHub Actions en push a `main` con cambios en `lambda/**`

#### DynamoDB (us-east-1)
- **ProfesorUniversal-StepByStep:** Caché matemático paso a paso (TTL 24h)
- **ProfesorUniversal-UserHistory:** Historial de preguntas (últimas 5 por usuario, TTL 90 días)

#### S3 (us-east-1)
- **Bucket:** `alexa-profesor-universal-cache-us-east-1`
- **Paths:**
  - `/cache/` - Caché de preguntas conceptuales
  - `/logos/` - Logos públicos para APL
  - `/audio/premium/` - Audio premium ElevenLabs (modo secreto)

## Flujo de Respuesta

### 1. Pregunta Conceptual (Normal)
```
Usuario → AskProfeIntent → index.js
  ↓
Verificar caché S3 (key: hash de pregunta)
  ↓ MISS
Detectar tipo: conceptual vs matemático
  ↓ Conceptual
Wolfram Alpha (timeout 3s)
  ↓ Si falla o insuficiente
Wikipedia (timeout 2s)
  ↓
Claude síntesis (timeout 2s)
  ↓
Guardar en caché S3
  ↓
APL + SSML → Alexa
```

### 2. Pregunta Matemática (Wolfram Mode)
```
Usuario → WolframAlphaModeIntent
  ↓
Verificar caché DynamoDB (sessionId + pregunta)
  ↓ MISS
Wolfram Alpha step-by-step (timeout 4s)
  ↓
Guardar en DynamoDB
  ↓
Mostrar primeros 3 pasos
  ↓
Usuario: "continúa" → ContinueWolframIntent
  ↓
Leer siguiente chunk de DynamoDB
  ↓
Mostrar siguientes 3 pasos
```

### 3. Modo Secreto (Artes Liberales)
```
Usuario → "la palabra es Boaz" → SecretRouteIntent
  ↓
sessionAttributes.modoSecreto = true
  ↓
Maestro Masón bienvenida (voz ElevenLabs Daniel)
  ↓
Usuario → "maestro de geometría" → ArteLiberalIntent
  ↓
Claude con prompt especializado (timeout 4s)
  ↓
ElevenLabs síntesis voz Bella (timeout 10s)
  ↓
Subir MP3 a S3 /audio/premium/
  ↓
APL + <audio src="s3_url"/> → Alexa
```

## Timeouts y Optimización

### Budget Total: 7.8s
- **Wolfram Alpha:** 3-4s (timeout 3s normal, 4s step-by-step)
- **Wikipedia:** 1-2s (timeout 2s)
- **Claude:** 1-2s (timeout 2s normal, 4s modo secreto)
- **ElevenLabs:** 2-3s (timeout 10s, speech acortado a ~140 chars)
- **Overhead Lambda:** 0.5-1s

### Estrategias de Optimización
1. **Caché S3** para preguntas repetidas (hit rate ~30%)
2. **Caché DynamoDB** para step-by-step matemático
3. **Timeouts agresivos** con fallbacks
4. **Respuestas concisas** (<300 chars para síntesis rápida)
5. **Parallel requests** cuando es posible

## Variables de Entorno (Lambda)

```bash
# IAs
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
# Claude usa Bedrock (IAM role, no API key)

# Servicios
WOLFRAM_APP_ID=...
ELEVENLABS_API_KEY=... # Solo modo secreto

# AWS (automático en Lambda)
AWS_REGION=us-east-1
```

## Deployment

### Público (deploy-lambda.yml)
```bash
git add lambda/
git commit -m "feat: nueva funcionalidad"
git push origin main
```
**Excluye:** SecretRouteIntentHandler, artesLiberalesRoutes, elevenlabs

### Privado (deploy-lambda-private.yml)
```bash
# Trigger manual desde GitHub Actions
# O push desde repo privado con archivos secretos
```
**Incluye:** Todos los archivos, incluyendo modo secreto

## Archivos Clave

### Handlers
- `AskProfeIntentHandler.js` - Pregunta general
- `WolframAlphaModeIntentHandler.js` - Modo matemático
- `ContinueWolframIntentHandler.js` - Continuar step-by-step
- `SkipToResultIntentHandler.js` - Saltar al resultado
- `RepeatLastQuestionIntentHandler.js` - Repetir última pregunta
- `SecretRouteIntentHandler.js` - Modo secreto (privado)

### Services
- `claude.js` - Bedrock Claude 4.5 Haiku
- `gpt.js` - OpenAI GPT-4.1 Mini
- `gemini.js` - Google Gemini 2.0 Flash Lite
- `wolfram.js` - Wolfram Alpha API
- `wikipedia.js` - Wikipedia API
- `elevenlabs.js` - ElevenLabs TTS (privado)

### Utils
- `cache.js` - Caché S3
- `dynamoCache.js` - Caché DynamoDB
- `userHistory.js` - Historial de usuario
- `timeoutManager.js` - Gestión de timeouts
- `ambiguityDetector.js` - Detección de ambigüedad
- `fallback.js` - Estrategias de fallback

## Políticas IAM

### Lambda Execution Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::alexa-profesor-universal-cache-us-east-1/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/ProfesorUniversal-StepByStep",
        "arn:aws:dynamodb:us-east-1:*:table/ProfesorUniversal-UserHistory"
      ]
    }
  ]
}
```

### S3 Bucket Policy (Audio Premium)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadAudioPremium",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::alexa-profesor-universal-cache-us-east-1/audio/premium/*"
    }
  ]
}
```

## Testing

### Manual (Alexa Developer Console)
1. Ir a https://developer.amazon.com/alexa/console/ask
2. Seleccionar skill "Profesor Universal"
3. Tab "Test" → Activar testing en "Development"
4. Probar con voz o texto

### Eventos de Test (test-events/)
```bash
# Ejecutar todos los tests
.\scripts\run-all-tests.ps1

# Ejecutar tests de cadena
.\scripts\run-chain-tests.ps1
```

## Logs y Debugging

### CloudWatch Logs
```bash
aws logs tail /aws/lambda/AlexaProfesorUniversal --follow
```

### Formato de Logs
```
[SKILL] ⏩ Intent capturado
[CACHE] ✅ HIT | ❌ MISS
[WOLFRAM] ⏱️ Timeout | ✅ Success
[CLAUDE] 🎯 Respuesta generada
[ELEVENLABS] Audio generado en Xms
```

## Métricas Clave

- **Tiempo promedio de respuesta:** 4-6s
- **Cache hit rate:** ~30%
- **Tasa de éxito Wolfram:** ~85%
- **Fallback a Wikipedia:** ~15%
- **Timeout rate:** <5%

## Troubleshooting

### "No puedo conectar con el URI del archivo de audio"
- Verificar bucket policy S3 para `/audio/premium/*`
- Verificar que ElevenLabs API key esté configurada
- Verificar que el audio se subió correctamente a S3

### "La respuesta tardó demasiado"
- Verificar timeouts de servicios externos
- Revisar logs de CloudWatch para identificar cuello de botella
- Considerar acortar respuestas de Claude

### "Boaz" no activa el modo secreto
- Verificar que utterances estén en `es-ES.json`
- Usar frases completas: "la palabra es Boaz"
- Verificar que `SecretRouteIntent` esté registrado

## Contacto y Soporte

- **GitHub Issues:** https://github.com/JpinedaPu/AlexaProfesorUniversal/issues
- **Discussions:** https://github.com/JpinedaPu/AlexaProfesorUniversal/discussions
- **Skill ID:** amzn1.ask.skill.91893f76-ab13-4ee2-ad95-d803f3434ee5
