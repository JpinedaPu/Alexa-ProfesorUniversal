/**
 * @fileoverview Utilidad para manejar timeouts de promesas de forma robusta.
 * Proporciona una función wrapper que permite establecer límites de tiempo
 * para operaciones asíncronas con valores de fallback seguros.
 * 
 * @version 7.7.0
 * @author Profesor Universal IA Team
 */

/**
 * Ejecuta una promesa con un timeout específico y valor de fallback.
 * Si la promesa no se resuelve dentro del tiempo límite, retorna el fallback.
 * Limpia automáticamente el timer para evitar memory leaks.
 * 
 * @param {Promise} promise - Promesa a ejecutar con timeout
 * @param {number} ms - Tiempo límite en milisegundos
 * @param {*} fallback - Valor a retornar si se excede el timeout
 * @returns {Promise<*>} Resultado de la promesa o valor de fallback
 */
module.exports.withTimeout = async (promise, ms, fallback) => {
  let timeout;
  const timer = new Promise(resolve => {
    timeout = setTimeout(() => resolve(fallback), ms);
  });
  const result = await Promise.race([promise, timer]);
  clearTimeout(timeout); // Importante: limpiar timer para evitar memory leaks
  return result;
};
