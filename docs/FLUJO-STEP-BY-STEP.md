# Wolfram Alpha Step-by-Step — Documentación Técnica

Hallazgos reales obtenidos por diagnóstico directo contra la API (marzo 2026).

---

## Flujo de 2 llamadas (implementado en `wolfram.js`)

### Llamada 1 — Resultado normal + detección de podstates

Sin `podstate`. Devuelve todos los pods normales y en cada pod puede haber `pod.states[]`
con un state cuyo `name` contiene `"step-by-step"`. Se guarda `state.input` para la llamada 2.

```
GET /v2/query?appid=...&input=derivative+of+3x^2+...&output=json&format=image,plaintext
```

Resultado guardado en `imagenesNormales` — lo que se muestra en la primera pantalla.

### Llamada 2 — Pasos expandidos

Con doble `podstate`: el SBS + el "Show all steps" del mismo pod.

```
GET /v2/query?...&podstate=Input__Step-by-step+solution&podstate=Input__Show+all+steps
```

Wolfram devuelve **todos los pods de la llamada 1 repetidos** más el pod primary expandido
con los subpods de pasos. El código extrae **solo el pod `primary:true`** para evitar
incluir los pods normales repetidos.

Resultado guardado en `imagenes` (los pasos SBS).

---

## Reglas críticas de la API (confirmadas por diagnóstico)

### 1. El `id` de un pod NO es predecible desde su título

El pod que visualmente dice **"Derivative"** tiene `id="Input"` en Wolfram.
El pod que dice **"Indefinite integral"** tiene `id="IndefiniteIntegral"`.

**Nunca buscar por `pod.id` hardcodeado. Siempre usar `pod.primary === true`.**

### 2. Múltiples pods pueden tener `step-by-step` disponible

Para `derivative of 3x^2 + 6x^3 + 3x` la llamada 1 devuelve 4 podstates:

```
pod id='Input'           (Derivative)     → Input__Step-by-step solution       primary:true
pod id='ComplexSolution' (Complex roots)  → ComplexSolution__Step-by-step solution  primary:true
pod id='IndefiniteIntegral'               → IndefiniteIntegral__Step-by-step solution primary:true
pod id='GlobalMinimum'                    → GlobalMinimum__Step-by-step solution  primary:false
```

**Siempre usar el podstate del pod `primary:true` que aparezca primero.**
El código anterior filtraba `podId !== 'Input'` — esto descartaba el pod correcto
porque el pod Derivative tiene `id="Input"`.

### 3. `stepbystepcontenttype` no siempre existe

Los subpods de tipo `SBSStep` / `SBSHintStep` solo aparecen en ciertos pods (ej: `Input`
para derivadas simples). Para pods como `ComplexSolution` o `IndefiniteIntegral`, los
subpods de pasos **no tienen ese campo** — son subpods normales con imagen.

El filtro correcto en la llamada 2:
```js
const sbsType = subpod.stepbystepcontenttype;
const incluir = sbsType
    ? (sbsType === 'SBSStep' || sbsType === 'SBSHintStep')
    : parseInt(subpod.img.width || 0) > 50;  // fallback por tamaño
```

### 4. `includepodid` bloquea el SBS — nunca usarlo en la llamada 2

Combinar `&includepodid=X` con `&podstate=...` en la misma URL hace que Wolfram
devuelva la respuesta sin expandir los pasos. La llamada 2 nunca debe incluir `includepodid`.

### 5. Wolfram repite todos los pods normales en la llamada 2

La llamada 2 no devuelve solo el pod expandido — devuelve **todos los pods** de la
llamada 1 más el pod primary con los pasos. Si se procesan todos los pods con el
fallback de `width > 50`, se incluyen los pods normales repetidos (bug: "mismos pods de 3 en 3").

**Solución: en la llamada 2, procesar únicamente `pods.find(p => p.primary === true)`.**

### 6. Métodos alternativos NO están disponibles en la API pública

La interfaz web de Wolfram Pro muestra "Using method: factorización / fórmula cuadrática"
con `statelist` de opciones. Esto **no existe en la API pública** — solo hay `states`
simples con `"Step-by-step solution"`. No hay forma de elegir método de solución vía API.

---

## Estructura de datos que devuelve `consultarWolfram()` en modo SBS

```js
{
  imagenes: [...],          // subpods del pod primary:true de la llamada 2 (los pasos)
  imagenesNormales: [...],  // todos los pods de la llamada 1 (primera pantalla)
  texto: "...",             // plaintext concatenado de llamada 1 (para Claude)
  textoResult: "...",       // alt del pod Result si no hay plaintext
  canStepByStep: true,      // solo true si llamada 2 devolvió imágenes
  stepByStepInputs: [...]   // todos los state.input encontrados en llamada 1
}
```

---

## Bugs corregidos y sus causas raíz

| Bug | Causa | Fix |
|-----|-------|-----|
| `0 imgs (de 8 pods)` en llamada 2 | `stepbystepcontenttype` ausente en pods `ComplexSolution` | Fallback a filtro por `width > 50` cuando el campo no existe |
| Mismos pods normales de 3 en 3 | Llamada 2 procesaba todos los pods (normales repetidos + pasos) | Extraer solo `pod.primary === true` en llamada 2 |
| Paso a paso empezaba en paso 3 | `currentWolframStep` con valor residual de sesión anterior | Forzar reset a `0` en `index.js` y `WolframAlphaModeIntentHandler.js` al detectar `hasInjectedData` |
| Botón SBS re-llamaba Wolfram (8s) | `index.js` hacía nueva llamada al pulsar el botón | Botón inyecta `lastImagenesPasos` en sesión, no re-llama Wolfram |
| `paso 4-6/4` fuera de rango | `endIdx` no estaba limitado con `Math.min` | `endIdx = Math.min(startIdx + stepsPerPage, totalSteps)` |
| `canStepByStep: true` cuando llamada 2 falló | Se asignaba `true` antes de verificar si había imágenes | `canStepByStep = stepResult.imagenes.length > 0` |
| Texto inferior en inglés | `displayBottom` usaba `textoResultado` (texto crudo Wolfram) | Usar `claudeResponse?.displayBottom` (Claude genera en español) |
| "Input interpretation" no aparecía | `podsPrioritarios` no incluía `"Input"` (el title que Wolfram usa a veces) | Añadir `"Input"` al array de pods prioritarios |
| Podstate incorrecto elegido | Código filtraba `podId !== 'Input'` descartando el pod Derivative | Usar simplemente `candidatos.find(d => d.isPrimary)` |

---

## Presupuesto de tiempo (deadline Alexa: 8s)

```
T+0ms     → Inicio request
T+~55ms   → Keyword extraído (GPT fast path)
T+~1000ms → Llamada 1 Wolfram completa
T+~3500ms → Llamada 2 Wolfram completa (budget: remainingMs - 200, max 2800ms)
T+~3500ms → Claude inicia (budget: max(2000, 7400 - elapsed))
T+~6800ms → Claude completa
T+~7000ms → Respuesta enviada a Alexa
```

Alexa corta a 8s. Lambda timeout configurado a 15s como red de seguridad.
