// Modulo centralizado de traducción para Alexa Skill
// Usa GPT-4o para traducción y preparación de voz Alexa
// Optimizado para textos largos y contexto pedagógico


const { traducirGPT } = require('./gpt');
const { withTimeout } = require('../utils/timeoutManager');
const { validateSpeech } = require('../utils/validateResponse');
const { fallbackSpeech } = require('../utils/fallback');
const { logStep } = require('../utils/logger');

// --- Cache global de traducción ---
const traduccionCache = {};
function getCacheKey(texto, origen, destino, modo) {
    return require('crypto').createHash('sha1').update((texto || '').trim() + '_' + origen + '_' + destino + '_' + (modo || 'normal')).digest('hex');
}

/**
 * Traduce texto entre idiomas. Google Translate por defecto, GPT como fallback.
 * Para textos largos (más de 200 caracteres), usa solo GPT para traducción y preparación de voz Alexa.
 * @param {string} texto - Texto a traducir
 * @param {string} origen - Código ISO del idioma origen
 * @param {string} destino - Código ISO del idioma destino
 * @param {object} [opciones] - { modo: 'normal'|'voz' } Si modo es 'voz', GPT prepara respuesta para Alexa
 * @returns {Promise<string>} Texto traducido
 */

/**
 * Traduce texto entre idiomas de forma robusta y modular.
 * - Usa detección simple de español para evitar llamadas innecesarias.
 * - Usa GPT-4o para traducción y preparación de voz.
 */
async function traducir(texto, origen, destino, opciones = {}) {
    if (!texto || origen === destino) return texto;
    
    // Limpiar HTML y saltos de línea
    let limpio = (texto + '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (limpio.length < 2) return limpio;

    // --- OPT: Detección simple de español para evitar llamadas a la API ---
    // Si el destino es 'es' y el texto contiene palabras muy comunes en español que no existen en inglés
    const esEspanyol = (destino === 'es' && /\b(el|la|los|las|de|y|que|en|un|una|con|por|para|está|es|son|hay|tiene)\b/i.test(limpio));
    if (esEspanyol) {
        logStep('skipTranslation', { motivo: 'Detección de español activa', length: limpio.length });
        return limpio;
    }

    // Limitar longitud para evitar timeouts
    if (limpio.length > 900) limpio = limpio.slice(0, 900) + '...';

    const cacheKey = getCacheKey(limpio, origen, destino, opciones.modo);
    if (traduccionCache[cacheKey]) {
        logStep('cacheHit', { origen, destino, modo: opciones.modo, length: limpio.length });
        return traduccionCache[cacheKey];
    }

    let resultado = limpio;
    try {
        const t0 = Date.now();
        // Aumentamos timeout a 2.5s para mayor robustez en redes variables
        resultado = await withTimeout(traducirGPT(limpio, origen, destino, {
            modo: opciones.modo,
            timeout: 2500,
            t0_global: opciones.t0_global,
            promptSimple: true
        }), 2500, limpio); // fallback al texto original, no al mensaje de error
        
        const t1 = Date.now();
        logStep('traduccionGPT', { origen, destino, ms: t1-t0, length: limpio.length });
    } catch (e) {
        logStep('errorGPT', { origen, destino, error: e.message });
        resultado = limpio; // Fallback al texto original, no al mensaje de error
    }

    if (!validateSpeech(resultado)) resultado = fallbackSpeech('nodata');
    
    // Evitar memory leak (limitar a 50 entradas)
    const cacheKeys = Object.keys(traduccionCache);
    if (cacheKeys.length >= 50) {
        delete traduccionCache[cacheKeys[0]];
    }
    
    traduccionCache[cacheKey] = resultado;
    return resultado;
}

module.exports = { traducir };