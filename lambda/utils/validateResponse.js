/**
 * @fileoverview Validador de respuestas de speech para compatibilidad con Alexa.
 * Verifica que las respuestas generadas por IA sean seguras, válidas y cumplan
 * con los requisitos de SSML y longitud de Amazon Alexa.
 * 
 * @version 7.7.0
 * @author Profesor Universal IA Team
 */

/**
 * Valida que una respuesta de speech sea segura y compatible con Alexa.
 * Verifica longitud mínima, formato SSML válido y estructura de etiquetas.
 * 
 * @param {string} speech - Texto de speech a validar (puede contener SSML)
 * @returns {boolean} true si la respuesta es válida para Alexa
 */
module.exports.validateSpeech = (speech) => {
  if (!speech || typeof speech !== 'string') return false;
  
  // Limpiar SSML para validar longitud real del contenido
  const clean = speech.replace(/<[^>]+>/g, '').trim();
  if (clean.length < 2) return false;
  
  // Validar SSML: ignorar self-closing tags, solo rechazar si hay etiquetas desbalanceadas
  const selfClosing = (speech.match(/<[a-zA-Z0-9:]+[^>]*\/>/g) || []).length;
  const openTags = (speech.match(/<([a-zA-Z0-9:]+)(\s[^>]*)?>/g) || []).length - selfClosing;
  const closeTags = (speech.match(/<\/(?:[a-zA-Z0-9:]+)>/g) || []).length;
  if (openTags !== closeTags) return false;
  
  return true;
};
