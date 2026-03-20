// utils/reconstruccionPregunta.js
// Extrae y reconstruye preguntas ambiguas para la skill Alexa

/**
 * Extrae la ubicación de una pregunta sobre duración del sol
 * @param {string} question - Pregunta original
 * @returns {string|null} Ubicación extraída o null
 */
function extraerUbicacion(question) {
    const questionLower = question.toLowerCase();
    // Patrones: "en [ciudad]", "de [ciudad]", "[ciudad]"
    const patronEn = /\ben\s+([a-záéíóúñ\s]+?)(?:\s|$|\?)/i;
    const patronDe = /\bde\s+([a-záéíóúñ\s]+?)(?:\s|$|\?)/i;
    
    let match = questionLower.match(patronEn);
    if (match && match[1]) {
        return match[1].trim();
    }
    
    match = questionLower.match(patronDe);
    if (match && match[1]) {
        return match[1].trim();
    }
    
    return null;
}

/**
 * Reconstruye preguntas ambiguas usando contexto y tipo de dato solicitado.
 * @param {string} question - Pregunta original
 * @param {string} contextoRelevante - Contexto relevante (entidad)
 * @param {string} datoSolicitado - Tipo de dato solicitado (edad, capital, etc.)
 * @param {object} sessionAttributes - Atributos de sesión Alexa
 * @param {object} opciones - { pronombresAmbiguos, comparacionKeywords }
 * @returns {{ preguntaReconstruida: string, preguntaReconstruidaEn: string, preguntaAmbigua: boolean }}
 */
async function reconstruirPreguntaAmbigua(question, contextoRelevante, datoSolicitado, sessionAttributes, opciones = {}) {
    const { pronombresAmbiguos, comparacionKeywords, traducirGPT } = opciones;
    let preguntaReconstruida = question;
    let preguntaReconstruidaEn = question;
    let preguntaAmbigua = false;

    if (datoSolicitado && contextoRelevante) {
        if (sessionAttributes.memory && sessionAttributes.memory[contextoRelevante]) {
            return { preguntaReconstruida: question, preguntaReconstruidaEn: question, preguntaAmbigua: false };
        }
        
        // Caso especial: duración del sol con ubicación
        if (datoSolicitado === 'duracion_sol') {
            const ubicacion = extraerUbicacion(question);
            if (ubicacion) {
                preguntaReconstruida = `Sun in ${ubicacion}`;
                preguntaReconstruidaEn = preguntaReconstruida;
                preguntaAmbigua = false;
                return { preguntaReconstruida, preguntaReconstruidaEn, preguntaAmbigua };
            } else if (contextoRelevante) {
                preguntaReconstruida = `Sun in ${contextoRelevante}`;
                preguntaReconstruidaEn = preguntaReconstruida;
                preguntaAmbigua = true;
                return { preguntaReconstruida, preguntaReconstruidaEn, preguntaAmbigua };
            }
        }
        
        let preguntaTipo = {
            periodo: `¿Cuál es el periodo presidencial de ${contextoRelevante}?`,
            edad: `¿Cuántos años tiene ${contextoRelevante}?`,
            capital: `¿Cuál es la capital de ${contextoRelevante}?`,
            altura: `¿Cuánto mide ${contextoRelevante}?`,
            fundacion: `¿En qué año fue fundada ${contextoRelevante}?`,
            duracion_sol: `Sun in ${contextoRelevante}`
        };
        preguntaReconstruida = preguntaTipo[datoSolicitado] || `${question} ${contextoRelevante}`;
        preguntaAmbigua = true;
    } else if (datoSolicitado && !contextoRelevante && sessionAttributes.memory && Object.keys(sessionAttributes.memory).length > 0) {
        // No reconstruir, se maneja en handler
    } else if (comparacionKeywords && comparacionKeywords.test(question) && sessionAttributes.history && sessionAttributes.history.length > 1) {
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
            preguntaReconstruida = `${lastEntity} vs ${nuevaEntidad}`;
            preguntaAmbigua = false;
        }
    } else if (datoSolicitado && contextoRelevante && !question.toLowerCase().includes(contextoRelevante.toLowerCase())) {
        preguntaReconstruida = `¿Cuál es el periodo presidencial de ${contextoRelevante}?`;
        preguntaAmbigua = true;
    } else if (contextoRelevante && question.length < 18 && pronombresAmbiguos && pronombresAmbiguos.test(question)) {
        // NO concatenar contexto: produce keywords incorrectas ("el de méxico Donald Trump")
        // GPT en obtenerKeyword recibe contextoFactual y resuelve el pronombre correctamente
        preguntaReconstruida = question;
        preguntaAmbigua = false;
    }
    
    // Traducir pregunta reconstruida al inglés para Wolfram (solo si cambió)
    if (traducirGPT && preguntaReconstruida !== question) {
        try {
            preguntaReconstruidaEn = await traducirGPT(preguntaReconstruida, 'es', 'en');
        } catch (e) {
            preguntaReconstruidaEn = preguntaReconstruida;
        }
    } else {
        preguntaReconstruidaEn = preguntaReconstruida;
    }
    
    return { preguntaReconstruida, preguntaReconstruidaEn, preguntaAmbigua };
}

module.exports = { reconstruirPreguntaAmbigua, extraerUbicacion };