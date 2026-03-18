# Lambda - Profesor Universal IA

Código de producción desplegado en AWS Lambda `us-east-1`.

## Estructura

```
lambda/
├── index.js                  # Handler principal
├── handlers/
│   ├── AskProfeIntentHandler.js
│   ├── WolframAlphaModeIntentHandler.js
│   ├── ContinueWolframIntentHandler.js
│   └── RepeatLastQuestionIntentHandler.js
├── services/
│   ├── apl.js                # Generación APL visual
│   ├── claude.js             # Claude 4.5 vía Bedrock
│   ├── gemini.js             # Gemini 2.0 Flash
│   ├── gpt.js                # GPT-4.1 Mini
│   ├── wolfram.js            # Wolfram Alpha
│   ├── wikipedia.js          # Wikipedia
│   └── traduccion.js
├── utils/
│   ├── cache.js
│   ├── cacheabilityAnalyzer.js
│   ├── dynamoCache.js
│   ├── s3Cache.js
│   ├── imagenesExtra.js
│   ├── userHistory.js
│   ├── timeoutManager.js
│   ├── fallback.js
│   ├── logger.js
│   ├── validateResponse.js
│   ├── comparacion.js
│   └── reconstruccionPregunta.js
├── config/
│   ├── constants.js
│   └── timeouts.js
└── package.json
```

## Variables de entorno (AWS Lambda)

- `OPENAI_API_KEY`
- `WOLFRAM_APP_ID`
- `GEMINI_API_KEY`
- `CLAUDE_API_KEY`

**NUNCA** hardcodear keys en el código. Usar el script de sincronización:

```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

## Deploy

Automático vía GitHub Actions al hacer push a `main` en `lambda/**`.

```powershell
git add .
git commit -m "feat: descripción"
git push origin main
```
