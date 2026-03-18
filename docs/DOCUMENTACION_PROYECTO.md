# Documentación Técnica - Profesor Universal IA

**Versión:** 7.7.0  
**Última actualización:** 15 de Marzo, 2026  
**Estado:** Producción

---

## 📋 Índice

1. [Arquitectura](#arquitectura)
2. [Despliegue](#despliegue)
3. [Configuración](#configuración)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)
6. [Recursos AWS](#recursos-aws)
7. [Certificación Alexa](#certificación-alexa)

---

## 🏗️ Arquitectura

### Dos Versiones del Proyecto

#### 1. Lambda Propia (`.ask/lambda/`) — PRODUCCIÓN ACTIVA

```
Runtime: Node.js 20.x
Región: us-east-1 (N. Virginia)
Función: AlexaProfesorUniversal
Deploy: GitHub Actions (automático)
Timeout: 15s (Lambda) / 8s (Alexa límite real)
Memory: 1024MB
```

**Características:**
- ✅ AWS SDK v3
- ✅ Optional chaining (`?.`)
- ✅ Variables de entorno
- ✅ S3 Cache + DynamoDB
- ✅ Deploy automático con GitHub Actions

#### 2. Alexa Hosted (`alexa-hosted-version/`) — DESARROLLO/PRUEBAS

```
Runtime: Node.js 16.x (legacy)
AWS SDK: v2 (no v3)
Deploy: Manual en Alexa Developer Console
Timeout: 8s (fijo)
Memory: 512MB (fijo)
```

**Limitaciones:**
- ❌ No soporta optional chaining (`?.`)
- ❌ No soporta AWS SDK v3
- ❌ No soporta variables de entorno nativas
- ❌ API keys hardcodeadas en código
- ❌ Sin acceso a DynamoDB/S3

**Cuándo usar cada versión:**
- **Lambda propia:** Producción, features completas, escalabilidad
- **Alexa Hosted:** Pruebas rápidas, demos, desarrollo inicial

---

### Stack Tecnológico

```
Inteligencia Artificial:
├── Claude 4.5 Haiku (Amazon Bedrock) — Síntesis de voz natural
├── GPT-4o-mini (OpenAI) — Extracción de keywords
├── Gemini 2.5 Flash (Google) — Contexto web actualizado
├── Wolfram Alpha Full Results API — Datos técnicos + gráficas
└── Wikipedia API — Contexto enciclopédico

Infraestructura AWS (Lambda propia):
├── Lambda (us-east-1) — Función principal
├── S3 — Cache de respuestas conceptuales (TTL 7 días)
├── DynamoDB — Historial usuario + step-by-step cache (TTL 24h)
├── CloudWatch — Logs y métricas
└── IAM — Roles y permisos

GitHub Actions:
└── Deploy automático al hacer push a main
```

---

### Estructura de Archivos

#### Lambda Propia (`.ask/lambda/`)

```
.ask/lambda/
├── services/          ← Integraciones IA
│   ├── claude.js      (Amazon Bedrock)
│   ├── gpt.js         (OpenAI)
│   ├── wolfram.js     (Wolfram Alpha)
│   ├── wikipedia.js   (Wikipedia API)
│   ├── geminiWebSearch.js (Google Gemini)
│   └── traduccion.js  (Google Translate)
├── utils/             ← Herramientas
│   ├── apl.js         (Interfaz visual APL)
│   ├── cache.js       (LRU cache en memoria)
│   ├── s3Cache.js     (Cache persistente S3)
│   ├── dynamoCache.js (Cache step-by-step)
│   ├── userHistory.js (Historial DynamoDB)
│   ├── cacheabilityAnalyzer.js
│   ├── fallback.js
│   ├── timeoutManager.js
│   └── ...
├── handlers/          ← Lógica de intents
│   ├── AskProfeIntentHandler.js
│   ├── WolframAlphaModeIntentHandler.js
│   ├── ContinueWolframIntentHandler.js
│   └── RepeatLastQuestionIntentHandler.js
├── config/            ← Configuración centralizada
│   ├── constants.js
│   └── timeouts.js
└── index.js           ← Punto de entrada
```

#### Alexa Hosted (`alexa-hosted-version/`)

Misma estructura pero:
- AWS SDK v2 (no v3)
- Sin optional chaining
- API keys hardcodeadas en `services/`
- Sin `s3Cache.js` ni `dynamoCache.js`

---

## 🚀 Despliegue

### Método 1: Deploy Automático (Lambda Propia) — RECOMENDADO

```powershell
# Desde la raíz del proyecto
.\scripts\deploy.ps1 "feat: descripción del cambio"
```

**Flujo automático:**
```
1. Git add + commit + push
2. GitHub Actions detecta cambios en .ask/lambda/**
3. Instala dependencias (npm install)
4. Empaqueta código + node_modules
5. Despliega a Lambda AlexaProfesorUniversal (us-east-1)
6. Actualización completa en ~60 segundos
```

**Ver progreso:**
https://github.com/JpinedaPu/alexa-profesor-matematico/actions

### Método 2: Deploy Manual (Alexa Hosted)

```
1. Ir a: https://developer.amazon.com/alexa/console/ask
2. Seleccionar skill "Profesor Universal IA"
3. Code → Copiar archivos de alexa-hosted-version/
4. Deploy (botón superior)
5. Esperar ~30 segundos
```

**IMPORTANTE:** 
- Usar archivos de `alexa-hosted-version/` (no `.ask/lambda/`)
- No copiar archivos con optional chaining (`?.`)
- No copiar archivos con AWS SDK v3

---

## 🔐 Configuración

### Variables de Entorno (Lambda Propia)

#### Opción A: Script Automático

```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

Este script lee `.ask/lambda/.env` y configura las variables en AWS Lambda.

#### Opción B: AWS Console Manual

```
1. AWS Console → Lambda → AlexaProfesorUniversal
2. Configuration → Environment variables → Edit
3. Agregar:
   - OPENAI_API_KEY=sk-proj-...
   - WOLFRAM_APP_ID=...
   - GEMINI_API_KEY=AIza...
   - CLAUDE_API_KEY=sk-ant-... (opcional si usas Bedrock)
4. Save
```

#### Opción C: AWS CLI

```bash
aws lambda update-function-configuration \
  --function-name AlexaProfesorUniversal \
  --region us-east-1 \
  --environment "Variables={
    OPENAI_API_KEY=sk-proj-...,
    WOLFRAM_APP_ID=...,
    GEMINI_API_KEY=AIza...,
    NODE_ENV=production
  }"
```

### API Keys (Alexa Hosted)

Las keys van **hardcodeadas** en:
- `alexa-hosted-version/services/claude.js`
- `alexa-hosted-version/services/gpt.js`
- `alexa-hosted-version/services/wolfram.js`
- `alexa-hosted-version/services/geminiWebSearch.js`

**Nota:** Esto es aceptable porque:
- Repositorio privado
- Alexa Hosted no soporta variables de entorno
- Solo para desarrollo/pruebas

---

## 🧪 Testing

### Tests Locales (Lambda Propia)

```powershell
# Ejecutar todos los tests
.\scripts\test-all.ps1

# Test individual
aws lambda invoke `
  --function-name AlexaProfesorUniversal `
  --region us-east-1 `
  --payload file://.ask/lambda/test-events/01-ask-fotosintesis.json `
  response.json
```

**Tests incluidos:**
1. Cache S3 MISS (primera consulta)
2. Cache S3 HIT (consulta repetida) — 16% más rápido
3. Pregunta no cacheable (cálculo)
4. Step-by-step primera consulta
5. Step-by-step continuación — 61% más rápido
6. Historial de usuario

### Simulador Alexa

```
1. Alexa Developer Console → Test
2. Activar: "Development"
3. Escribir: "abre profesor universal"
4. Probar preguntas:
   - "¿Qué es la fotosíntesis?"
   - "¿Cuánto es 25 por 47?"
   - "Resuelve x al cuadrado más 2x más 1"
```

---

## ⚡ Optimizaciones

### Presupuesto de Tiempo (Lambda Propia)

```
LÍMITE ALEXA: 8000ms
DEADLINE INTERNO: 7700ms (margen 300ms)

├─ Keyword extraction: ~400ms (GPT-4o-mini)
├─ Wiki + Gemini: ~1500ms (paralelo)
├─ Wolfram (condicional):
│  ├─ Pregunta estática: 0ms (Claude arranca sin esperar)
│  └─ Pregunta dinámica: 0-2000ms (gracia de 800ms)
├─ Claude síntesis: ~2900ms
└─ Margen seguridad: ~900ms
────────────────────────────────
TOTAL: ~6700ms ✅
```

### Optimizaciones Implementadas

| Optimización | Ganancia |
|--------------|----------|
| Wolfram condicional (estático vs dinámico) | +700ms budget Claude |
| Gemini 2.5-flash → 2.0-flash | -2200ms latencia |
| Cache S3 conceptual | 16% más rápido |
| Cache DynamoDB step-by-step | 61% más rápido |
| Keep-alive sockets (50→5) | -90% memory overhead |
| Timeouts optimizados | -38% tiempo total |

---

## 🐛 Troubleshooting

### Error: "API KEY no configurada"

**Causa:** Variables de entorno no configuradas en Lambda  
**Solución:**
```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

### Error: "Optional chaining not supported" (Alexa Hosted)

**Causa:** Código de `.ask/lambda/` copiado a Alexa Hosted  
**Solución:** Usar archivos de `alexa-hosted-version/` que no usan `?.`

### Error: "Cannot find module '@aws-sdk/client-bedrock-runtime'"

**Causa:** Falta instalar dependencias  
**Solución:**
```bash
cd .ask/lambda
npm install
```

### Error: "Timeout after 8000ms"

**Causa:** Wolfram o Claude tardando demasiado  
**Solución:** Ya optimizado con:
- Timeouts dinámicos
- Gracia condicional para Wolfram
- Claude arranca con datos parciales

### Error: "Access Denied" en S3/DynamoDB

**Causa:** IAM role sin permisos  
**Solución:**
```bash
# Verificar permisos
aws lambda get-function-configuration \
  --function-name AlexaProfesorUniversal \
  --region us-east-1 \
  --query 'Role'

# Agregar políticas necesarias en IAM Console
```

---

## 📊 Recursos AWS

### Lambda
- **Nombre:** AlexaProfesorUniversal
- **Región:** us-east-1
- **ARN:** `arn:aws:lambda:us-east-1:811710375370:function:AlexaProfesorUniversal`
- **Runtime:** Node.js 20.x
- **Timeout:** 15s (Lambda) / 8s (Alexa límite real)
- **Memory:** 1024MB
- **Cuenta:** 811710375370

### DynamoDB

**ProfesorUniversal-StepByStep** (us-east-1)
- Partition Key: `sessionId` (String)
- TTL: 24 horas
- Uso: Cache de soluciones paso a paso

**ProfesorUniversal-UserHistory** (us-east-1)
- Partition Key: `userId` (String)
- Uso: Últimas 5 preguntas por usuario

### S3

**alexa-profesor-universal-cache** (us-east-1)
- `logos/`: Logos públicos (GitHub, AWS, Claude, NASA, Alexa, OpenAI, Gemini)
- `cache/`: Respuestas cacheadas (privado, TTL 7 días)

### IAM

**Role:** `AlexaProfesorUniversal-role-1xqb12bn`

**Políticas:**
- AWSLambdaBasicExecutionRole
- DynamoDB Full Access
- S3 Full Access
- Bedrock Claude Access

---

## 🔧 Comandos Útiles

### Logs en CloudWatch

```powershell
# Ver logs en tiempo real
aws logs tail /aws/lambda/AlexaProfesorUniversal --follow --region us-east-1

# Buscar errores
aws logs filter-log-events `
  --log-group-name /aws/lambda/AlexaProfesorUniversal `
  --filter-pattern "ERROR" `
  --region us-east-1
```

### Verificar Configuración

```powershell
# Variables de entorno
aws lambda get-function-configuration `
  --function-name AlexaProfesorUniversal `
  --region us-east-1 `
  --query 'Environment.Variables'

# Última versión desplegada
aws lambda get-function `
  --function-name AlexaProfesorUniversal `
  --region us-east-1 `
  --query 'Configuration.{LastModified:LastModified,CodeSize:CodeSize}'
```

---

## 🎓 Certificación Alexa

### Privacy & Compliance

**Respuestas para Distribution → Privacy & Compliance:**

1. **Does this skill allow users to make purchases?**
   - ❌ No

2. **Does this skill collect users' personal information?**
   - ❌ No
   - Nota: Código postal opcional no se almacena

3. **Is this skill directed to children under 13?**
   - ❌ No

4. **Does this skill contain advertising?**
   - ❌ No

### Permisos

- ✅ **Device Address** → Country & Postal Code Only
- Uso: Preguntas sobre duración del sol en ubicación del usuario

### Export Compliance

- ✅ This skill does not use encryption subject to US Export Regulations

### URLs Requeridas

**Privacy Policy:**
```
https://jpinedapu.github.io/alexa-profesor-matematico/privacy-policy.html
```

**Terms of Use:**
```
https://jpinedapu.github.io/alexa-profesor-matematico/terms-of-use.html
```

### Testing Instructions

```
Esta skill no requiere vinculación de cuentas ni autenticación.

INSTRUCCIONES DE PRUEBA:
1. Di: "Alexa, abre profesor universal"
2. Pregunta: "¿Quién es el presidente de Estados Unidos?"
3. La skill responderá con información actualizada.

OTRAS PREGUNTAS DE PRUEBA:
- "¿Cuánto es 25 por 47?"
- "¿Qué es la fotosíntesis?"
- "Resuelve x al cuadrado más 2x más 1"
- "¿Cuánto dura el sol en Bogotá?"

PERMISOS:
- Código postal (opcional): solo para preguntas sobre duración del sol
- No se requieren dispositivos especiales

MARCAS REGISTRADAS:
Esta skill utiliza APIs públicas de Wolfram Alpha, Wikipedia, 
Google Gemini y Anthropic Claude conforme a sus términos de uso.
```

---

## 🔗 Enlaces Útiles

- **Alexa Developer Console:** https://developer.amazon.com/alexa/console/ask
- **AWS Lambda Console:** https://console.aws.amazon.com/lambda/
- **GitHub Actions:** https://github.com/JpinedaPu/alexa-profesor-matematico/actions
- **OpenAI API Keys:** https://platform.openai.com/api-keys
- **Wolfram Alpha Apps:** https://developer.wolframalpha.com/portal/myapps/
- **Google AI Studio:** https://makersuite.google.com/app/apikey

---

## 📝 Diferencias Clave

### Lambda Propia vs Alexa Hosted

| Característica | Lambda (us-east-1) | Alexa Hosted |
|----------------|-------------------|--------------|
| Node.js | 20.x | 16.x |
| AWS SDK | v3 | v2 |
| Optional Chaining | ✅ | ❌ |
| Variables Entorno | ✅ | ❌ (hardcoded) |
| S3 Cache | ✅ | ❌ |
| DynamoDB | ✅ | ❌ |
| Deploy | GitHub Actions | Manual |
| Timeout | 15s | 8s (fijo) |
| Memory | 1024MB | 512MB (fijo) |
| Costo | Pay-per-use | Gratis (límites) |

---

## 🔒 Seguridad

### Buenas Prácticas Implementadas

- ✅ API keys en variables de entorno (Lambda)
- ✅ `.env` en `.gitignore`
- ✅ Repositorio privado
- ✅ IAM roles con permisos mínimos
- ✅ Encriptación automática en AWS Lambda
- ✅ Logs sin información sensible

### Consideraciones Alexa Hosted

- ⚠️ API keys hardcodeadas (aceptable — repo privado)
- ⚠️ Solo para desarrollo/pruebas
- ⚠️ Rotar keys periódicamente

---

**Última actualización:** 15 de Marzo, 2026  
**Mantenedor:** JpinedaPu  
**Skill ID:** amzn1.ask.skill.91893f76-ab13-4ee2-ad95-d803f3434ee5  
**Versión:** 7.7.0
