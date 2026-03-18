/**
 * artesLiberalesRoutes.js
 * Rutas especializadas para cada una de las 7 Artes Liberales
 * Conocimiento profundo del Trivium y Quadrivium
 */

const { generarAudioPremium } = require('../services/elevenlabs');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { consultarWolfram } = require('../services/wolfram');

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const MODEL_HAIKU = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';

/**
 * Invoca Claude Haiku para generar respuestas de las 7 Artes Liberales
 * @param {string} prompt - Prompt especializado por arte
 * @param {Object} opciones - { maxTokens, temperature }
 * @returns {Promise<string>} Respuesta de Claude
 */
async function invocarClaude(prompt, opciones = {}) {
    const { maxTokens = 300, temperature = 0.3 } = opciones;
    
    const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }]
    };
    
    try {
        const cmd = new InvokeModelCommand({
            modelId: MODEL_HAIKU,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(payload)
        });
        const res = await bedrockClient.send(cmd);
        const body = JSON.parse(Buffer.from(res.body).toString('utf-8'));
        const texto = body.content?.[0]?.text?.trim() || '';
        console.log(`[CLAUDE-7ARTES] Respuesta generada: ${texto.length} chars`);
        return texto;
    } catch (err) {
        console.error('[CLAUDE-7ARTES] Error:', err.message);
        throw new Error('No se pudo generar respuesta de Claude');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIVIUM - Artes del Lenguaje
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GRAMÁTICA - La estructura del lenguaje
 * Etimología, morfología, sintaxis, fonética
 */
async function rutaGramatica(pregunta) {
  const prompt = `Como maestro de Gramática del Trivium clásico, responde esta pregunta con rigor académico.
Incluye etimología (latín/griego), estructura morfológica y ejemplos claros.

Pregunta: ${pregunta}

Responde en español, máximo 150 palabras, estilo académico pero accesible.`;

  const respuesta = await invocarClaude(prompt, { maxTokens: 300 });
  const audioUrl = await generarAudioPremium(respuesta, 'gramatica');
  
  return {
    texto: respuesta,
    audio: audioUrl,
    arte: 'Gramática',
    simbolo: '📚',
    categoria: 'Trivium'
  };
}

/**
 * RETÓRICA - El arte de la persuasión
 * Figuras retóricas, argumentación, oratoria
 */
async function rutaRetorica(pregunta) {
  const prompt = `Como maestro de Retórica del Trivium clásico, responde esta pregunta sobre el arte de la persuasión.
Usa las tres pruebas aristotélicas (ethos, pathos, logos) cuando sea relevante.
Menciona figuras retóricas específicas si aplica.

Pregunta: ${pregunta}

Responde en español, máximo 150 palabras, con ejemplos persuasivos.`;

  const respuesta = await invocarClaude(prompt, { maxTokens: 300 });
  const audioUrl = await generarAudioPremium(respuesta, 'retorica');
  
  return {
    texto: respuesta,
    audio: audioUrl,
    arte: 'Retórica',
    simbolo: '🎭',
    categoria: 'Trivium'
  };
}

/**
 * LÓGICA - El arte del razonamiento correcto
 * Silogismos, falacias, deducción, inducción
 */
async function rutaLogica(pregunta) {
  const prompt = `Como maestro de Lógica del Trivium clásico, responde esta pregunta sobre razonamiento correcto.
Usa silogismos aristotélicos cuando sea apropiado.
Identifica falacias si están presentes en la pregunta.
Aplica las leyes del pensamiento: identidad, no contradicción, tercero excluido.

Pregunta: ${pregunta}

Responde en español, máximo 150 palabras, con estructura lógica clara.`;

  const respuesta = await invocarClaude(prompt, { maxTokens: 300 });
  const audioUrl = await generarAudioPremium(respuesta, 'logica');
  
  return {
    texto: respuesta,
    audio: audioUrl,
    arte: 'Lógica',
    simbolo: '⚖️',
    categoria: 'Trivium'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUADRIVIUM - Artes Matemáticas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ARITMÉTICA - La ciencia de los números
 * Números primos, proporciones, teoría numérica pitagórica
 */
async function rutaAritmetica(pregunta) {
  // Intentar Wolfram primero para cálculos exactos
  let datosWolfram = '';
  try {
    const resultado = await consultarWolfram(pregunta, null, { timeout: 2000 });
    datosWolfram = resultado?.texto || '';
  } catch (e) {
    console.log('[ARITMETICA] Wolfram no disponible, usando solo Claude');
  }

  const prompt = `Como maestro de Aritmética del Quadrivium clásico, responde esta pregunta sobre la ciencia de los números.
Conecta con la filosofía pitagórica: "Todo es número".
Explica propiedades numéricas, patrones y relaciones.
${datosWolfram ? `\n\nDatos de Wolfram Alpha:\n${datosWolfram}` : ''}

Pregunta: ${pregunta}

Responde en español, máximo 150 palabras, revelando la belleza matemática.`;

  const respuesta = await invocarClaude(prompt, { maxTokens: 300 });
  const audioUrl = await generarAudioPremium(respuesta, 'aritmetica');
  
  return {
    texto: respuesta,
    audio: audioUrl,
    arte: 'Aritmética',
    simbolo: '🔢',
    categoria: 'Quadrivium'
  };
}

/**
 * GEOMETRÍA - La ciencia del espacio y las formas
 * Euclides, proporción áurea, geometría sagrada
 */
async function rutaGeometria(pregunta) {
  const prompt = `Como maestro de Geometría del Quadrivium clásico, responde esta pregunta sobre formas y espacio.
Usa los Elementos de Euclides como base.
Menciona la proporción áurea (φ = 1.618...) si es relevante.
Conecta con geometría sagrada y arquitectura del templo cuando sea apropiado.

Pregunta: ${pregunta}

Responde en español, máximo 150 palabras, revelando el orden geométrico del cosmos.`;

  const respuesta = await invocarClaude(prompt, { maxTokens: 300 });
  const audioUrl = await generarAudioPremium(respuesta, 'geometria');
  
  return {
    texto: respuesta,
    audio: audioUrl,
    arte: 'Geometría',
    simbolo: '📐',
    categoria: 'Quadrivium'
  };
}

/**
 * MÚSICA - La ciencia de la armonía
 * Intervalos, proporciones pitagóricas, música de las esferas
 */
async function rutaMusica(pregunta) {
  const prompt = `Como maestro de Música del Quadrivium clásico, responde esta pregunta sobre armonía y proporción.
Explica los intervalos musicales como razones matemáticas (octava=2:1, quinta=3:2, cuarta=4:3).
Menciona la "música de las esferas" pitagórica si es relevante.
Conecta matemáticas, física del sonido y estética.

Pregunta: ${pregunta}

Responde en español, máximo 150 palabras, revelando la armonía universal.`;

  const respuesta = await invocarClaude(prompt, { maxTokens: 300 });
  const audioUrl = await generarAudioPremium(respuesta, 'musica');
  
  return {
    texto: respuesta,
    audio: audioUrl,
    arte: 'Música',
    simbolo: '🎵',
    categoria: 'Quadrivium'
  };
}

/**
 * ASTRONOMÍA - La ciencia de los astros
 * Movimientos celestes, esferas, microcosmos y macrocosmos
 */
async function rutaAstronomia(pregunta) {
  // Intentar Wolfram para datos astronómicos precisos
  let datosWolfram = '';
  try {
    const resultado = await consultarWolfram(pregunta, null, { timeout: 2000 });
    datosWolfram = resultado?.texto || '';
  } catch (e) {
    console.log('[ASTRONOMIA] Wolfram no disponible, usando solo Claude');
  }

  const prompt = `Como maestro de Astronomía del Quadrivium clásico, responde esta pregunta sobre los cielos.
Integra conocimiento antiguo (Ptolomeo, esferas celestes) y moderno (Copérnico, Kepler, física actual).
Conecta el microcosmos (ser humano) con el macrocosmos (universo).
${datosWolfram ? `\n\nDatos astronómicos de Wolfram Alpha:\n${datosWolfram}` : ''}

Pregunta: ${pregunta}

Responde en español, máximo 150 palabras, revelando el orden cósmico.`;

  const respuesta = await invocarClaude(prompt, { maxTokens: 300 });
  const audioUrl = await generarAudioPremium(respuesta, 'astronomia');
  
  return {
    texto: respuesta,
    audio: audioUrl,
    arte: 'Astronomía',
    simbolo: '🌌',
    categoria: 'Quadrivium'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Exportar rutas
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  rutaGramatica,
  rutaRetorica,
  rutaLogica,
  rutaAritmetica,
  rutaGeometria,
  rutaMusica,
  rutaAstronomia
};
