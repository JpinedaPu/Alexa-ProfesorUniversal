# 🛣️ Rutas Implementadas - Profesor Universal IA

## Índice
1. [Ruta Matemática](#ruta-matemática)
2. [Ruta Científica](#ruta-científica)
3. [Ruta Wolfram Paso a Paso](#ruta-wolfram-paso-a-paso)
4. [Ruta General (Flujo Normal)](#ruta-general-flujo-normal)
5. [Flujo de Decisión](#flujo-de-decisión)

---

## Ruta Matemática

**Archivo**: `lambda/handlers/mathRoute.js`

### ¿Cuándo se activa?

Se activa automáticamente cuando detecta palabras clave matemáticas en la pregunta:

**Palabras clave**:
- Operaciones: `derivada`, `integral`, `limite`, `ecuacion`, `resuelve`, `calcula`
- Funciones: `factoriza`, `simplifica`, `grafica`, `matriz`, `determinante`, `vector`
- Aritmética: `suma`, `resta`, `multiplica`, `divide`, `raiz`, `logaritmo`
- Trigonometría: `seno`, `coseno`, `tangente`
- Otros: `factorial`, `combinatoria`, `permutacion`

**Notación matemática**:
- `x^2`, `x al cuadrado`, `x al cubo`
- `sen(`, `cos(`, `tan(`, `log(`, `ln(`, `sqrt(`
- Expresiones numéricas: `2 + 2`, `5 * 3`

### Flujo de Ejecución

```
1. Detección → esPreguntaMatematica(pregunta)
   ↓
2. Clasificación → clasificarProblemaMatematico(pregunta)
   - Tipos: derivada, integral, ecuacion, limite, aritmetica, otro
   ↓
3. Consulta a Wolfram Alpha (modo step-by-step)
   - Timeout: 2500-4500ms (dinámico según tiempo transcurrido)
   - Obtiene: imagenesNormales (pods resultado) + imagenesPasos (SBS)
   ↓
4. Síntesis con Claude (paralelo)
   - Timeout: 2000-7400ms (dinámico)
   - Explica la solución en español pedagógico
   ↓
5. Formateo del título matemático
   - Convierte notación: integrate → ∫, derivative → d/dx
   - Símbolos: ^2 → ², * → ·, sin → sen
   ↓
6. Respuesta con APL
   - Imágenes: pods de resultado de Wolfram
   - Botón "Paso a Paso" si hay pasos disponibles
```

### Ejemplo de Uso

**Usuario**: "Alexa, pregunta al profesor cuál es la derivada de x al cuadrado"

**Procesamiento**:
1. Detecta: `derivada` + `x al cuadrado` → Ruta matemática
2. Clasifica: `derivada`
3. Wolfram: `derivative of x^2` → Resultado: `2x`
4. Claude: Explica en español pedagógico
5. APL: Muestra fórmula con símbolos matemáticos

**Respuesta**: "La derivada de x al cuadrado es dos equis. Esto se obtiene aplicando la regla de potencias..."

---

## Ruta Científica

**Archivo**: `lambda/handlers/scienceRoute.js`

### ¿Cuándo se activa?

Se activa cuando detecta palabras clave científicas:

**Astronomía**:
- `agujero negro`, `estrella`, `planeta`, `galaxia`, `nebulosa`
- `cometa`, `asteroide`, `satelite`, `telescopio`
- `nasa`, `hubble`, `james webb`, `sistema solar`, `via lactea`
- `big bang`, `universo`, `cosmos`, `quasar`, `pulsar`, `supernova`
- `materia oscura`, `energia oscura`

**Física**:
- `velocidad`, `masa`, `energia`, `fuerza`, `gravedad`
- `onda`, `particula`, `electromagnetismo`, `termodinamica`
- `mecanica cuantica`, `relatividad`

**Química**:
- `atomo`, `molecula`, `elemento`, `reaccion quimica`
- `compuesto`, `tabla periodica`

**Biología**:
- `celula`, `adn`, `gen`, `organismo`, `evolucion`
- `especie`, `fotosintesis`

### Flujo de Ejecución

```
1. Detección → esPreguntaCientifica(pregunta)
   ↓
2. Clasificación → clasificarPreguntaCientifica(pregunta)
   - Tipos: astronomia, fisica, quimica, biologia, otro
   ↓
3. Consultas PARALELAS (Promise.all)
   ├─ Wolfram Alpha (datos científicos)
   ├─ Wikipedia (contexto enciclopédico)
   └─ NASA Images API / Wikimedia Commons
      - Astronomía: 15 imágenes
      - Otras: 8 imágenes
   ↓
4. Síntesis con Claude
   - Timeout: 3000ms
   - Combina información de todas las fuentes
   ↓
5. Combinación de imágenes
   - Wolfram primero (gráficas, diagramas)
   - NASA/Wikimedia después (fotos reales)
   - Máximo: 20 imágenes
   ↓
6. Respuesta con APL
   - Título: "Ciencia: [keyword]"
   - Texto: Resumen de Wikipedia (300 chars)
   - Imágenes: Combinadas de todas las fuentes
```

### Ejemplo de Uso

**Usuario**: "Alexa, pregunta al profesor qué es un agujero negro"

**Procesamiento**:
1. Detecta: `agujero negro` → Ruta científica
2. Clasifica: `astronomia`
3. Consultas paralelas:
   - Wolfram: Datos técnicos (masa, radio de Schwarzschild)
   - Wikipedia: Definición y contexto
   - NASA: 15 imágenes de agujeros negros
4. Claude: Síntesis educativa
5. APL: Muestra imágenes de NASA + gráficas de Wolfram

**Respuesta**: "Un agujero negro es una región del espacio-tiempo donde la gravedad es tan intensa que nada puede escapar..."

---

## Ruta Wolfram Paso a Paso

**Archivo**: `lambda/handlers/WolframAlphaModeIntentHandler.js`

### ¿Cuándo se activa?

Se activa de 3 formas:

1. **Por voz**: "Alexa, activa modo wolfram [ecuación]"
2. **Por botón APL**: Usuario toca "Paso a Paso" en una respuesta matemática
3. **Por continuación**: "Alexa, continúa" (para ver más pasos)

### Flujo de Ejecución

```
1. Entrada
   ├─ Voz: "activa modo wolfram x al cuadrado menos 4 igual a cero"
   ├─ Botón APL: Datos ya inyectados en sesión
   └─ Continuación: "continúa" (usa caché de DynamoDB)
   ↓
2. Conversión de notación (solo si es voz)
   - GPT-4o-mini convierte español → notación matemática
   - "x al cuadrado menos 4 igual a cero" → "x^2 - 4 = 0"
   - Timeout: 3000ms
   ↓
3. Progressive Response
   - "Procesando tu ecuación matemática..."
   - Compra tiempo mientras Wolfram trabaja
   ↓
4. Consulta a Wolfram Alpha (modo step-by-step)
   - Timeout: 6500ms
   - Obtiene: todos los pasos de la solución
   - Guarda en DynamoDB para continuación
   ↓
5. Paginación (3 pasos por turno)
   - Paso 1-3: Primera respuesta
   - Paso 4-6: "continúa" → Segunda respuesta
   - Paso 7-9: "continúa" → Tercera respuesta
   ↓
6. Síntesis con Claude (por cada página)
   - Timeout: 4000ms
   - Explica SOLO los pasos actuales
   - Pedagógico y conversacional
   ↓
7. Respuesta con APL
   - Título: "Solución Paso a Paso (1-3 de 9)"
   - Imágenes: Pasos actuales
   - Botón "Continuar" si hay más pasos
```

### Caché en DynamoDB

**Estructura guardada**:
```javascript
{
  sessionId: "...",
  userId: "...",
  originalQuestion: "x al cuadrado menos 4 igual a cero",
  originalQuestionEn: "x^2 - 4 = 0",
  questionType: "step-by-step",
  wolframResponse: {
    allSteps: [...],  // Todos los pasos
    totalSteps: 9,
    imagenesNormales: [...]  // Pods normales
  },
  currentPage: 0,
  stepsPerPage: 3,
  timestamp: 1710864000000
}
```

### Ejemplo de Uso

**Usuario**: "Alexa, activa modo wolfram x al cuadrado menos 4 igual a cero"

**Procesamiento**:
1. Conversión: "x al cuadrado menos 4 igual a cero" → "x^2 - 4 = 0"
2. Progressive: "Procesando tu ecuación matemática..."
3. Wolfram: Obtiene 9 pasos de solución
4. Guarda en DynamoDB
5. Muestra pasos 1-3
6. Claude: "Primero, identificamos que es una diferencia de cuadrados..."

**Respuesta**: "Primero, identificamos que es una diferencia de cuadrados. Factorizamos como (x+2)(x-2). Las soluciones son x=2 y x=-2. Cuando quieras continuar, di continúa."

**Usuario**: "Alexa, continúa"

**Procesamiento**:
1. Busca en DynamoDB
2. Incrementa página: 0 → 1
3. Muestra pasos 4-6
4. Claude: Explica pasos 4-6

---

## Ruta General (Flujo Normal)

**Archivo**: `lambda/handlers/AskProfeIntentHandler.js`

### ¿Cuándo se activa?

Se activa cuando la pregunta NO es matemática NI científica.

**Ejemplos**:
- Historia: "¿Quién fue Simón Bolívar?"
- Geografía: "¿Cuál es la capital de Francia?"
- Cultura: "¿Qué es el Renacimiento?"
- Biografías: "¿Cuándo nació Einstein?"
- Conceptos generales: "¿Qué es la democracia?"

### Flujo de Ejecución

```
1. Validación y reconstrucción
   - Detecta preguntas ambiguas ("¿cuánto mide?")
   - Usa contexto de conversación para reconstruir
   - GPT: "¿cuánto mide?" + contexto "Everest" → "¿cuánto mide el Everest?"
   ↓
2. Extracción de keyword
   - GPT extrae tema principal
   - Timeout: 1500ms
   - Normaliza notación matemática si es necesario
   ↓
3. Análisis de cacheabilidad
   - Determina si la pregunta es cacheable
   - Busca en caché S3 si aplica
   ↓
4. Determina modo: DINÁMICO vs ESTÁTICO
   
   MODO DINÁMICO (necesita Wolfram):
   - Preguntas con datos actualizados
   - Palabras clave: precio, cotización, población actual, clima, resultado
   - Consultas: Wolfram + Wikipedia + Claude + Gemini (paralelo)
   
   MODO ESTÁTICO (no necesita Wolfram):
   - Preguntas históricas/biográficas
   - Consultas: Wikipedia + Claude + Gemini (paralelo)
   ↓
5. Consultas paralelas (Promise.all)
   ├─ Wolfram (si modo DINÁMICO)
   ├─ Wikipedia
   ├─ Claude
   └─ Gemini
   ↓
6. Búsqueda de imágenes extra
   - NASA Images API (si es espacial)
   - Wikimedia Commons
   - Máximo: 30 imágenes
   ↓
7. Síntesis final con Claude
   - Combina información de todas las fuentes
   - Genera speech pedagógico
   - Timeout: variable según tiempo transcurrido
   ↓
8. Caché y persistencia
   - Guarda en S3 si es cacheable
   - Guarda en historial de usuario (DynamoDB)
   - Actualiza atributos de sesión
   ↓
9. Respuesta con APL
   - Título: Traducido al español
   - Texto: Resumen de fuentes
   - Imágenes: Primeras 12 + pool de 30
   - Botón "Ver más imágenes" si hay pool
```

### Modo DINÁMICO vs ESTÁTICO

**DINÁMICO** (con Wolfram):
```javascript
// Detecta palabras clave de datos actualizados
const NECESITA_WOLFRAM_RE = /\b(precio|costo|cotización|dólar|
  población actual|clima|temperatura actual|resultado|marcador|
  campeón|tipo de cambio|tasa|elecciones|último|reciente|hoy|
  ayer|2024|2025|2026|calcula|convierte|cuánto es)\b/i;
```

**ESTÁTICO** (sin Wolfram):
- Preguntas históricas
- Biografías
- Conceptos teóricos
- Definiciones

### Ejemplo de Uso (ESTÁTICO)

**Usuario**: "Alexa, pregunta al profesor quién fue Simón Bolívar"

**Procesamiento**:
1. Keyword: "Simón Bolívar"
2. Modo: ESTÁTICO (pregunta histórica)
3. Consultas paralelas:
   - Wikipedia: Biografía completa
   - Claude: Síntesis educativa
   - Gemini: Contexto adicional
4. Imágenes: Wikimedia Commons (retratos, mapas)
5. Síntesis: Claude combina todo

**Respuesta**: "Simón Bolívar fue un militar y político venezolano, conocido como El Libertador. Lideró la independencia de varios países sudamericanos..."

### Ejemplo de Uso (DINÁMICO)

**Usuario**: "Alexa, pregunta al profesor cuánto cuesta el dólar hoy"

**Procesamiento**:
1. Keyword: "dólar"
2. Modo: DINÁMICO (detecta "cuesta" + "hoy")
3. Consultas paralelas:
   - Wolfram: Tipo de cambio actual
   - Wikipedia: Contexto sobre el dólar
   - Claude: Síntesis
   - Gemini: Información adicional
4. Síntesis: Claude combina datos actualizados

**Respuesta**: "El dólar estadounidense está a [valor actual] pesos. El tipo de cambio varía según el mercado..."

---

## Flujo de Decisión

```
┌─────────────────────────────────────┐
│  Usuario hace pregunta              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  AskProfeIntentHandler              │
│  - Valida entrada                   │
│  - Reconstruye si es ambigua        │
│  - Extrae keyword                   │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────┴──────┐
        │             │
        ▼             ▼
┌──────────────┐  ┌──────────────┐
│ ¿Matemática? │  │ ¿Científica? │
└──────┬───────┘  └──────┬───────┘
       │ SÍ              │ SÍ
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ mathRoute    │  │ scienceRoute │
│ - Wolfram SBS│  │ - Wolfram    │
│ - Claude     │  │ - Wikipedia  │
│ - Formateo   │  │ - NASA API   │
└──────────────┘  └──────────────┘
       │                 │
       │ NO              │ NO
       ▼                 ▼
┌─────────────────────────────────────┐
│  Flujo General                      │
│  ┌──────────────────────────────┐  │
│  │ ¿Necesita Wolfram?           │  │
│  └──────┬───────────────┬───────┘  │
│         │ SÍ            │ NO       │
│         ▼               ▼          │
│  ┌──────────┐    ┌──────────┐     │
│  │ DINÁMICO │    │ ESTÁTICO │     │
│  │ Wolfram+ │    │ Wiki+    │     │
│  │ Wiki+    │    │ Claude+  │     │
│  │ Claude+  │    │ Gemini   │     │
│  │ Gemini   │    │          │     │
│  └──────────┘    └──────────┘     │
└─────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Respuesta con APL                  │
│  - Speech (voz)                     │
│  - Imágenes                         │
│  - Texto                            │
│  - Botones interactivos             │
└─────────────────────────────────────┘
```

---

## Características Comunes

### Todas las rutas incluyen:

1. **Timeouts dinámicos**: Se ajustan según el tiempo transcurrido
2. **Progressive Response**: Mensajes de "procesando" mientras trabaja
3. **Whisper Mode**: Soporte para modo susurro
4. **Dark Mode**: Soporte para tema oscuro en APL
5. **Zoom**: Control de accesibilidad
6. **Caché**: Optimización de respuestas repetidas
7. **Historial**: Persistencia en DynamoDB
8. **Fallback**: Manejo de errores graceful

### Prioridad de Rutas

1. **Matemática** (más específica)
2. **Científica** (específica)
3. **General** (catch-all)

Si una ruta falla, NO hace fallback a otra ruta, sino que muestra mensaje de error.

---

## Métricas de Performance

### Tiempos objetivo:

- **Ruta Matemática**: < 7s total
  - Wolfram: 2.5-4.5s
  - Claude: 2-7.4s
  
- **Ruta Científica**: < 6s total
  - Consultas paralelas: 3s
  - Claude: 3s
  
- **Ruta Wolfram SBS**: < 8s total
  - Conversión: 3s
  - Wolfram: 6.5s
  - Claude: 4s
  
- **Ruta General**: < 8s total
  - Keyword: 1.5s
  - Consultas paralelas: 4-5s
  - Síntesis: variable

---

**Última actualización**: 2026-03-19  
**Versión**: 7.7.3

