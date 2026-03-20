/**
 * @fileoverview Rutas especializadas para las 7 Artes Liberales
 * Cada arte tiene su maestro, voz y enseñanzas específicas según la tradición masónica
 * 
 * @version 1.0.0
 */

const { consultarClaude } = require('../services/claude');
const { generarAudioPremium } = require('../services/elevenlabs');
const { generarAPL } = require('../services/apl');
const Alexa = require('ask-sdk-core');

/**
 * Prompts especializados por arte liberal con enfoque masónico
 */
const PROMPTS_ARTES = {
    gramatica: `Eres el Maestro de Gramática en el templo masónico. 
Tu enseñanza se centra en la estructura del lenguaje como fundamento del pensamiento claro.
Enseñas que las palabras son las piedras con las que construimos el templo del conocimiento.
Hablas con claridad y precisión, mostrando cómo la gramática correcta es la base de toda comunicación efectiva.
Usa metáforas de construcción y arquitectura. Sé didáctico pero profundo.`,

    retorica: `Eres el Maestro de Retórica en el templo masónico.
Tu enseñanza se centra en el arte de persuadir y comunicar verdades con elegancia.
Enseñas que la retórica es el cincel que da forma a las ideas para que brillen ante los demás.
Hablas con elocuencia y pasión, mostrando cómo las palabras bien elegidas pueden iluminar mentes.
Usa metáforas de luz y transformación. Sé inspirador y convincente.`,

    logica: `Eres el Maestro de Lógica en el templo masónico.
Tu enseñanza se centra en el razonamiento puro y el pensamiento crítico.
Enseñas que la lógica es la escuadra y el compás del pensamiento, que nos guía hacia la verdad.
Hablas con precisión analítica, mostrando cómo el razonamiento correcto separa la verdad del error.
Usa metáforas de herramientas y medición. Sé riguroso pero accesible.`,

    aritmetica: `Eres el Maestro de Aritmética en el templo masónico.
Tu enseñanza se centra en los números sagrados y sus propiedades místicas.
Enseñas que los números son los símbolos divinos que revelan el orden del universo.
Hablas con reverencia matemática, mostrando cómo los números 3, 5, 7 y otros tienen significados profundos.
Usa metáforas de proporción y armonía numérica. Sé místico pero preciso.`,

    geometria: `Eres el Maestro de Geometría en el templo masónico.
Tu enseñanza se centra en las proporciones divinas y la geometría sagrada.
Enseñas que la geometría es el lenguaje con el que el Gran Arquitecto diseñó el universo.
Hablas con admiración por las formas perfectas, mostrando cómo el círculo, el cuadrado y el triángulo contienen verdades eternas.
Usa metáforas de construcción y diseño divino. Sé visual y contemplativo.`,

    musica: `Eres el Maestro de Música en el templo masónico.
Tu enseñanza se centra en la armonía universal y las proporciones sonoras.
Enseñas que la música es la manifestación audible del orden cósmico, donde todo vibra en armonía.
Hablas con sensibilidad armónica, mostrando cómo los intervalos musicales reflejan relaciones matemáticas sagradas.
Usa metáforas de resonancia y vibración. Sé poético y armónico.`,

    astronomia: `Eres el Maestro de Astronomía en el templo masónico.
Tu enseñanza se centra en el cosmos, el tiempo y los ciclos celestiales.
Enseñas que las estrellas son las luces que guían al iniciado en su camino hacia la sabiduría.
Hablas con asombro contemplativo, mostrando cómo el movimiento de los astros revela el plan divino.
Usa metáforas de viaje y navegación celestial. Sé profundo y trascendente.`,

    maestro: `Eres el Maestro Masón, guardián de las Siete Artes Liberales.
Tu enseñanza sintetiza todas las artes en una visión unificada del conocimiento.
Enseñas que el camino del iniciado requiere dominar las artes del Trivium (palabra) y Quadrivium (número).
Hablas con sabiduría equilibrada, guiando al hermano hacia la luz del entendimiento completo.
Usa metáforas de construcción del templo interior. Sé sabio, equilibrado y guía espiritual.`
};

/**
 * Títulos y símbolos para cada arte
 */
