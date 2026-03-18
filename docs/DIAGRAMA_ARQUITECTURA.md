# Diagrama de Arquitectura - Profesor Universal IA

## 🏗️ ARQUITECTURA GENERAL

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   👤 USUARIO    │───▶│   🎤 ALEXA       │───▶│  ☁️ AWS LAMBDA      │
│                 │    │                  │    │                     │
│ "¿Qué es el     │    │ Procesa voz      │    │ AlexaProfesor       │
│  sol?"          │    │ Extrae intent    │    │ Universal           │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                                                           │
                                                           ▼
                       ┌─────────────────────────────────────────────────┐
                       │           🧠 COORDINADOR PRINCIPAL              │
                       │                                                 │
                       │  index.js ──▶ AskProfeIntentHandler.js        │
                       └─────────────────────────────────────────────────┘
                                                           │
                                                           ▼
                       ┌─────────────────────────────────────────────────┐
                       │              🤖 4 IAs EN PARALELO              │
                       │                                                 │
                       │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
                       │  │Wolfram  │ │Wikipedia│ │ Gemini  │ │ Claude  ││
                       │  │Alpha    │ │         │ │         │ │         ││
                       │  │🧮       │ │📚       │ │🔍       │ │🎓       ││
                       │  └─────────┘ └─────────┘ └─────────┘ └─────────┘│
                       └─────────────────────────────────────────────────┘
                                                           │
                                                           ▼
                       ┌─────────────────────────────────────────────────┐
                       │               📱 RESPUESTA FINAL                │
                       │                                                 │
                       │  🎵 Voz (SSML) + 🖼️ Visual (APL)              │
                       │                                                 │
                       │  "El Sol es nuestra estrella más cercana..."   │
                       └─────────────────────────────────────────────────┘
```

## 🔄 FLUJO DETALLADO DE PROCESAMIENTO

```
1. ENTRADA
   ┌─────────────────┐
   │ Usuario dice:   │
   │ "¿Qué es el     │ ──┐
   │  sol?"          │   │
   └─────────────────┘   │
                         │
2. PROCESAMIENTO ALEXA   │
   ┌─────────────────┐   │
   │ Alexa NLU:      │◀──┘
   │ Intent: AskProfe│
   │ Slot: "el sol"  │ ──┐
   └─────────────────┘   │
                         │
3. AWS LAMBDA            │
   ┌─────────────────┐   │
   │ index.js        │◀──┘
   │ ├─ Recibe event │
   │ ├─ Extrae slot  │ ──┐
   │ └─ Llama handler│   │
   └─────────────────┘   │
                         │
4. HANDLER PRINCIPAL     │
   ┌─────────────────┐   │
   │ AskProfeIntent  │◀──┘
   │ Handler.js      │
   │ ├─ Extrae       │ ──┐
   │ │  keyword      │   │
   │ ├─ Inicia 4 IAs │   │
   │ └─ Espera       │   │
   │    respuestas   │   │
   └─────────────────┘   │
                         │
5. 4 IAs EN PARALELO     │
   ┌─────────────────┐   │
   │ ⏱️ T+0ms        │◀──┘
   │                 │
   │ Wolfram ────────┼──▶ "Estrella tipo G, 1.989×10³⁰ kg"
   │ Wikipedia ──────┼──▶ "El Sol es la estrella del..."
   │ Gemini ─────────┼──▶ "Investigación solar reciente..."
   │ Claude ─────────┼──▶ [Espera datos de otros]
   │                 │
   │ ⏱️ T+2000ms     │
   └─────────────────┘
                         │
6. SÍNTESIS CLAUDE       │
   ┌─────────────────┐   │
   │ Claude recibe:  │◀──┘
   │ ├─ Datos Wolfram│
   │ ├─ Info Wikipedia│ ──┐
   │ ├─ Context Gemini│   │
   │ └─ Genera JSON  │   │
   │   {             │   │
   │     speech: "...",   │
   │     displayTop: "...",
   │     displayBottom: "...",
   │     keyword: "Sol"   │
   │   }             │   │
   └─────────────────┘   │
                         │
7. CONSTRUCCIÓN APL      │
   ┌─────────────────┐   │
   │ apl.js genera:  │◀──┘
   │ ├─ Layout       │
   │ ├─ Imágenes     │ ──┐
   │ ├─ Logos        │   │
   │ └─ Botones      │   │
   └─────────────────┘   │
                         │
