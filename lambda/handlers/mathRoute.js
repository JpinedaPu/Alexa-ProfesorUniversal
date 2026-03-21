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
    .replace(/\bintegral\s+of\b/gi, '∫')
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

const { PERFORMANCE } = require('../config/constants');

/**
 * Ejecuta la ruta matemática completa
 * @param {string} pregunta - Pregunta matemática del usuario
 * @param {string} keyword - Keyword extraído
 * @param {number} startTime
 * @param {Array} historial - Historial de conversación para contexto
 * @returns {Promise<Object>} Resultado con pasos matemáticos
 */
async function ejecutarRutaMatematica(pregunta, keyword, startTime = Date.now(), historial = []) {
  console.log('[MATH-ROUTE] Iniciando ruta matemática');

  const tipo = clasificarProblemaMatematico(pregunta);
  console.log(`[MATH-ROUTE] Tipo detectado: ${tipo}`);

  const DEADLINE = startTime + PERFORMANCE.GLOBAL_DEADLINE_MS; // usa constante global

  // FASE 1: Wolfram CON detección SBS — obtiene texto + imágenes normales + podstates
  // Timeout: 4000ms para consultas matemáticas complejas
  const FASE1_TIMEOUT = Math.min(4000, DEADLINE - Date.now() - 3500);
  if (FASE1_TIMEOUT < 2000) {
    console.log(`[MATH-ROUTE] Sin tiempo para Wolfram | elapsed=${Date.now() - startTime}ms | FASE1_TIMEOUT=${FASE1_TIMEOUT}ms | fallback a ruta normal`);
    return null;
  }

  const promptMath = `Eres el "Profesor Universal IA". El usuario preguntó: "${pregunta}".
Responde SOLO con JSON válido:
{"speech": "...", "displayBottom": "...", "keyword": "${keyword}"}

- "speech": explica el resultado en español, tono didáctico y entusiasta. Máximo 3 frases. Sin símbolos unicode (use palabras: "al cuadrado", "más", etc.).
- "displayBottom": resumen del PROCESO matemático para la pantalla (diferente al speech). Ej: "Regla del producto: (f·g)' = f'·g + f·g'. Resultado: 2x·sen(x) + x²·cos(x)". Máximo 150 caracteres.
- "keyword": el concepto matemático principal en inglés.
Sin texto fuera del JSON.`;

  const wolframFase1 = await consultarWolfram(keyword, null, { 
    isStepByStep: true, 
    detectOnly: true,  // Solo detectar podstates, NO hacer llamada 2
    timeoutMs: FASE1_TIMEOUT 
  });

  if (!wolframFase1 || wolframFase1.imagenes.length === 0) {
    console.log('[MATH-ROUTE] Wolfram fase1 sin resultados, fallback a ruta normal');
    return { fallback: true, wolframFailed: true };
  }

  const textoResultado = wolframFase1.texto || wolframFase1.textoResult || '';
  const elapsedFase1 = Date.now() - startTime;
  console.log(`[MATH-ROUTE] Wolfram fase1 OK: ${wolframFase1.imagenes.length} imgs | canSBS=${wolframFase1.canStepByStep} | T+${elapsedFase1}ms`);

  // Una sola llamada a Claude con el texto de Wolfram ya disponible
  const claudeBudget = Math.max(1500, DEADLINE - Date.now() - 50);
  console.log(`[MATH-ROUTE] claudeBudget=${claudeBudget}ms | T+${elapsedFase1}ms`);
  const claudeResponse = await consultarClaude(
    pregunta, textoResultado, '', '', keyword, historial.slice(-4),
    { timeout: claudeBudget, prompt: promptMath }
  );

  // NO hacer llamada SBS aquí — se hace cuando usuario activa modo wolfram (botón APL o voz)
  // stepByStepData contiene los podstates necesarios para la llamada 2 de wolfram.js
  const imagenesPasos  = [];  // Se llenan en WolframAlphaModeIntentHandler
  const stepByStepData = wolframFase1.stepByStepData || [];
  const imagenesVista  = wolframFase1.imagenes;
  const tituloAPL      = formatearTituloMatematico(keyword);
  const speech         = claudeResponse?.speech || 'Aquí está la solución matemática.';
  const displayBottom  = claudeResponse?.displayBottom || claudeResponse?.displayTop || '';
  console.log(`[MATH-ROUTE] Claude OK | speech=${speech.length}ch | canSBS=${wolframFase1.canStepByStep} | T+${Date.now() - startTime}ms`);

  console.log(`[MATH-ROUTE] Completada | pasos=${imagenesPasos.length} canSBS=${wolframFase1.canStepByStep} | T+${Date.now() - startTime}ms`);

  return {
    speech,
    displayTop: tituloAPL,
    // textoSuperior APL = resultado concreto de Wolfram (no el título)
    // Se extrae del texto de Wolfram: buscar la línea "Derivative: ..." o "Result: ..."
    displayTopAPL: (() => {
      if (!textoResultado) return tituloAPL;
      // Buscar resultado directo en el texto de Wolfram
      const lines = textoResultado.split('.').map(l => l.trim()).filter(l => l.length > 3);
      const resultLine = lines.find(l =>
        /^(Derivative|Result|Integral|Solution|Roots?|Answer):/i.test(l)
      );
      if (resultLine) return resultLine.replace(/^[^:]+:\s*/i, '').trim().substring(0, 120);
      // Fallback: primera línea sustancial del texto
      return lines[0] ? lines[0].substring(0, 120) : tituloAPL;
    })(),
    displayBottom,
    imagenes: imagenesVista,
    imagenesPasos,
    stepByStepData,
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
