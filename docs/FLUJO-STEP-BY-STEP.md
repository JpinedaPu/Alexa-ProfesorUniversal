# Wolfram Step-by-Step — Flujo Actual (Marzo 2026)

## Flujo completo end-to-end

### FASE 1 — Pregunta normal (mathRoute)

```
Usuario: "cuál es la derivada de x² · sin(x)"
  ↓
T+0ms    → esPreguntaMatematica() — regex detecta "derivada"
T+1ms    → obtenerKeyword() FAST PATH → "derivative of x^2 * sin(x)"
T+1ms    → Claude arranca en paralelo (prompt matemático, sin texto Wolfram)
T+1ms    → consultarWolfram(isStepByStep:false, timeoutMs=FASE1_TIMEOUT)
             → 1 llamada HTTP
             → devuelve: imagenes normales + texto + stepByStepData
T+2500ms → Claude responde (con conocimiento propio)
T+3500ms → Wolfram completa
           → Si queda ≥1800ms: Claude se relanza con texto Wolfram
T+~5500ms → Respuesta enviada

sessionAttributes guardados:
  lastKeyword = "derivative of x^2 * sin(x)"
  lastStepByStepData = [{input: "Input__Step-by-step solution", podId: "Input", isPrimary: true}]
  lastImagenes = [12 pods normales de Wolfram]
  lastImagenesPasos = [] (vacío — lazy loading)
  canStepByStep = true
```

APL muestra: imágenes normales + botón "Paso a Paso" (si canStepByStep=true)

---

### FASE 2A — Botón APL "Paso a Paso" (hasStepByStepData)

```
Usuario toca botón APL
  ↓
index.js APLUserEventHandler (args[0] === 'StepByStep'):
  sa.wolframData = {
    keyword: lastKeyword,           // "derivative of x^2 * sin(x)"
    keywordMath: lastKeyword,       // ya en inglés — salta GPT
    imagenes: [],
    stepByStepData: lastStepByStepData,  // podstates de fase1
    imagenesNormales: lastImagenes
  }
  sa.currentWolframStep = 0
  → WolframAlphaModeIntentHandler.handle(h, keyword)

WolframAlphaModeIntentHandler detecta hasStepByStepData=true:
  → NO consulta DynamoDB
  → NO llama GPT
  → sbsBudget = max(4000, 7800 - elapsed - 2000)
  → consultarWolfram(keywordMath, isStepByStep:true, timeoutMs:sbsBudget)
       → Llamada 1: re-detecta podstates (~1s)
       → Llamada 2: expande pasos con "Show all steps" (~2s)
       → devuelve 4-7 imágenes SBS
  → currentWolframStep = 0
  → Muestra pasos 1-3
  → Claude explica pasos 1-3
  → "Cuando quieras continuar, di continúa."
```

---

### FASE 2B — Voz "modo wolfram [ecuación]"

```
Usuario: "modo wolfram, integral de x al cuadrado"
  ↓
WolframAlphaModeIntentHandler (nuevo query):
  → convertirANotacionMatematica() — GPT ~800ms
  → Progressive Response en paralelo
  → consultarWolfram(keywordMath, isStepByStep:true, wolframBudget=max(5000,...))
       → 2 llamadas HTTP (~5s total)
  → guardarSessionCache() — DynamoDB
  → Muestra pasos 1-3 + Claude explica
```

---

### FASE 3 — Continuación ("continúa")

```
ContinueWolframIntentHandler.canHandle():
  → verifica wolframData.imagenes.length > currentWolframStep
  → delega a WolframAlphaModeIntentHandler('CONTINUE_WOLFRAM_MODE')

isContinue=true:
  → busca en DynamoDB primero (cachedSession)
  → si hay caché: incrementa página, muestra pasos 4-6
  → si no: usa sessionAttributes.wolframData.imagenes
  → Claude explica los nuevos pasos
```

---

## Reglas críticas de la API Wolfram (confirmadas)

**1. El `id` del pod NO es predecible desde su título**
El pod "Derivative" tiene `id="Input"`. Nunca buscar por id hardcodeado — usar `pod.primary === true`.

**2. Múltiples pods pueden tener step-by-step**
Para `derivative of 3x^2 + 6x^3 + 3x` hay 4 podstates. Usar el primero con `isPrimary:true`.

**3. `stepbystepcontenttype` no siempre existe**
Filtro en llamada 2: `sbsType === 'SBSStep' || sbsType === 'SBSHintStep'`. Si el campo no existe, fallback a `width > 50`.

**4. `includepodid` bloquea el SBS**
Nunca combinar `&includepodid=X` con `&podstate=...` en la llamada 2.

**5. Llamada 2 repite todos los pods normales**
Extraer solo `pods.find(p => p.primary === true)` en la llamada 2.

---

## Estructura de `consultarWolfram()` en modo SBS

```js
// Retorno
{
  imagenes: [...],          // subpods del pod primary:true (los pasos)
  imagenesNormales: [...],  // todos los pods de llamada 1 (primera pantalla)
  texto: "...",             // plaintext de llamada 1 (para Claude)
  textoResult: "...",       // alt del pod Result
  canStepByStep: true,      // solo true si llamada 2 devolvió imágenes
  stepByStepInputs: [...]   // todos los state.input de llamada 1
}
```

---

## Presupuesto de tiempo

```
mathRoute (FASE 1):
  DEADLINE = startTime + PERFORMANCE.GLOBAL_DEADLINE_MS (7850ms)
  FASE1_TIMEOUT = min(3500, DEADLINE - now - 1800ms)
  claudeBudget = max(1500, DEADLINE - now - 100ms)

WolframAlphaModeIntentHandler (FASE 2A botón):
  sbsBudget = max(4000, 7800 - elapsed - 2000ms)

WolframAlphaModeIntentHandler (FASE 2B voz):
  wolframBudget = max(5000, 7800 - elapsed - 2500ms)
  claudeBudget = max(2000, 7800 - elapsed - 200ms)
```