8. RESPUESTA FINAL       │
   ┌─────────────────┐   │
   │ Alexa recibe:   │◀──┘
   │ ├─ outputSpeech │
   │ ├─ APL directive│
   │ └─ sessionAttrs │
   └─────────────────┘
                         │
9. USUARIO ESCUCHA       │
   ┌─────────────────┐   │
   │ 🎵 "El Sol es   │◀──┘
   │ nuestra estrella│
   │ más cercana..." │
   │                 │
   │ 🖼️ [Imagen del  │
   │ Sol + datos]    │
   └─────────────────┘
```

## 🗂️ ESTRUCTURA DE ARCHIVOS CON PROPÓSITO

```
📁 PROYECTO/
├── 📁 .ask/lambda/           ← 🚀 PRODUCCIÓN (AWS Lambda)
│   ├── 📄 index.js           ← 🎯 Punto de entrada
│   ├── 📁 handlers/          ← 🧠 Lógica de negocio
│   │   ├── AskProfeIntentHandler.js     ← 📚 Preguntas generales
│   │   ├── WolframAlphaModeIntentHandler.js ← 🧮 Matemáticas
│   │   └── RepeatLastQuestionIntentHandler.js ← 🔄 Repetir
│   ├── 📁 services/          ← 🤖 Conexiones a IAs
│   │   ├── claude.js         ← 🎓 Síntesis educativa
│   │   ├── wolfram.js        ← 🧮 Datos técnicos
│   │   ├── wikipedia.js      ← 📚 Enciclopedia
│   │   └── gemini.js         ← 🔍 Info actualizada
│   └── 📁 utils/             ← 🛠️ Herramientas
│       ├── cache.js          ← 💾 Memoria rápida
│       ├── logger.js         ← 📝 Registros
│       └── apl.js            ← 🎨 Pantallas bonitas
│
├── 📁 alexa-hosted-version/  ← 🧪 DESARROLLO (Simulador)
│   └── [Misma estructura]    ← 🔄 Copia para testing
│
├── 📁 scripts/               ← ⚙️ AUTOMATIZACIÓN
│   ├── deploy.ps1            ← 🚀 Deploy automático
│   └── configure-lambda-env.ps1 ← 🔐 Variables secretas
│
├── 📁 skill-package/         ← 📋 CONFIGURACIÓN ALEXA
│   ├── skill.json            ← 🆔 Identidad del skill
│   └── interactionModels/    ← 🗣️ Qué entiende Alexa
│
└── 📁 docs/                  ← 📖 DOCUMENTACIÓN
    ├── DOCUMENTACION_PROYECTO.md ← 📚 Manual completo
    └── QUE_HACE_CADA_COSA.md ← 🤔 Esta guía
```

## ⚡ OPTIMIZACIONES DE RENDIMIENTO

```
🎯 OBJETIVO: Responder en <7.8 segundos

┌─────────────────────────────────────────────────────────────┐
│                    TIMELINE DE RESPUESTA                    │
├─────────────────────────────────────────────────────────────┤
│ T+0ms    │ Usuario termina de hablar                        │
│ T+100ms  │ Alexa procesa voz → texto                       │
│ T+200ms  │ Lambda recibe request                           │
│ T+300ms  │ Handler inicia 4 IAs en paralelo               │
│          │                                                 │
│ T+300ms  │ ┌─ Wolfram Alpha (timeout: 5.5s)               │
│ T+300ms  │ ├─ Wikipedia (timeout: 1.2s)                   │
│ T+300ms  │ ├─ Gemini (timeout: 5s)                        │
│ T+300ms  │ └─ Claude espera datos...                       │
│          │                                                 │
│ T+1500ms │ Wikipedia responde ✅                           │
│ T+2000ms │ Gemini responde ✅                              │
│ T+2500ms │ Wolfram responde ✅                             │
│ T+2600ms │ Claude inicia síntesis                          │
│ T+3400ms │ Claude responde ✅                              │
│ T+3500ms │ APL se construye                                │
│ T+3600ms │ Lambda devuelve respuesta                       │
│ T+3700ms │ Alexa inicia síntesis de voz                    │
│ T+4000ms │ Usuario escucha respuesta 🎵                    │
└─────────────────────────────────────────────────────────────┘

