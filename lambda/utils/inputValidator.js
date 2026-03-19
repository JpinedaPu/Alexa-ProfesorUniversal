/**
 * inputValidator.js
 * Valida y sanitiza entrada del usuario
 */

const { INPUT } = require('../config/constants');

/**
 * Valida que una pregunta sea válida
 * @param {string} pregunta
 * @returns {Object} { valida: boolean, razon: string }
 */
function validarPregunta(pregunta) {
  if (!pregunta || typeof pregunta !== 'string') {
    return { valida: false, razon: 'Pregunta vacía o inválida' };
  }
  
  const limpia = pregunta.trim();
  
  if (limpia.length < INPUT.MIN_QUESTION_LENGTH) {
    return { valida: false, razon: 'Pregunta demasiado corta' };
  }
  
  if (limpia.length > INPUT.MAX_QUESTION_LENGTH) {
    return { valida: false, razon: 'Pregunta demasiado larga' };
  }
  
  // Detectar spam o caracteres repetidos
  if (/(.)\1{10,}/.test(limpia)) {
    return { valida: false, razon: 'Caracteres repetidos detectados' };
  }
  
  return { valida: true, razon: '' };
}

/**
 * Sanitiza una pregunta eliminando caracteres peligrosos
 * @param {string} pregunta
 * @returns {string}
 */
function sanitizarPregunta(pregunta) {
  if (!pregunta) return '';
  
  return pregunta
    .trim()
    .replace(/[<>]/g, '') // Eliminar < >
    .replace(/\s+/g, ' ') // Normalizar espacios
    .substring(0, INPUT.MAX_QUESTION_LENGTH);
}

module.exports = {
  validarPregunta,
  sanitizarPregunta
};
