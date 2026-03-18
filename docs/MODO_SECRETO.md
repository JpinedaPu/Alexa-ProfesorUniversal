# 🔒 Modo Secreto: Las 7 Artes Liberales

## Activación

**Palabra secreta:** `Boaz` (columna del Templo de Salomón)

**Ejemplos de uso:**
- "Alexa, pregunta a profesor universal **Boaz** qué es la retórica"
- "Alexa, pregunta a profesor universal **Boaz** explícame la geometría sagrada"
- "Alexa, pregunta a profesor universal **Boaz** háblame de la música de las esferas"

## Las 7 Artes Liberales

### TRIVIUM (Artes del Lenguaje)

#### 1. 📚 Gramática
- **Enfoque:** Estructura del lenguaje, etimología, morfología, sintaxis
- **Voz:** Rachel (clara, profesional)
- **Fuentes:** Claude Haiku especializado
- **Ejemplo:** "Boaz explícame la etimología de filosofía"

#### 2. 🎭 Retórica
- **Enfoque:** Arte de la persuasión, figuras retóricas, oratoria
- **Voz:** Adam (narrativo, persuasivo)
- **Referencias:** Aristóteles (ethos, pathos, logos), Cicerón, Quintiliano
- **Ejemplo:** "Boaz qué es una metáfora"

#### 3. ⚖️ Lógica
- **Enfoque:** Razonamiento correcto, silogismos, falacias
- **Voz:** Antoni (analítico, preciso)
- **Referencias:** Aristóteles, leyes del pensamiento
- **Ejemplo:** "Boaz explícame el silogismo"

### QUADRIVIUM (Artes Matemáticas)

#### 4. 🔢 Aritmética
- **Enfoque:** Ciencia de los números, proporciones, teoría numérica
- **Voz:** Arnold (metódico, estructurado)
- **Fuentes:** Wolfram Alpha + Claude Haiku
- **Filosofía:** "Todo es número" (Pitágoras)
- **Ejemplo:** "Boaz qué son los números primos"

#### 5. 📐 Geometría
- **Enfoque:** Formas, espacio, proporción áurea, geometría sagrada
- **Voz:** Bella (visual, descriptiva)
- **Referencias:** Euclides, φ = 1.618...
- **Ejemplo:** "Boaz explícame la proporción áurea"

#### 6. 🎵 Música
- **Enfoque:** Armonía, intervalos matemáticos, música de las esferas
- **Voz:** Elli (armoniosa, melódica)
- **Proporciones:** Octava=2:1, Quinta=3:2, Cuarta=4:3
- **Ejemplo:** "Boaz qué es la música de las esferas"

#### 7. 🌌 Astronomía
- **Enfoque:** Movimientos celestes, microcosmos y macrocosmos
- **Voz:** Josh (contemplativo, profundo)
- **Fuentes:** Wolfram Alpha + Claude Haiku
- **Referencias:** Ptolomeo, Copérnico, Kepler
- **Ejemplo:** "Boaz explícame las esferas celestes"

## Arquitectura Técnica

### Flujo de Ejecución

```
Usuario dice "Boaz [pregunta]"
    ↓
SecretRouteIntentHandler detecta palabra secreta
    ↓
clasificarArteLiberal() analiza la pregunta
    ↓
Ejecuta ruta especializada (rutaGramatica, rutaRetorica, etc.)
    ↓
Claude Haiku genera respuesta académica (max 150 palabras)
    ↓
ElevenLabs sintetiza audio con voz especializada
    ↓
Audio se sube a S3 como público
    ↓
Alexa reproduce: "[Símbolo] [Arte] del [Trivium/Quadrivium]. [Audio]"
```

### Clasificación Automática

El sistema detecta automáticamente el arte liberal según palabras clave:

- **Gramática:** gramática, sintaxis, morfología, etimología, conjugación, lenguaje
- **Retórica:** retórica, persuasión, discurso, oratoria, argumento, elocuencia
- **Lógica:** lógica, silogismo, falacia, razonamiento, deducción, premisa
- **Aritmética:** aritmética, número, suma, resta, multiplicación, primo
- **Geometría:** geometría, triángulo, círculo, polígono, ángulo, teorema
- **Música:** música, armonía, escala, acorde, intervalo, nota, frecuencia
- **Astronomía:** astronomía, estrella, planeta, galaxia, constelación, órbita

### Intents Alexa

#### SecretRouteIntent
```json
{
  "name": "SecretRouteIntent",
  "slots": [
    {
      "name": "secretQuestion",
      "type": "AMAZON.SearchQuery"
    }
  ],
  "samples": [
    "boaz {secretQuestion}",
    "Boaz {secretQuestion}",
    "siete artes {secretQuestion}",
    "artes liberales {secretQuestion}",
    "trivium {secretQuestion}",
    "quadrivium {secretQuestion}"
  ]
}
```

