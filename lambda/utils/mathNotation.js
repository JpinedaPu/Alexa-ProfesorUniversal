/**
 * mathNotation.js
 * Normaliza notación matemática en español a formato Wolfram Alpha
 */

/**
 * Convierte expresiones matemáticas en español a notación estándar
 * @param {string} texto - Texto con expresiones matemáticas en español
 * @returns {string} Texto normalizado para Wolfram Alpha
 */
function normalizarNotacionMatematica(texto) {
  if (!texto) return texto;
  
  let normalizado = texto;

  // Limpiar palabras en español que no son matemáticas
  normalizado = normalizado
    .replace(/\bla\s+funci[oó]n\b/gi, '')
    .replace(/\bla\s+expresi[oó]n\b/gi, '')
    .replace(/\bel\s+valor\s+de\b/gi, '')
    .replace(/\bde\s+la\b/gi, '')
    .replace(/\bde\s+el\b/gi, '')
    .replace(/\bintegral\s+of\b/gi, 'integrate')
    .replace(/\bintegrate\s+of\b/gi, 'integrate');
  // Primero: Convertir "equis" a "x" (antes de otras transformaciones)
  normalizado = normalizado.replace(/\bequis\b/gi, 'x');
  
  // Limpiar "de" residual después de funciones (ej: "sin de x" -> "sin x")
  normalizado = normalizado.replace(/\b(sin|cos|tan|log|ln|sqrt)\s+de\s+/gi, '$1 ');
  
  // Potencias
  normalizado = normalizado
    .replace(/\bx\s+al\s+cubo\b/gi, 'x^3')
    .replace(/\bx\s+al\s+cuadrado\b/gi, 'x^2')
    .replace(/\b(\w+)\s+al\s+cubo\b/gi, '$1^3')
    .replace(/\b(\w+)\s+al\s+cuadrado\b/gi, '$1^2')
    .replace(/\b(\w+)\s+a\s+la\s+(\d+)\b/gi, '$1^$2')
    .replace(/\b(\w+)\s+elevado\s+a\s+(\d+)\b/gi, '$1^$2')
    .replace(/\b(\w+)\s+elevado\s+a\s+la\s+(\d+)\b/gi, '$1^$2');
  
  // Operadores básicos (antes de funciones trigonométricas)
  normalizado = normalizado
    .replace(/\bmas\b/gi, '+')
    .replace(/\bmenos\b/gi, '-')
    .replace(/\bpor\b/gi, '*')
    .replace(/\bentre\b/gi, '/')
    .replace(/\bdividido\s+por\b/gi, '/');
  
  // Funciones trigonométricas con paréntesis
  // Patrón: "seno de x" -> "sin(x)" o "sin x" -> "sin(x)"
  normalizado = normalizado
    .replace(/\bseno\s+de\s+(\w+)/gi, 'sin($1)')
    .replace(/\bcoseno\s+de\s+(\w+)/gi, 'cos($1)')
    .replace(/\btangente\s+de\s+(\w+)/gi, 'tan($1)')
    // Si solo dice "seno x" sin "de"
    .replace(/\bseno\s+(\w+)/gi, 'sin($1)')
    .replace(/\bcoseno\s+(\w+)/gi, 'cos($1)')
    .replace(/\btangente\s+(\w+)/gi, 'tan($1)')
    // Si ya está en inglés pero sin paréntesis: "sin x" -> "sin(x)"
    .replace(/\bsin\s+(\w+)/gi, 'sin($1)')
    .replace(/\bcos\s+(\w+)/gi, 'cos($1)')
    .replace(/\btan\s+(\w+)/gi, 'tan($1)');
  
  // Funciones especiales
  normalizado = normalizado
    .replace(/\braiz\s+cuadrada\s+de\s+(\w+)/gi, 'sqrt($1)')
    .replace(/\braiz\s+de\s+(\w+)/gi, 'sqrt($1)')
    .replace(/\blogaritmo\s+natural\s+de\s+(\w+)/gi, 'ln($1)')
    .replace(/\blogaritmo\s+de\s+(\w+)/gi, 'log($1)')
    .replace(/\bvalor\s+absoluto\s+de\s+(\w+)/gi, 'abs($1)');
  
  // Cálculo - mejorar sintaxis para Wolfram
  // Integrales: agregar dx al final si no está
  normalizado = normalizado
    .replace(/\bderivada\s+de\b/gi, 'derivative of')
    .replace(/\bintegral\s+de\s+(.+)$/gi, (match, expr) => {
      // Si no termina en dx, dy, dt, agregarlo
      if (!/d[a-z]\s*$/.test(expr.trim())) {
        return `integrate ${expr.trim()} dx`;
      }
      return `integrate ${expr.trim()}`;
    })
    .replace(/\bintegral\s+of\s+(.+)$/gi, (match, expr) => {
      if (!/d[a-z]\s*$/.test(expr.trim())) {
        return `integrate ${expr.trim()} dx`;
      }
      return `integrate ${expr.trim()}`;
    })
    .replace(/\blimite\s+de\b/gi, 'limit of');
  
  // Límites
  normalizado = normalizado
    .replace(/\bcuando\s+x\s+tiende\s+a\s+infinito\b/gi, 'as x approaches infinity')
    .replace(/\bcuando\s+x\s+tiende\s+a\s+(\w+)\b/gi, 'as x approaches $1')
    .replace(/\btiende\s+a\s+infinito\b/gi, 'approaches infinity')
    .replace(/\btiende\s+a\s+(\w+)\b/gi, 'approaches $1')
    .replace(/\bcuando\s+x\s*→\s*∞\b/gi, 'as x approaches infinity')
    .replace(/\bcuando\s+x\s*→\s*(\w+)\b/gi, 'as x approaches $1');
  
  // Ecuaciones
  normalizado = normalizado
    .replace(/\bigual\s+a\s+cero\b/gi, '= 0')
    .replace(/\bigual\s+a\b/gi, '=')
    .replace(/\bigual\b/gi, '=');
  
  // Limpiar espacios múltiples
  normalizado = normalizado.replace(/\s+/g, ' ').trim();
  
  return normalizado;
}

/**
 * Detecta si un texto contiene notación matemática
 * @param {string} texto
 * @returns {boolean}
 */
function contieneNotacionMatematica(texto) {
  if (!texto) return false;
  
  const patrones = [
    /\b(derivada|integral|limite|ecuacion)\b/i,
    /\b(seno|coseno|tangente|logaritmo)\b/i,
    /\b(x\s+al\s+(cuadrado|cubo))\b/i,
    /\b(\w+\s+elevado\s+a)\b/i,
    /\d+\s*[+\-*/]\s*\d+/,
    /x\s*\^/i,
    /\bsqrt\b/i,
    /\bsin\(|cos\(|tan\(/i
  ];
  
  return patrones.some(patron => patron.test(texto));
}

module.exports = {
  normalizarNotacionMatematica,
  contieneNotacionMatematica
};
