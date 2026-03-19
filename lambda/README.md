# Lambda — Profesor Universal IA

Código de producción desplegado en AWS Lambda `us-east-1`.  
Deploy automático vía GitHub Actions al hacer push a `main`.

## Estructura

```
lambda/
├── index.js                          ← Punto de entrada + handlers sistema/APL
├── handlers/
│   ├── AskProfeIntentHandler.js      ← Flujo principal de preguntas
│   ├── WolframAlphaModeIntentHandler.js ← Modo matemático paso a paso
│   ├── ContinueWolframIntentHandler.js  ← Paginación de pasos
│   ├── SkipToResultIntentHandler.js     ← Saltar al resultado final
│   ├── RepeatLastQuestionIntentHandler.js
│   ├── mathRoute.js                  ← Detección y ruta matemática
│   └── scienceRoute.js               ← Ruta científica
├── services/
│   ├── apl.js                        ← Generador APL 1.6
│   ├── claude.js                     ← Claude 4.5 Haiku vía Bedrock
│   ├── gpt.js                        ← GPT-4.1 Mini (keywords)
│   ├── gemini.js                     ← Gemini 2.0 Flash
│   ├── wolfram.js                    ← Wolfram Alpha (normal + SBS)
│   ├── wikipedia.js
│   └── traduccion.js
├── utils/
│   ├── cache.js / s3Cache.js / dynamoCache.js
│   ├── userHistory.js / imagenesExtra.js
│   ├── timeoutManager.js / fallback.js
│   ├── validateResponse.js / inputValidator.js
│   ├── mathNotation.js / comparacion.js
│   ├── reconstruccionPregunta.js / cacheabilityAnalyzer.js
│   └── logger.js
└── config/
    ├── constants.js
    └── timeouts.js
```

## Variables de Entorno

```
OPENAI_API_KEY    WOLFRAM_APP_ID    GEMINI_API_KEY    CLAUDE_API_KEY
```

Sincronizar con Lambda:
```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

## Deploy

```bash
git add . && git commit -m "feat: descripción" && git push origin main
```

## Documentación

Ver `docs/` en la raíz del proyecto:
- `DOCUMENTACION_PROYECTO.md` — arquitectura, AWS, troubleshooting
- `QUE_HACE_CADA_COSA.md` — cada archivo explicado
- `DIAGRAMA_ARQUITECTURA.md` — flujos y diagramas
- `FLUJO-STEP-BY-STEP.md` — reglas críticas API Wolfram SBS
- `REFERENCIA_RAPIDA.md` — comandos y referencia diaria