#### ExplorarArteIntent
```json
{
  "name": "ExplorarArteIntent",
  "slots": [
    {
      "name": "arte",
      "type": "ARTE_LIBERAL"
    }
  ],
  "samples": [
    "explícame {arte}",
    "háblame de {arte}",
    "qué es {arte}",
    "enséñame {arte}"
  ]
}
```

## Archivos Modificados

### ✅ Implementados
- `lambda/handlers/SecretRouteIntentHandler.js` - Handler principal
- `lambda/handlers/artesLiberalesRoutes.js` - Rutas especializadas
- `lambda/services/elevenlabs.js` - Generación de audio premium
- `lambda/index.js` - Registro de handlers
- `skill-package/interactionModels/custom/es-ES.json` - Modelo de voz

### 📋 Configuración Requerida

#### Variables de Entorno (AWS Lambda)
```bash
ELEVENLABS_API_KEY=sk-...  # API key de ElevenLabs
```

#### Permisos IAM S3
El rol Lambda debe tener permisos para:
- `s3:PutObject` en `alexa-profesor-universal-cache-us-east-1/audio/premium/*`
- `s3:PutObjectAcl` para hacer públicos los archivos

## Testing

### Test Manual (Alexa Developer Console)

1. **Test básico:**
   - "Alexa, abre profesor universal"
   - "Boaz qué es la retórica"
   - ✅ Debe responder con símbolo 🎭 y audio premium

2. **Test Trivium:**
   - "Boaz explícame la etimología de filosofía" → Gramática 📚
   - "Boaz qué es una metáfora" → Retórica 🎭
   - "Boaz explícame el silogismo" → Lógica ⚖️

3. **Test Quadrivium:**
   - "Boaz qué son los números primos" → Aritmética 🔢
   - "Boaz explícame la proporción áurea" → Geometría 📐
   - "Boaz qué es la música de las esferas" → Música 🎵
   - "Boaz explícame las esferas celestes" → Astronomía 🌌

4. **Test ExplorarArteIntent:**
   - "Explícame la geometría"
   - "Háblame de la lógica"
   - "Enséñame la aritmética"

### Test Programático

```javascript
// Agregar a scripts/test-lambda.js
{
  id: 30,
  name: '[SECRET] Boaz - Retórica',
  desc: 'Modo secreto: 7 Artes Liberales - Retórica',
  payload: makeAskProfePayload('boaz qué es la retórica')
},
{
  id: 31,
  name: '[SECRET] Boaz - Geometría',
  desc: 'Modo secreto: 7 Artes Liberales - Geometría',
  payload: makeAskProfePayload('boaz explícame la proporción áurea')
}
```

## Despliegue

```bash
# 1. Commit y push
git add .
git commit -m "feat: implementar modo secreto 7 Artes Liberales"
git push origin main

# 2. GitHub Actions desplegará automáticamente a Lambda

# 3. Actualizar modelo de interacción en Alexa Developer Console
ask deploy --target model

# 4. Configurar variable de entorno
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

## Filosofía del Modo Secreto

Las 7 Artes Liberales representan el **Trivium** (dominio del lenguaje) y el **Quadrivium** (dominio de las matemáticas), la base de la educación clásica desde la Edad Media.

- **Trivium:** Herramientas del pensamiento (cómo pensar)
- **Quadrivium:** Herramientas de la realidad (qué pensar)

La palabra secreta **Boaz** hace referencia a la columna izquierda del Templo de Salomón, símbolo de sabiduría y conocimiento esotérico.

## Limitaciones Actuales

- ⚠️ **ElevenLabs API Key:** Debe configurarse manualmente en Lambda
- ⚠️ **Timeout:** Audio premium puede tardar 3-5s en generarse
- ⚠️ **Caché:** No hay caché de audio (cada pregunta genera nuevo audio)
- ⚠️ **Costo:** ElevenLabs cobra por caracteres sintetizados

## Mejoras Futuras

- [ ] Caché de audio en S3 por hash de texto
- [ ] Fallback a Polly si ElevenLabs falla
- [ ] APL visual especializado para cada arte
- [ ] Imágenes históricas de las 7 artes
- [ ] Modo "tour completo" que explica las 7 artes en secuencia
- [ ] Integración con Wikipedia para biografías de maestros clásicos

---

**Estado:** ✅ IMPLEMENTADO - Listo para testing
**Última actualización:** Marzo 2026
