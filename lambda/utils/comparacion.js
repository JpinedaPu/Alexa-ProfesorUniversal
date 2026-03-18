// utils/comparacion.js
// Lógica para detectar y construir preguntas de comparación

/**
 * Detecta y construye una pregunta de comparación si aplica.
 * @param {string} question - Pregunta original
 * @param {object} sessionAttributes - Atributos de sesión Alexa
 * @param {RegExp} comparacionKeywords - Regex para palabras clave de comparación
 * @returns {{ preguntaReconstruida: string|null, nuevaEntidad: string|null }}
 */
function detectarComparacion(question, sessionAttributes, comparacionKeywords) {
    if (!comparacionKeywords || !comparacionKeywords.test(question)) {
        return { preguntaReconstruida: null, nuevaEntidad: null };
    }
    let lastEntity = sessionAttributes.lastSubject || sessionAttributes.lastKeyword || "";
    let nuevaEntidad = null;
    const palabras = question.split(/\s+/).map(w => w.toLowerCase());
    for (let w of palabras) {
        if (w.length > 2 && lastEntity && !lastEntity.toLowerCase().includes(w) && !comparacionKeywords.test(w)) {
            nuevaEntidad = w;
            break;
        }
    }
    if (lastEntity && nuevaEntidad) {
        return { preguntaReconstruida: `${lastEntity} vs ${nuevaEntidad}`, nuevaEntidad };
    }
    return { preguntaReconstruida: null, nuevaEntidad: null };
}

module.exports = { detectarComparacion };