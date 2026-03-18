# 🏛️ Las 7 Artes Liberales — Ruta Secreta

## Activación

**Palabra secreta:** `Boaz` (columna del Templo de Salomón)

```
Usuario: "Alexa, pregunta a profesor universal Boaz"
Alexa: [Activa modo de las 7 Artes Liberales]

Usuario: "Alexa, pregunta a profesor universal Boaz qué es un silogismo"
Alexa: [Respuesta con voz premium de Lógica]
```

## Las 7 Artes Liberales

### TRIVIUM (Artes del Lenguaje)

#### 1. 📚 Gramática
- **Voz:** Rachel (clara, profesional)
- **Temas:** Etimología, morfología, sintaxis, fonética
- **Ejemplos:**
  - "Boaz cuál es el origen de la palabra filosofía"
  - "Boaz explícame la conjugación del verbo ser"
  - "Boaz qué significa etimología"

#### 2. 🎭 Retórica
- **Voz:** Adam (narrativo, persuasivo)
- **Temas:** Figuras retóricas, argumentación, oratoria, ethos/pathos/logos
- **Ejemplos:**
  - "Boaz qué es una metáfora"
  - "Boaz explícame las tres pruebas de Aristóteles"
  - "Boaz cómo persuadir con palabras"

#### 3. ⚖️ Lógica
- **Voz:** Antoni (analítico, preciso)
- **Temas:** Silogismos, falacias, deducción, inducción
- **Ejemplos:**
  - "Boaz qué es un silogismo"
  - "Boaz explícame la falacia del hombre de paja"
  - "Boaz diferencia entre deducción e inducción"

### QUADRIVIUM (Artes Matemáticas)

#### 4. 🔢 Aritmética
- **Voz:** Arnold (metódico, estructurado)
- **Temas:** Números primos, proporciones, teoría numérica pitagórica
- **Ejemplos:**
  - "Boaz qué son los números primos"
  - "Boaz explícame la secuencia de Fibonacci"
  - "Boaz qué es un número perfecto"

#### 5. 📐 Geometría
- **Voz:** Bella (visual, descriptiva)
- **Temas:** Euclides, proporción áurea, geometría sagrada
- **Ejemplos:**
  - "Boaz qué es la proporción áurea"
  - "Boaz explícame el teorema de Pitágoras"
  - "Boaz qué es la geometría sagrada"

#### 6. 🎵 Música
- **Voz:** Elli (armoniosa, melódica)
- **Temas:** Intervalos, proporciones pitagóricas, música de las esferas
- **Ejemplos:**
  - "Boaz qué es un intervalo musical"
  - "Boaz explícame la música de las esferas"
  - "Boaz cómo se relacionan música y matemáticas"

#### 7. 🌌 Astronomía
- **Voz:** Josh (contemplativo, profundo)
- **Temas:** Movimientos celestes, esferas, microcosmos y macrocosmos
- **Ejemplos:**
  - "Boaz qué es la precesión de los equinoccios"
  - "Boaz explícame las esferas celestes"
  - "Boaz qué es el microcosmos y macrocosmos"

## Exploración directa

También puedes explorar cada arte directamente:

```
Usuario: "Alexa, pregunta a profesor universal explícame gramática"
Usuario: "Alexa, pregunta a profesor universal háblame de retórica"
Usuario: "Alexa, pregunta a profesor universal enséñame lógica"
```

## Arquitectura técnica

```
Usuario dice "Boaz [pregunta]"
    ↓
SecretRouteIntentHandler
    ↓
clasificarArteLiberal(pregunta)
    ↓
Ejecuta ruta especializada (ej: rutaLogica)
    ↓
1. Claude genera respuesta con prompt especializado
2. Wolfram (si aplica) provee datos exactos
3. ElevenLabs genera audio con voz específica
4. Audio se sube a S3
    ↓
Alexa responde con audio premium
```

## Voces ElevenLabs por arte

| Arte | Voice ID | Nombre | Características |
|------|----------|--------|-----------------|
| Gramática | `21m00Tcm4TlvDq8ikWAM` | Rachel | Clara, profesional |
| Retórica | `pNInz6obpgDQGcFmaJgB` | Adam | Narrativo, persuasivo |
| Lógica | `ErXwobaYiN019PkySvjV` | Antoni | Analítico, preciso |
| Aritmética | `VR6AewLTigWG4xSOukaG` | Arnold | Metódico, estructurado |
| Geometría | `EXAVITQu4vr4xnSDxMaL` | Bella | Visual, descriptiva |
| Música | `MF3mGyEYCl7XYWbV9V6O` | Elli | Armoniosa, melódica |
| Astronomía | `TxGEqnHWrfWFTfGW9XjX` | Josh | Contemplativo, profundo |

## Configuración requerida

### Variables de entorno (Lambda)
```bash
ELEVENLABS_API_KEY=tu_api_key_aqui
```

### Permisos S3
```bash
aws s3api put-bucket-acl \
  --bucket alexa-profesor-universal-cache-us-east-1 \
  --acl public-read
```

### Modelo de interacción
Copiar el contenido de `skill-package/interactionModels/custom/es-ES-artes-liberales.json` 
a la consola de Alexa Developer en la sección "JSON Editor".

## Filosofía

Las 7 Artes Liberales representan el conocimiento fundamental que libera la mente:

- **Trivium** (tres caminos): Dominio del lenguaje y pensamiento
- **Quadrivium** (cuatro caminos): Dominio de las matemáticas y el cosmos

Esta ruta secreta ofrece una experiencia educativa premium con:
- ✅ Voces especializadas por disciplina
- ✅ Conocimiento profundo del Trivium y Quadrivium
- ✅ Conexión con filosofía clásica (Pitágoras, Platón, Aristóteles)
- ✅ Integración de conocimiento antiguo y moderno
- ✅ Audio premium de ElevenLabs

---

**"Todo es número"** — Pitágoras  
**"Conócete a ti mismo"** — Inscripción del Templo de Delfos  
**"La geometría es conocimiento de lo eternamente existente"** — Platón
