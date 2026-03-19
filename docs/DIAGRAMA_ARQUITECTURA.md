# Diagramas de Arquitectura — Profesor Universal IA

---

## Arquitectura General

```
┌──────────┐    ┌─────────┐    ┌──────────────────────────────────────┐
│ Usuario  │───▶│  Alexa  │───▶│  AWS Lambda — AlexaProfesorUniversal │
└──────────┘    └─────────┘    └──────────────────────────────────────┘
                                                    │
                               ┌────────────────────┼────────────────────┐
                               ▼                    ▼                    ▼
                         mathRoute.js         scienceRoute.js    AskProfeIntent
                         (ecuaciones)         (física/química)   (general)
                               │                    │                    │
                               └────────────────────┴────────────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    ▼               ▼               ▼               ▼               ▼
              Wolfram Alpha     Wikipedia        Gemini          NASA/Wiki       Claude
              (datos+gráficas)  (enciclopedia)  (contexto web)  (imágenes)     (síntesis)
                    │               │               │               │               │
                    └───────────────┴───────────────┴───────────────┴───────────────┘
                                                    │
                                          ┌─────────▼─────────┐
                                          │  Respuesta Final   │
                                          │  Speech (SSML)     │
                                          │  APL (visual)      │
                                          └───────────────────┘
```

---

## Flujo Detallado por Modo

### Modo ESTÁTICO (preguntas conceptuales — ~5.7s)

```
T+0ms    ┌─ Recibe AskProfeIntent
T+55ms   ├─ GPT extrae keyword
T+60ms   ├─ Wikipedia responde (rápido ~60ms)
         │   Claude arranca en paralelo con datos parciales
T+2500ms ├─ Gemini responde (llega tarde → displayBottom)
T+5500ms ├─ Claude completa síntesis
T+5600ms └─ APL + respuesta enviada
```

### Modo DINÁMICO (datos actualizados, cálculos — ~7.0s)

```
T+0ms    ┌─ Recibe AskProfeIntent (detecta NECESITA_WOLFRAM_RE)
T+55ms   ├─ GPT extrae keyword
T+1500ms ├─ Wiki + Gemini en paralelo
T+2300ms ├─ Wolfram con gracia 800ms (1500ms si es cálculo numérico)
T+5500ms ├─ Claude sintetiza con todos los datos
T+5700ms └─ APL + respuesta enviada
```

### Modo STEP-BY-STEP (matemáticas paso a paso — ~6.0s)

```
T+0ms    ┌─ WolframAlphaModeIntent (o botón APL)
         │
         │  Si viene del botón APL:
         │  └─ Datos ya inyectados en sesión → saltar a paginación
         │
         │  Si es nueva consulta:
T+800ms  ├─ GPT convierte "derivada de 3x²" → "derivative of 3x^2"
T+1000ms ├─ Llamada 1 Wolfram: pods normales + detecta podstate SBS
T+3500ms ├─ Llamada 2 Wolfram: expande pod primary:true con pasos
T+3500ms ├─ Guarda en DynamoDB (sessionId, allSteps, totalSteps)
T+5000ms ├─ Claude explica pasos 1-3 en español
T+5200ms └─ APL: 3 pasos + botones [Continuar] [Ir al resultado]
         │
         │  Continuación (di "continúa"):
T+0ms    ├─ Lee DynamoDB → nextPage
T+1500ms └─ Claude explica siguientes 3 pasos
```

---

## Infraestructura AWS

```
┌─────────────────────────────────────────────────────────────────┐
│                         us-east-1                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Lambda — AlexaProfesorUniversal                        │   │
│  │  Node.js 20.x | 1024MB | timeout 15s                   │   │
│  │  Deploy: GitHub Actions (automático en push a main)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌──────────────┐   ┌──────────────────┐   ┌─────────────┐    │
│  │  DynamoDB    │   │       S3         │   │   Bedrock   │    │
│  │              │   │                  │   │             │    │
│  │ StepByStep   │   │ cache/ (TTL 7d)  │   │ Claude 4.5  │    │
│  │ (TTL 24h)    │   │ logos/ (público) │   │ Haiku       │    │
│  │ UserHistory  │   │                  │   │             │    │
│  │ (TTL 90d)    │   │                  │   │             │    │
│  └──────────────┘   └──────────────────┘   └─────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Caché en Capas

```
Request entrante
      │
      ▼
