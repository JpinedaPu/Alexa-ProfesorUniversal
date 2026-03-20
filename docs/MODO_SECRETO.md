# Modo Secreto — Las 7 Artes Liberales

## Activación

Di una de las frases de activación al Profesor Universal:

> **"La palabra es Boaz"** / **"Pronuncio la palabra Boaz"** / **"Abre el templo del conocimiento"** / **"Activa el templo del conocimiento"** / **"Las siete artes liberales"**

Alexa responderá con el Maestro Masón dando la bienvenida al templo del conocimiento con voz premium de ElevenLabs (Daniel).

---

## Las 7 Artes Liberales

### TRIVIUM — Artes del Lenguaje

| Arte | Comando de voz | Voz ElevenLabs | Personalidad |
|------|---------------|----------------|--------------|
| **Gramática** | *"habla con el maestro de gramática"* | Antoni (`ErXwobaYiN019PkySvjV`) | Analítico, preciso. Metáforas de construcción y arquitectura |
| **Retórica** | *"habla con el maestro de retórica"* | Adam (`pNInz6obpgDQGcFmaJgB`) | Elocuente, persuasivo. Metáforas de luz y transformación |
| **Lógica** | *"habla con el maestro de lógica"* | Antoni (`ErXwobaYiN019PkySvjV`) | Riguroso, analítico. Metáforas de herramientas y medición |

### QUADRIVIUM — Artes Matemáticas

| Arte | Comando de voz | Voz ElevenLabs | Personalidad |
|------|---------------|----------------|--------------|
| **Aritmética** | *"habla con el maestro de aritmética"* | Arnold (`VR6AewLTigWG4xSOukaG`) | Metódico, místico. Números sagrados 3, 5, 7 |
| **Geometría** | *"habla con el maestro de geometría"* | Bella (`EXAVITQu4vr4xnSDxMaL`) | Visual, contemplativa. Proporciones divinas |
| **Música** | *"habla con el maestro de música"* | Bella (`EXAVITQu4vr4xnSDxMaL`) | Poética, armónica. Vibración y resonancia cósmica |
| **Astronomía** | *"habla con el maestro de astronomía"* | Adam (`pNInz6obpgDQGcFmaJgB`) | Contemplativo, trascendente. Ciclos celestiales |

### MAESTRO MASÓN — Síntesis

| Rol | Comando de voz | Voz ElevenLabs | Personalidad |
|-----|---------------|----------------|--------------|
| **Maestro Masón** | *"habla con el maestro masón"* / *"consulta al gran maestro"* | Daniel (`onwK4e9ZLuTAKqWW03F9`) | Sabio, equilibrado. Guía espiritual de todas las artes |

---

## Flujo de conversación

```
Usuario: "Activa el modo secreto"
Maestro Masón: Bienvenida al templo + descripción de las 7 artes

Usuario: "Habla con el maestro de geometría"
Maestro de Geometría: Responde con su personalidad y voz Bella

Usuario: "¿Qué es la proporción áurea?"
Maestro de Geometría: Explica con metáforas masónicas de diseño divino

Usuario: "Consulta al gran maestro"
Maestro Masón: Síntesis y guía hacia la siguiente arte
```

---

## Preguntas de ejemplo por arte

**Gramática:**
- *"¿Por qué es importante la gramática en el pensamiento?"*
- *"¿Cómo construyo ideas claras con las palabras?"*

**Retórica:**
- *"¿Cómo persuado con elegancia?"*
- *"¿Cuáles son los pilares de un buen discurso?"*

**Lógica:**
- *"¿Qué es un silogismo?"*
- *"¿Cómo detecto falacias en un argumento?"*

**Aritmética:**
- *"¿Qué significado tienen los números sagrados?"*
- *"¿Por qué el 7 es especial en la tradición masónica?"*

**Geometría:**
- *"¿Qué es la geometría sagrada?"*
- *"¿Qué simboliza el compás y la escuadra?"*

**Música:**
- *"¿Cómo se relaciona la música con las matemáticas?"*
- *"¿Qué es la armonía de las esferas?"*

**Astronomía:**
- *"¿Qué significan las estrellas para el iniciado?"*
- *"¿Cómo guían los astros el camino del conocimiento?"*

**Maestro Masón:**
- *"¿Cómo se relacionan todas las artes entre sí?"*
- *"¿Cuál es el camino hacia la luz?"*
- *"¿Qué debo estudiar primero?"*

---

## Arquitectura técnica

```
SecretRouteIntent → SecretModeIntentHandler
                    └─ generarAudioPremium(speech, 'maestro') → ElevenLabs → S3

ArteLiberalIntent → ArteLiberalIntentHandler
                    └─ procesarArteLiberal(pregunta, arte)
                        ├─ consultarClaude(prompt especializado del maestro, timeout 4s)
                        ├─ generarAudioPremium(respuesta, arte) → ElevenLabs → S3
                        └─ generarAPL(símbolos del arte)
```

**Flujo de audio:**
1. Claude genera el texto de respuesta (~3-4s, timeout 4s)
2. ElevenLabs sintetiza con la voz del maestro (~2-3s, timeout 10s)
3. Audio MP3 se sube a S3 con acceso público (bucket policy)
4. Alexa reproduce `<audio src="https://alexa-profesor-universal-cache-us-east-1.s3.amazonaws.com/audio/premium/{key}.mp3"/>`
5. Si ElevenLabs falla → fallback a voz nativa de Alexa

**Variables de entorno requeridas:**
- `ELEVENLABS_API_KEY` — API key de ElevenLabs (Free Tier disponible)

**Infraestructura S3:**
- **Bucket:** `alexa-profesor-universal-cache-us-east-1`
- **Path:** `/audio/premium/` — audios generados (TTL 24h por CacheControl)
- **Acceso:** Público via bucket policy (no ACL)
- **Policy:** `scripts/s3-bucket-policy-audio-public.json`

**Utterances de activación (es-ES.json):**
- "la palabra es Boaz"
- "pronuncio la palabra Boaz"
- "digo la palabra sagrada Boaz"
- "mi palabra es Boaz"
- "abre el templo del conocimiento"
- "activa el templo del conocimiento"
- "quiero entrar al templo"
- "las siete artes liberales"
- "trivium y quadrivium"
- "enseñanzas masónicas"
- "templo del conocimiento"
- "activa el modo de las artes liberales"
- "quiero las artes liberales"
- "modo artes liberales"

---

## Notas Técnicas

- El modo secreto requiere que `sessionAttributes.modoSecreto === true` para que `ArteLiberalIntent` funcione
- Si ElevenLabs no tiene API key configurada, todas las respuestas usan voz nativa de Alexa como fallback
- Los audios se generan en tiempo real (no hay caché de audio)
- Tiempo total por consulta: ~6-8s (Claude 4s + ElevenLabs 2-3s)
- Speech del Maestro Masón acortado a ~140 caracteres para reducir tiempo de síntesis
- Bucket policy S3 permite acceso público sin necesidad de ACL en objetos individuales

## Deployment

Los archivos del modo secreto están en `.gitignore` y NO se suben al repositorio público:
- `lambda/handlers/SecretRouteIntentHandler.js`
- `lambda/handlers/artesLiberalesRoutes.js`
- `lambda/services/elevenlabs.js`
- `docs/MODO_SECRETO.md`

Para desplegar cambios del modo secreto:
1. Modificar archivos localmente
2. Ejecutar workflow `deploy-lambda-private.yml` manualmente desde GitHub Actions
3. O hacer push desde un repositorio privado que contenga estos archivos

El workflow `deploy-lambda.yml` (público) excluye estos archivos del deployment automático.
