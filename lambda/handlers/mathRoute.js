/**
 * mathRoute.js
 * Ruta especializada para preguntas matemáticas
 * Detecta automáticamente derivadas, integrales, ecuaciones y activa paso a paso
 */

const { consultarWolfram } = require('../services/wolfram');
const { consultarClaude } = require('../services/claude');

/**
 * Convierte keyword en inglés a título con símbolos matemáticos para APL.
 * Ej: "integrate 3*sin(x) + x^2" → "∫ 3·sen(x) + x² dx"
 */
function formatearTituloMatematico(keyword) {
  if (!keyword) return keyword;
  let t = keyword
    .replace(/\bintegrate\b/gi, '∫')
    .replace(/\bderivative of\b/gi, "d/dx")
    .replace(/\bderivative\b/gi, "d/dx")
    .replace(/\blimit of\b/gi, 'lím')
    .replace(/\blimit\b/gi, 'lím')
    .replace(/\bsqrt\(([^)]+)\)/gi, '√($1)')
    .replace(/\bsin\(/gi, 'sen(')
    .replace(/\bcos\(/gi, 'cos(')
    .replace(/\btan\(/gi, 'tan(')
    .replace(/\^2\b/g, '²')
    .replace(/\^3\b/g, '³')
    .replace(/\^4\b/g, '⁴')
    .replace(/\*/g, '·')
    .replace(/\bdx\b/gi, 'dx');
  // Si empieza con ∫ y no termina en dx, agregar dx
  if (t.startsWith('∫') && !/dx\s*$/.test(t)) t = t + ' dx';
  return t.trim();
}

/**
 * Detecta si una pregunta es matemática
 * @param {string} pregunta - Pregunta del usuario
 * @returns {boolean}
 */
function esPreguntaMatematica(pregunta) {
  const p = pregunta.toLowerCase();
  
  // Palabras clave matemáticas
  const keywords = /\b(derivada|integral|limite|ecuacion|resuelve|calcula|factoriza|simplifica|grafica|matriz|determinante|vector|suma|resta|multiplica|divide|raiz|logaritmo|exponencial|trigonometrica|seno|coseno|tangente|factorial|combinatoria|permutacion)\b/i;
  
  // Notación matemática
  const notation = /\b(x\s*\^|x\s+al\s+(cuadrado|cubo)|sen\(|cos\(|tan\(|log\(|ln\(|sqrt\(|\d+\s*[+\-*/]\s*\d+)\b/i;
  
  return keywords.test(p) || notation.test(p);
}

/**
 * Clasifica el tipo de problema matemático
 * @param {string} pregunta
 * @returns {string} - 'derivada'|'integral'|'ecuacion'|'limite'|'aritmetica'|'otro'
 */
function clasificarProblemaMatematico(pregunta) {
  const p = pregunta.toLowerCase();
  
  if (/\b(derivada|deriva|diferencial)\b/i.test(p)) return 'derivada';
  if (/\b(integral|integra|antiderivada)\b/i.test(p)) return 'integral';
  if (/\b(ecuacion|resuelve|solve|igual a cero)\b/i.test(p)) return 'ecuacion';
  if (/\b(limite|tiende a|approaches)\b/i.test(p)) return 'limite';
  if (/\b(suma|resta|multiplica|divide|factorial|raiz)\b/i.test(p)) return 'aritmetica';
  
  return 'otro';
}

/**
 * Ejecuta la ruta matemática completa
 * @param {string} pregunta - Pregunta matemática del usuario
 * @param {string} keyword - Keyword extraído
 * @returns {Promise<Object>} Resultado con pasos matemáticos
 */
async function ejecutarRutaMatematica(pregunta, keyword, startTime = Date.now()) {
  console.log('[MATH-ROUTE] Iniciando ruta matemática');
  
  const tipo = clasificarProblemaMatematico(pregunta);
  console.log(`[MATH-ROUTE] Tipo detectado: ${tipo}`);

  const elapsed = Date.now() - startTime;
  const wolframBudget = Math.max(2500, 4500 - elapsed);

  // Llamada 1 (normal) y Claude en paralelo para ganar tiempo
  // Llamada 2 (SBS) se hace después con el tiempo restante
  const wolfram = await consultarWolfram(keyword, null, { isStepByStep: true, timeoutMs: wolframBudget });
  
  // imagenesNormales = pods resultado (llamada 1)
  // imagenes = SBSStep/SBSHintStep (llamada 2)
  const imagenesNormales = wolfram?.imagenesNormales || [];
  const imagenesPasos    = wolfram?.canStepByStep ? (wolfram?.imagenes || []) : [];
  const imagenesVista = imagenesNormales.length > 0 ? imagenesNormales : (wolfram?.imagenes || []);

  if (!wolfram || imagenesVista.length === 0) {
    console.log('[MATH-ROUTE] Wolfram sin resultados, fallback a ruta normal');
    return null;
  }
  
  console.log(`[MATH-ROUTE] Wolfram OK: normales=${imagenesVista.length} pasos=${imagenesPasos.length} canSBS=${wolfram.canStepByStep} | T+${Date.now() - startTime}ms`);
  
  const textoResultado = wolfram.texto || wolfram.textoResult || '';

  // Claude con el tiempo restante (mínimo 2000ms)
  const claudeBudget = Math.max(2000, 7400 - (Date.now() - startTime));
  const claudeResponse = await consultarClaude(
    pregunta, textoResultado, '', '', keyword, [],
    { timeout: claudeBudget, wolframResultado: textoResultado }
  );
  
  const speech = claudeResponse?.speech || 'Aquí está la solución matemática.';
  const displayBottom = claudeResponse?.displayBottom || claudeResponse?.displayTop || '';
  const tituloAPL = formatearTituloMatematico(keyword);
  
  console.log(`[MATH-ROUTE] Completada | T+${Date.now() - startTime}ms`);

  return {
    speech,
    displayTop: tituloAPL,
    displayBottom: displayBottom,
    imagenes: imagenesVista,
    imagenesPasos,
    canStepByStep: wolfram.canStepByStep || imagenesPasos.length > 0,
    tipo,
    keyword,
    tituloAPL
  };
}

module.exports = {
  esPreguntaMatematica,
  clasificarProblemaMatematico,
  ejecutarRutaMatematica,
  formatearTituloMatematico
};
