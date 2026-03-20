/**
 * @fileoverview Handler para el Modo Secreto - Las 7 Artes Liberales
 * Implementa las enseñanzas masónicas a través de las artes del Trivium y Quadrivium
 * con voces premium especializadas de ElevenLabs.
 * 
 * Trivium (Artes del Lenguaje): Gramática, Retórica, Lógica
 * Quadrivium (Artes Matemáticas): Aritmética, Geometría, Música, Astronomía
 * Maestro Masón: Síntesis y guía espiritual
 * 
 * @version 1.0.0
 * @author Profesor Universal IA - Modo Secreto
 */

const Alexa = require('ask-sdk-core');
const { generarAudioPremium } = require('../services/elevenlabs');
const { generarAPL } = require('../services/apl');

/**
 * Handler para activar el modo secreto con la frase masónica
 */
const SecretModeIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SecretRouteIntent';
    },
    
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        // Activar modo secreto
        sessionAttributes.modoSecreto = true;
        sessionAttributes.arteActual = 'maestro'; // Comienza con el Maestro Masón
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        
        const speech = 'Bienvenido, hermano. Has entrado al templo. Soy el Maestro Masón. ' +
                      '¿Qué arte deseas explorar: Gramática, Retórica, Lógica, Aritmética, Geometría, Música o Astronomía?';
        
        try {
            console.log('[MODO-SECRETO] Iniciando generación de audio premium');
            const audioUrl = await generarAudioPremium(speech, 'maestro');
            console.log(`[MODO-SECRETO] Audio URL: ${audioUrl}`);

            const ssml = `<speak><audio src="${audioUrl}"/></speak>`;
            console.log(`[MODO-SECRETO] SSML a enviar: ${ssml}`);

            // Verificar soporte APL
            const supportedInterfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
            console.log(`[MODO-SECRETO] Interfaces soportadas: ${JSON.stringify(Object.keys(supportedInterfaces || {}))}`);

            if (supportedInterfaces['Alexa.Presentation.APL']) {
                handlerInput.responseBuilder.addDirective({
                    type: "Alexa.Presentation.APL.RenderDocument",
                    token: "modoSecreto",
                    document: generarAPL(sessionAttributes.darkMode),
                    datasources: {
                        templateData: {
                            titulo: "Las 7 Artes Liberales",
                            textoSuperior: "Trivium: Gramática · Retórica · Lógica",
                            textoInferior: "Quadrivium: Aritmética · Geometría · Música · Astronomía",
                            imagenes: [],
                            fuenteWolfram: false,
                            fuenteWikipedia: false,
                            fuenteGoogle: false,
                            soloImagenes: false
                        }
                    }
                });
            }

            const response = handlerInput.responseBuilder
                .speak(ssml)
                .reprompt('<speak>¿Qué arte liberal deseas estudiar, hermano?</speak>')
                .getResponse();

            console.log(`[MODO-SECRETO] Response outputSpeech: ${JSON.stringify(response.response?.outputSpeech)}`);
            console.log(`[MODO-SECRETO] shouldEndSession: ${response.response?.shouldEndSession}`);
            return response;

        } catch (error) {
            console.error('[MODO-SECRETO] Error generando audio:', error.message, error.stack);
            return handlerInput.responseBuilder
                .speak(speech)
                .reprompt('¿Qué arte liberal deseas estudiar?')
                .getResponse();
        }
    }
};

/**
 * Handler para consultas específicas de cada arte liberal
 */
const ArteLiberalIntentHandler = {
    canHandle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ArteLiberalIntent'
            && sessionAttributes.modoSecreto === true;
    },
    
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const slots = handlerInput.requestEnvelope.request.intent.slots;
        
        const arte = slots.arte?.value?.toLowerCase() || slots.arte?.resolutions?.resolutionsPerAuthority?.[0]?.values?.[0]?.value?.id || 'maestro';
        const pregunta = '¿Qué puedes enseñarme sobre esta arte?';
        
        // Mapear nombres de artes
        const arteMap = {
            'gramática': 'gramatica',
            'gramatica': 'gramatica',
            'retórica': 'retorica',
            'retorica': 'retorica',
            'lógica': 'logica',
            'logica': 'logica',
            'aritmética': 'aritmetica',
            'aritmetica': 'aritmetica',
            'geometría': 'geometria',
            'geometria': 'geometria',
            'música': 'musica',
            'musica': 'musica',
            'astronomía': 'astronomia',
            'astronomia': 'astronomia',
            'maestro': 'maestro',
            'mason': 'maestro',
            'masón': 'maestro'
        };
        
        const arteNormalizado = arteMap[arte] || 'maestro';
        sessionAttributes.arteActual = arteNormalizado;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        
        // Delegar a artesLiberalesRoutes para procesar
        const { procesarArteLiberal } = require('./artesLiberalesRoutes');
        
        try {
            const resultado = await procesarArteLiberal(pregunta, arteNormalizado, handlerInput);
            
            return handlerInput.responseBuilder
                .speak(resultado.speech)
                .reprompt('¿Deseas explorar otra arte liberal, hermano?')
                .getResponse();
                
        } catch (error) {
            console.error('[MODO-SECRETO] Error procesando arte:', error);
            return handlerInput.responseBuilder
                .speak('Disculpa, hermano. Hubo un problema al acceder a las enseñanzas. Intenta de nuevo.')
                .reprompt('¿Qué arte deseas explorar?')
                .getResponse();
        }
    }
};

module.exports = { 
    SecretModeIntentHandler, 
    ArteLiberalIntentHandler 
};
