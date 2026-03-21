# Referencia Rápida — Profesor Universal IA

## Deploy

```bash
git add .
git commit -m "feat: descripción"
git push private main
# GitHub Actions despliega automáticamente (~60s)
```

Verificar deploy:
```bash
aws lambda get-function --function-name AlexaProfesorUniversal --region us-east-1 --query "Configuration.[LastModified,LastUpdateStatus]" --output text
```

## Logs en tiempo real

```bash
aws logs tail /aws/lambda/AlexaProfesorUniversal --region us-east-1 --follow
```

## Test directo en Lambda

```powershell
# Crear payload (sin BOM)
$enc = New-Object System.Text.UTF8Encoding $false
$payload = @{ version="1.0"; session=@{...}; request=@{...} } | ConvertTo-Json -Depth 10 -Compress
[System.IO.File]::WriteAllText("payload.json", $payload, $enc)

# Invocar
aws lambda invoke --function-name AlexaProfesorUniversal --region us-east-1 --cli-binary-format raw-in-base64-out --payload fileb://payload.json response.json
```

## Sincronizar .env → Lambda

```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

## Datos clave

| Dato | Valor |
|---|---|
| Skill ID | `amzn1.ask.skill.91893f76-ab13-4ee2-ad95-d803f3434ee5` |
| Lambda ARN | `arn:aws:lambda:us-east-1:811710375370:function:AlexaProfesorUniversal` |
| S3 Bucket | `alexa-profesor-universal-cache-us-east-1` |
| Wolfram App ID | `6U3PEET6LV` (acceso Blake Gilbert) |
| Claude modelo | `us.anthropic.claude-haiku-4-5-20251001-v1:0` |
| Deadline global | 7850ms |

## Frases de prueba

| Frase | Ruta activada |
|---|---|
| `cuál es la derivada de equis al cuadrado por el seno de equis` | Matemática |
| `cuánto es la integral de tres seno de equis mas equis al cuadrado` | Matemática |
| `modo wolfram, derivada de x al cuadrado` | Wolfram SBS (voz) |
| `continúa` | Paginación SBS |
| `qué es un agujero negro` | Científica |
| `quién fue Simón Bolívar` | General estático |
| `cuánto cuesta el dólar hoy` | General dinámico |
| `la palabra es Boaz` | Modo secreto |
| `repite mi última pregunta` | Historial |
| `modo oscuro` / `modo claro` | UI |
| `acercar` / `alejar` | Zoom APL |

## Marcadores de log importantes

```
[IN-ASK]        — slot capturado de Alexa
[ROUTE]         — ruta detectada (MATEMÁTICA / CIENTÍFICA)
[GPT-KW]        — keyword extraído (FAST PATH o GPT call)
[KEYWORD-MATH]  — keyword normalizado para mathRoute
[MATH-ROUTE]    — tiempos de Wolfram y Claude en ruta matemática
[WOLFRAM]       — llamada a Wolfram Alpha
[WOLFRAM-STEP]  — llamada 2 de Wolfram (SBS)
[CLAUDE-BEDROCK]— llamada a Claude
[WOLF-MODE]     — WolframAlphaModeIntentHandler
[CACHE]         — hit/miss de caché S3
[TOTAL]         — tiempo total del request
```

## Estructura de sessionAttributes (matemática)

```js
lastKeyword          // "derivative of x^2 * sin(x)"
lastStepByStepData   // [{input, podId, isPrimary}] — para botón SBS
lastImagenes         // pods normales de Wolfram (hasta 12)
lastImagenesPasos    // [] — siempre vacío (lazy loading)
lastDisplayTop       // título APL formateado
lastDisplayBottom    // resumen del proceso (Claude)
canStepByStep        // true si Wolfram detectó podstates
wolframData          // inyectado por botón APL antes de WolframAlphaModeIntentHandler
currentWolframStep   // índice de paginación SBS
```
