/**
 * Análisis centralizado de cacheabilidad de preguntas.
 * Discrimina entre preguntas conceptuales (cacheables) y cálculos específicos (no cacheables).
 */

const PATRONES_NO_CACHEABLES = [
    /resuelve?\s+[-+* /^()=x-z0-9]+/i,
    /deriva(da)?\s+[-+* /^()x-z0-9]+/i,
    /integra(l)?\s+[-+* /^()x-z0-9]+/i,
    /factoriza\s+[-+* /^()x-z0-9]+/i,
    /grafica\s+[-+* /^()xy=0-9]+/i,
    /simplifica\s+[-+* /^()x-z0-9]+/i,
    /calcula\s+[-+* /^()0-9]+/i,
    /cu[aá]nto\s+es\s+[-+* /^()0-9]+/i,
    /paso\s+a\s+paso/i,
    /\d+\s*[-+* /^]\s*\d+/i
];

const PATRONES_CACHEABLES = [
    /qu[eé]\s+es\s+(el|la|los|las)\s+\w+/i,
    /qui[eé]n\s+(fue|es)\s+\w+/i,
    /propiedades?\s+de(l)?\s+\w+/i,
    /definici[oó]n\s+de\s+\w+/i,
    /f[oó]rmula\s+de\s+(la|el)\s+\w+/i,
    /tabla\s+peri[oó]dica/i,
    /constante\s+de\s+\w+/i,
    /distancia\s+\w+\s*-?\s*\w+/i,
    /cu[aá]nto\s+(mide|pesa|vale)\s+\w+/i,
    /caracter[ií]sticas\s+de(l)?\s+\w+/i,
    /d[oó]nde\s+(est[aá]|queda|se\s+encuentra)\s+\w+/i,
    /cu[aá]ndo\s+(fue|ocurri[oó]|pas[oó])\s+\w+/i,
    /por\s+qu[eé]\s+\w+/i
];

function analizarCacheabilidad(pregunta, options = {}) {
    const { keyword, location, contextual } = options;
    if (contextual || location) {
        return { cacheable: false, cacheKey: null, reason: 'Pregunta contextual o con ubicación' };
    }

    const preguntaLower = pregunta.toLowerCase().normalize('NFC');

    for (const patron of PATRONES_NO_CACHEABLES) {
        if (patron.test(preguntaLower)) {
            return { cacheable: false, cacheKey: null, reason: 'Ecuación o cálculo específico' };
        }
    }

    for (const patron of PATRONES_CACHEABLES) {
        if (patron.test(preguntaLower)) {
            return { cacheable: true, cacheKey: generarCacheKey(preguntaLower), reason: 'Pregunta conceptual/definitoria' };
        }
    }

    if (/[-+*\/^=0-9x-z]/.test(preguntaLower)) {
        return { cacheable: false, cacheKey: null, reason: 'Contiene números o variables específicas' };
    }

    return { cacheable: true, cacheKey: generarCacheKey(preguntaLower), reason: 'Pregunta general sin cálculos' };
}

function generarCacheKey(pregunta) {
    return pregunta
        .toLowerCase()
        .normalize('NFC')
        .replace(/[¿?¡!.,;:]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 100);
}

module.exports = { analizarCacheabilidad, generarCacheKey };
