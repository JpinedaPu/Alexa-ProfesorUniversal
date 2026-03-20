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
  // Budget total para las 2 llamadas Wolfram
  const wolframBudget = Math.max(3000, 5500 - elapsed);

  // FASE 1: Llamada normal a Wolfram (sin SBS) — solo para obtener texto + imágenes normales
  // Timeout agresivo: máximo 2500ms para dejar tiempo a Claude y SBS
  const FASE1_TIMEOUT = Math.min(2500, wolframBudget - 1000);
  const wolframFase1 = await consultarWolfram(keyword, null, { isStepByStep: false, timeoutMs: FASE1_TIMEOUT });

  if (!wolframFase1 || wolframFase1.imagenes.length === 0) {
    console.log('[MATH-ROUTE] Wolfram fase1 sin resultados, fallback a ruta normal');
    return null;
  }

  const textoResultado = wolframFase1.texto || wolframFase1.textoResult || '';
  const elapsedFase1 = Date.now() - startTime;
  console.log(`[MATH-ROUTE] Wolfram fase1 OK: ${wolframFase1.imagenes.length} imgs | canSBS=${wolframFase1.canStepByStep} | T+${elapsedFase1}ms`);

  // FASE 2: Claude + Wolfram SBS EN PARALELO
  // Claude arranca con el texto de fase1 — no necesita esperar los pasos
  // Wolfram SBS busca los pasos para el botón APL
  // Claude y SBS corren en paralelo con budgets independientes
  // SBS tiene hasta 4500ms — suficiente para que Wolfram expanda los pasos
  const claudeBudget = Math.max(2000, 7600 - elapsedFase1 - 200);
  const sbsBudget    = Math.min(4500, Math.max(2500, 7600 - elapsedFase1 - 500));

  const claudePromise = consultarClaude(
    pregunta, textoResultado, '', '', keyword, [],
    { timeout: claudeBudget }
  );

  // Solo lanzar SBS si Wolfram detectó podstate en fase1
  const sbsPromise = wolframFase1.canStepByStep
    ? consultarWolfram(keyword, null, { isStepByStep: true, timeoutMs: sbsBudget })
    : Promise.resolve(null);

  const [claudeResponse, wolframSBS] = await Promise.all([claudePromise, sbsPromise]);

  const imagenesPasos  = wolframSBS?.canStepByStep ? (wolframSBS.imagenes || []) : [];
  const imagenesVista  = wolframFase1.imagenes;
  const tituloAPL      = formatearTituloMatematico(keyword);
  const speech         = claudeResponse?.speech || 'Aquí está la solución matemática.';
  const displayBottom  = claudeResponse?.displayBottom || claudeResponse?.displayTop || '';

  console.log(`[MATH-ROUTE] Completada | pasos=${imagenesPasos.length} canSBS=${wolframFase1.canStepByStep} | T+${Date.now() - startTime}ms`);

  return {
    speech,
    displayTop: tituloAPL,
    displayBottom,
    imagenes: imagenesVista,
    imagenesPasos,
    canStepByStep: wolframFase1.canStepByStep,
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