🚀 OPTIMIZACIONES APLICADAS:
• Paralelización de IAs (no secuencial)
• Cache LRU para preguntas repetidas
• Timeouts agresivos para evitar bloqueos
• Keep-alive HTTP para reutilizar conexiones
• Límites de caracteres para respuestas rápidas
```

## 🎨 DISEÑO VISUAL (APL)

```
┌─────────────────────────────────────────────────────────────┐
│                    ECHO SHOW / FIRE TV                     │
├─────────────────────────────────────────────────────────────┤
│ 🏠 ⚙️                                    🔍 🎵 ➕ ➖ │
│                                                             │
│           🌞 EL SOL - NUESTRA ESTRELLA                     │
│                                                             │
│  ┌─────────────────┐  📊 DATOS TÉCNICOS:                   │
│  │                 │  • Masa: 1.989×10³⁰ kg                │
│  │   [Imagen del   │  • Temperatura: 5,778 K               │
│  │     Sol de      │  • Distancia: 149.6 millones km      │
│  │   Wolfram]      │  • Tipo: Estrella enana amarilla     │
│  │                 │                                       │
│  └─────────────────┘  💡 SABÍAS QUE...                     │
│                       El Sol convierte 4 millones de      │
│  🏷️ GitHub AWS Claude  toneladas de masa en energía       │
│     NASA Alexa OpenAI  cada segundo mediante fusión       │
│     Gemini             nuclear.                            │
│                                                             │
│              [Ver más imágenes] [Modo paso a paso]         │
└─────────────────────────────────────────────────────────────┘

MÓVIL (App Alexa):
┌─────────────────┐
│ 🌞 EL SOL       │
│                 │
│ [Imagen]        │
│                 │
│ Masa: 1.989×10³⁰│
│ Temp: 5,778 K   │
│                 │
│ 💡 El Sol       │
│ convierte 4     │
│ millones de     │
│ toneladas...    │
└─────────────────┘
```

## 🔐 SEGURIDAD Y VARIABLES

```
🔒 VARIABLES SECRETAS (Nunca en código):

AWS LAMBDA:
┌─────────────────────────────────────────┐
│ Environment Variables (Encrypted)       │
├─────────────────────────────────────────┤
│ CLAUDE_API_KEY=sk-ant-api03-...         │
│ WOLFRAM_APP_ID=6U3PEET6LV               │
│ GEMINI_API_KEY=AIzaSy...                │
│ OPENAI_API_KEY=sk-proj-...              │
└─────────────────────────────────────────┘

ALEXA HOSTED (Repo Privado):
┌─────────────────────────────────────────┐
│ Hardcoded in Code (Safe - Private Repo) │
├─────────────────────────────────────────┤
│ const CLAUDE_API_KEY = "sk-ant-api03...";│
│ const WOLFRAM_APP_ID = "6U3PEET6LV";    │
│ // etc...                               │
└─────────────────────────────────────────┘

🛡️ PERMISOS AWS:
• Lambda execution role
• DynamoDB read/write
• S3 read/write
• Bedrock invoke model
• CloudWatch logs
```

## 📊 MONITOREO Y MÉTRICAS

```
📈 CLOUDWATCH DASHBOARDS:

┌─────────────────────────────────────────┐
│             MÉTRICAS CLAVE              │
├─────────────────────────────────────────┤
│ 📞 Invocaciones/día: ~500               │
│ ⏱️ Latencia promedio: 3.2s              │
│ ✅ Success rate: 97.3%                  │
│ 💾 Cache hit rate: 16%                  │
│ 🧮 Wolfram success: 94%                 │
│ 📚 Wikipedia success: 99%               │
│ 🔍 Gemini success: 91%                  │
│ 🎓 Claude success: 98%                  │
└─────────────────────────────────────────┘

🚨 ALERTAS CONFIGURADAS:
• >3 errores en 10 minutos
• Latencia >7.5 segundos
• Memory usage >80%
• Timeout rate >5%
```

---

**🎯 OBJETIVO FINAL:** Crear la experiencia educativa más avanzada del mundo, combinando lo mejor de 4 inteligencias artificiales en una respuesta perfecta que se adapta a cada usuario y dispositivo.