const SIMBOLOS_ARTES = {
    gramatica: { titulo: "📖 Gramática - El Fundamento", simbolo: "📖" },
    retorica: { titulo: "🗣️ Retórica - El Arte de Persuadir", simbolo: "🗣️" },
    logica: { titulo: "⚖️ Lógica - La Escuadra del Pensamiento", simbolo: "⚖️" },
    aritmetica: { titulo: "🔢 Aritmética - Los Números Sagrados", simbolo: "🔢" },
    geometria: { titulo: "📐 Geometría - Las Proporciones Divinas", simbolo: "📐" },
    musica: { titulo: "🎵 Música - La Armonía Universal", simbolo: "🎵" },
    astronomia: { titulo: "⭐ Astronomía - El Cosmos Infinito", simbolo: "⭐" },
    maestro: { titulo: "⚒️ Maestro Masón - Guardián de las Artes", simbolo: "⚒️" }
};

/**
 * Procesa una consulta para un arte liberal específica
 * @param {string} pregunta - Pregunta del usuario
 * @param {string} arte - Arte liberal (gramatica|retorica|logica|aritmetica|geometria|musica|astronomia|maestro)
 * @param {Object} handlerInput - Handler input de Alexa
 * @returns {Promise<Object>} Respuesta con speech, APL y audio premium
 */
async function procesarArteLiberal(pregunta, arte, handlerInput) {
    const startTime = Date.now();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    
    console.log(`[MODO-SECRETO] Procesando ${arte}: "${pregunta}"`);
    
    // 1. Consultar a Claude con prompt especializado del maestro
    const promptMaestro = PROMPTS_ARTES[arte] || PROMPTS_ARTES.maestro;
    const promptCompleto = `${promptMaestro}

Pregunta del hermano: "${pregunta}"

INSTRUCCIONES:
1. Responde como el maestro de esta arte, con su personalidad y enfoque único
2. Usa metáforas y símbolos masónicos apropiados
3. Sé profundo pero accesible, místico pero claro
4. Máximo 300 caracteres para que Alexa pueda leerlo fluidamente
5. Termina invitando a seguir explorando

Responde SOLO el texto que Alexa dirá, sin formato JSON ni etiquetas.`;

    try {
        const respuestaClaude = await consultarClaude(
            pregunta, 
            '', 
            '', 
            '', 
            pregunta, 
            [], 
            { 
                prompt: promptCompleto,
                timeout: 5000 
            }
        );
        
        const textoRespuesta = respuestaClaude.speech || respuestaClaude.toString();
        
        console.log(`[MODO-SECRETO] Respuesta de Claude (${Date.now() - startTime}ms): ${textoRespuesta.substring(0, 100)}...`);
        
        // 2. Generar audio premium con la voz del maestro correspondiente
        let audioUrl;
        try {
            audioUrl = await generarAudioPremium(textoRespuesta, arte);
            console.log(`[MODO-SECRETO] Audio generado (${Date.now() - startTime}ms): ${audioUrl}`);
        } catch (audioError) {
            console.error('[MODO-SECRETO] Error generando audio, usando voz de Alexa:', audioError);
            audioUrl = null;
        }
        
        // 3. Generar APL con símbolos del arte
        const simbolo = SIMBOLOS_ARTES[arte] || SIMBOLOS_ARTES.maestro;
        const supportedInterfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
        
        if (supportedInterfaces['Alexa.Presentation.APL']) {
            handlerInput.responseBuilder.addDirective({
                type: "Alexa.Presentation.APL.RenderDocument",
                token: "arteLiberal",
                document: generarAPL(sessionAttributes.darkMode),
                datasources: {
                    templateData: {
                        titulo: simbolo.titulo,
                        textoSuperior: `Enseñanza del Maestro de ${arte.charAt(0).toUpperCase() + arte.slice(1)}`,
                        textoInferior: "Explora las demás artes liberales en tu camino hacia la luz",
                        imagenes: [],
                        fuenteWolfram: false,
                        fuenteWikipedia: false,
                        fuenteGoogle: false,
                        soloImagenes: false
                    }
                }
            });
        }
        
        // 4. Construir respuesta
        const speech = audioUrl 
            ? `<audio src="${audioUrl}"/>` 
            : textoRespuesta;
        
        console.log(`[MODO-SECRETO] ✅ Completado en ${Date.now() - startTime}ms`);
        
        return {
            speech: speech,
            displayTop: `Maestro de ${arte.charAt(0).toUpperCase() + arte.slice(1)}`,
            displayBottom: "Continúa tu camino en las artes liberales",
            arte: arte,
            audioUrl: audioUrl
        };
        
    } catch (error) {
        console.error('[MODO-SECRETO] Error:', error);
        throw error;
    }
}

module.exports = { 
    procesarArteLiberal, 
    PROMPTS_ARTES,
    SIMBOLOS_ARTES 
};
