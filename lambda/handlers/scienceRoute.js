/**
 * scienceRoute.js
 * Ruta especializada para preguntas científicas
 * Integra NASA Images API y Wikimedia Commons
 */

const { consultarWolfram } = require('../services/wolfram');
const { consultarWikipedia } = require('../services/wikipedia');
const { consultarClaude } = require('../services/claude');
const { buscarImagenesNASA } = require('../utils/imagenesExtra');

/**
 * Detecta si una pregunta es científica
 * @param {string} pregunta
 * @returns {boolean}
 */
function esPreguntaCientifica(pregunta) {
  const p = pregunta.toLowerCase();
  
  const keywords = /\b(agujero\s+negro|estrella|planeta|galaxia|nebulosa|cometa|asteroide|satelite|telescopio|nasa|hubble|james\s+webb|sistema\s+solar|via\s+lactea|big\s+bang|universo|cosmos|astronomia|astrofisica|quasar|pulsar|supernova|materia\s+oscura|energia\s+oscura)\b/i;
  
  return keywords.test(p);
}

/**
 * Clasifica el tipo de pregunta científica
 * @param {string} pregunta
 * @returns {string} - 'astronomia'|'fisica'|'quimica'|'biologia'|'otro'
 */
function clasificarPreguntaCientifica(pregunta) {
  const p = pregunta.toLowerCase();
  
  if (/\b(agujero\s+negro|estrella|planeta|galaxia|nebulosa|universo|cosmos)\b/i.test(p)) {
    return 'astronomia';
  }
  if (/\b(velocidad|masa|energia|fuerza|gravedad|luz|onda|particula)\b/i.test(p)) {
    return 'fisica';
  }
  if (/\b(atomo|molecula|elemento|reaccion|quimica|compuesto)\b/i.test(p)) {
    return 'quimica';
  }
  if (/\b(celula|adn|gen|organismo|evolucion|especie)\b/i.test(p)) {
    return 'biologia';
  }
  
  return 'otro';
}

/**
 * Ejecuta la ruta científica completa
 * @param {string} pregunta
 * @param {string} keyword
 * @returns {Promise<Object>}
 */
async function ejecutarRutaCientifica(pregunta, keyword) {
  console.log('[SCIENCE-ROUTE] Iniciando ruta científica');
  
  const tipo = clasificarPreguntaCientifica(pregunta);
  console.log(`[SCIENCE-ROUTE] Tipo detectado: ${tipo}`);
  
  // 1. Consultas paralelas
  const [wolfram, wiki, imagenesNASA] = await Promise.all([
    consultarWolfram(keyword, null, { timeout: 3000 }),
    consultarWikipedia(keyword),
    tipo === 'astronomia' ? buscarImagenesNASA(keyword, 10) : Promise.resolve([])
  ]);
  
  console.log(`[SCIENCE-ROUTE] Wolfram: ${wolfram.imagenes.length} imgs | Wiki: ${wiki.texto.length}ch | NASA: ${imagenesNASA.length} imgs`);
  
  // 2. Síntesis con Claude
  const resultadoClaude = await consultarClaude(
    pregunta,
    wolfram.texto || '',
    wiki.texto || '',
    '',
    keyword,
    [],
    { timeout: 3000 }
  );
  
  const speech = resultadoClaude.speech || 'Aquí está la información científica que buscabas.';
  
  // 3. Combinar imágenes
  const todasImagenes = [
    ...wolfram.imagenes,
    ...imagenesNASA.map(img => ({
      titulo: img.titulo || 'NASA',
      url: img.url,
      width: 800,
      height: 600
    }))
  ].slice(0, 20);
  
  return {
    speech: speech || 'Aquí está la información científica que buscabas.',
    displayTop: `Ciencia: ${keyword}`,
    displayBottom: wiki.texto ? wiki.texto.substring(0, 300) : wolfram.texto.substring(0, 300),
    imagenes: todasImagenes,
    canStepByStep: false,
    tipo: tipo,
    keyword: keyword,
    fuenteNASA: imagenesNASA.length > 0
  };
}

module.exports = {
  esPreguntaCientifica,
  clasificarPreguntaCientifica,
  ejecutarRutaCientifica
};