┌─────────────┐   HIT → respuesta inmediata (~200ms)
│  LRU Memory │
└─────────────┘
      │ MISS
      ▼
┌─────────────┐   HIT → re-consulta Wolfram para imágenes frescas (~1.5s)
│  S3 Cache   │         (URLs Wolfram expiran ~1-2h)
└─────────────┘
      │ MISS
      ▼
┌─────────────────────────────────────────────────────┐
│  Consulta completa a todas las IAs (~5.7–7.0s)      │
│  → Guarda en S3 si es cacheable                     │
└─────────────────────────────────────────────────────┘
```

---

## APL — Estructura Visual

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER (106dp)                                             │
│  Título del tema                                            │
│  [GitHub][AWS][Claude][Wolfram][NASA][Alexa][OpenAI][Gemini]│
├─────────────────────────────────────────────────────────────┤
│  SEQUENCE (scroll vertical, snap:start)                     │
│                                                             │
│  ┌─ textoSuperior (displayTop de Claude)                   │
│  │                                                         │
│  ├─ Logo dinámico Wolfram ← solo si fuenteWolfram=true     │
│  │                                                         │
│  ├─ Pods Wolfram (data-binding, zoom dinámico)             │
│  │   Pod 1 | Pod 2 | Pod 3 ...                            │
│  │                                                         │
│  ├─ Badge Wikipedia ← solo si fuenteWikipedia=true         │
│  │                                                         │
│  ├─ [▶ Iniciar Paso a Paso] ← canStepByStep && !masPasos  │
│  ├─ [⏩ Ver Siguientes Pasos] ← masPasosDisponibles        │
│  ├─ [🎯 Ir al Resultado] ← masPasosDisponibles            │
│  │                                                         │
│  ├─ textoInferior (displayBottom de Claude)                │
│  │                                                         │
│  ├─ Imágenes NASA/Wikimedia ← si no hay pods Wolfram       │
│  └─ [📷 Ver más imágenes] ← hayMasImagenes                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  CONTROLES (fijos abajo)                                    │
│  [－ Alejar] [＋ Acercar] [◐ Modo] [🤫 Susurro]           │
├─────────────────────────────────────────────────────────────┤
│  FOOTER (26dp) — Claude · Wolfram · Wikipedia · Gemini     │
└─────────────────────────────────────────────────────────────┘
```

---

## CI/CD

```
Desarrollador
     │
     │  git push private main  (deploy principal con modo secreto)
     ▼
GitHub Actions (.github/workflows/deploy-lambda-private.yml)
     │
     ├─ npm install (lambda/)
     ├─ zip lambda/ (incluye archivos secretos)
     └─ aws lambda update-function-code → AlexaProfesorUniversal
                                               │
                                               ▼
                                    Lambda actualizada (~30s)

Repo público (portfolio, opcional):
     │
     │  git push origin main
     ▼
GitHub Actions (.github/workflows/ci.yml)
     └─ node --check index.js + npm audit (solo validación, NO deploya a Lambda)
```

### Pre-push hook (protección modo secreto)

Archivo: `.git/hooks/pre-push` — **no se sube a GitHub**, recrear manualmente si se clona el repo.

```sh
#!/bin/sh
# Bloquea push al repo público si hay archivos del modo secreto trackeados
REMOTE_URL="$2"
if echo "$REMOTE_URL" | grep -q "Alexa-ProfesorUniversal-private"; then exit 0; fi
SECRET_FILES="lambda/handlers/SecretRouteIntentHandler.js lambda/handlers/artesLiberalesRoutes.js lambda/services/elevenlabs.js"
FOUND=""
for f in $SECRET_FILES; do
    if git ls-files --error-unmatch "$f" 2>/dev/null; then FOUND="$FOUND $f"; fi
done
if [ -n "$FOUND" ]; then
    echo "❌ PUSH BLOQUEADO — archivos secretos trackeados:$FOUND"
    echo "Ejecuta: git rm --cached [archivo] && git commit"
    exit 1
fi
exit 0
```
