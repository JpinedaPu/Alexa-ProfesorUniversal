/**
 * @fileoverview Mensajes de fallback seguros y contextuales para el Profesor Universal IA.
 * Proporciona respuestas de error amigables y educativas cuando fallan los servicios principales.
 * Mantiene la experiencia de usuario positiva incluso en situaciones de error.
 * 
 * @version 7.7.0
 * @author Profesor Universal IA Team
 */

/**
 * Genera mensajes de fallback contextuales para diferentes tipos de error.
 * Mantiene un tono educativo y positivo incluso en situaciones de fallo.
 * 
 * @param {string} context - Contexto del error ('timeout', 'nodata', 'error', etc.)
 * @returns {string} Mensaje de fallback apropiado para el contexto
 */
module.exports.fallbackSpeech = (context) => {
  if (context === 'timeout') return 'La respuesta está tardando más de lo esperado. ¿Puedes intentar de nuevo?';
  if (context === 'nodata') return 'No encontré información sobre eso en este momento. ¿Quieres preguntarme algo más?';
  return 'Ups, algo no salió bien. ¿Intentamos con otra pregunta?';
};
