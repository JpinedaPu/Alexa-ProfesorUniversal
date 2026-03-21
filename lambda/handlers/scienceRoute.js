/**
 * scienceRoute.js
 * Ruta especializada para preguntas científicas
 * Integra NASA Images API y Wikimedia Commons
 */

const { consultarWolfram } = require('../services/wolfram');
const { consultarWikipedia } = require('../services/wikipedia');
const { consultarClaude } = require('../services/claude');
const { buscarImagenesExtra } = require('../utils/imagenesExtra');

/**
 * Detecta si una pregunta es científica
 * @param {string} pregunta
 * @returns {boolean}
 */
function esPreguntaCientifica(pregunta) {
  const p = pregunta.toLowerCase();
  const keywords = /\b(agujero\s+negro|estrella|planeta|galaxia|nebulosa|cometa|asteroide|satelite|telescopio|nasa|hubble|james\s+webb|sistema\s+solar|via\s+lactea|big\s+bang|universo|cosmos|astronomia|astrofisica|quasar|pulsar|supernova|materia\s+oscura|energia\s+oscura|velocidad|masa|energia|fuerza|gravedad|onda|particula|electromagnetismo|termodinamica|mecanica\s+cuantica|relatividad|atomo|molecula|elemento|reaccion\s+quimica|compuesto|tabla\s+periodica|celula|adn|gen|organismo|evolucion|especie|fotosintesis)\b/i;
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

const { PERFORMANCE } = require('../config/constants');

/**
 * Ejecuta la ruta científica completa
 * @param {string} pregunta
 * @param {string} keyword
 * @param {number} startTime
 * @param {Array} historial
 * @returns {Promise<Object>}
 */
async function ejecutarRutaCientifica(pregunta, keyword, startTime = Date.now(), historial = []) {
  console.log('[SCIENCE-ROUTE] Iniciando ruta científica');
  
  const tipo = clasificarPreguntaCientifica(pregunta);
  console.log(`[SCIENCE-ROUTE] Tipo detectado: ${tipo}`);
  
  // 1. Consultas paralelas — Wolfram con timeout dinámico para dejar margen a Claude
  const esEspacial = tipo === 'astronomia';
  const DEADLINE = startTime + PERFORMANCE.GLOBAL_DEADLINE_MS;
  const wolframBudget = Math.max(1500, Math.min(2500, DEADLINE - Date.now() - 3800));
  const [wolfram, wiki, imagenesExtra] = await Promise.all([
    consultarWolfram(keyword, null, { timeoutMs: wolframBudget }),
    consultarWikipedia(keyword),
    buscarImagenesExtra(keyword, esEspacial ? 15 : 8)
  ]);
  
  console.log(`[SCIENCE-ROUTE] Wolfram: ${wolfram.imagenes.length} imgs | Wiki: ${wiki.texto.length}ch | Extra: ${imagenesExtra.length} imgs | tipo: ${tipo} | wolframBudget: ${wolframBudget}ms`);
  
  // 2. Síntesis con Claude — tiempo restante real menos 200ms de margen
  const elapsed = Date.now() - startTime;
  const claudeBudget = Math.max(2000, Math.min(3800, PERFORMANCE.GLOBAL_DEADLINE_MS - elapsed - 200));
  console.log(`[SCIENCE-ROUTE] claudeBudget=${claudeBudget}ms | elapsed=${elapsed}ms`);
  const resultadoClaude = await consultarClaude(
    pregunta,
    wolfram.texto || '',
    wiki.texto || '',
    '',
    keyword,
    historial.slice(-4),
    { timeout: claudeBudget }
  );
  
  const speech = resultadoClaude.speech || 'Aquí está la información científica que buscabas.';
  const fuenteNASA = imagenesExtra.some(i => i.fuente === 'NASA');
  console.log(`[SCIENCE-ROUTE] Claude OK | speech=${speech.length}ch | fuenteNASA=${fuenteNASA} | T+${Date.now() - startTime}ms`);
  
  // Separar: Wolfram en imagenes (slot principal), NASA/Wikimedia en imagenesExtraPool
  const imagenesWolfram = wolfram.imagenes;
  const imagenesExtraPool = imagenesExtra.map(img => ({
    titulo: img.titulo || img.fuente || 'Ciencia',
    url: img.url,
    width: img.width || 800,
    height: img.height || 600
  }));

  return {
    speech,
    displayTop: resultadoClaude.displayTop || keyword,
    displayBottom: resultadoClaude.displayBottom || (wiki.texto ? wiki.texto.substring(0, 300) : (wolfram.texto || '').substring(0, 300)),
    imagenes: imagenesWolfram,
    imagenesExtraPool,
    imagenesExtraIniciales: imagenesExtraPool.slice(0, 6),
    hayMasImagenes: imagenesExtraPool.length > 6,
    canStepByStep: false,
    fuenteNASA,
    fuenteWolfram: imagenesWolfram.length > 0 || (wolfram.texto || '').length > 5,
    fuenteWikipedia: (wiki.texto || '').length > 10
  };
}

module.exports = {
  esPreguntaCientifica,
  clasificarPreguntaCientifica,
  ejecutarRutaCientifica
};
