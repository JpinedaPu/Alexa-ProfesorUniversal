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
        
        const speech = 'Bienvenido, hermano, al templo del conocimiento sagrado. ' +
                      'Soy el Maestro Masón, guardián de las Siete Artes Liberales. ' +
                      'El Trivium te enseñará el arte de la palabra: Gramática para estructurar, ' +
                      'Retórica para persuadir, y Lógica para razonar. ' +
                      'El Quadrivium te revelará los misterios del universo: ' +
                      'Aritmética de los números sagrados, Geometría de las proporciones divinas, ' +
                      'Música de la armonía celestial, y Astronomía del cosmos infinito. ' +
                      '¿Qué arte deseas explorar en tu camino hacia la luz?';
        
        try {
            // Generar audio premium con voz del Maestro Masón (timeout más largo para primera llamada)
            const audioUrl = await generarAudioPremium(speech, 'maestro');
            
            // APL con símbolos masónicos
            const supportedInterfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
            if (supportedInterfaces['Alexa.Presentation.APL']) {
                handlerInput.responseBuilder.addDirective({
                    type: "Alexa.Presentation.APL.RenderDocument",
                    token: "modoSecreto",
                    document: generarAPL(sessionAttributes.darkMode),
                    datasources: {
                        templateData: {
                            titulo: "⚒️ Las 7 Artes Liberales ⚒️",
                            textoSuperior: "Trivium: Gramática • Retórica • Lógica",
                            textoInferior: "Quadrivium: Aritmética • Geometría • Música • Astronomía",
                            imagenes: [],
                            fuenteWolfram: false,
                            fuenteWikipedia: false,
                            fuenteGoogle: false,
                            soloImagenes: false
                        }
                    }
                });
            }
            
            return handlerInput.responseBuilder
                .speak(`<audio src="${audioUrl}"/>`)
                .reprompt('¿Qué arte liberal deseas estudiar, hermano?')
                .getResponse();
                
        } catch (error) {
            console.error('[MODO-SECRETO] Error generando audio:', error);
            // Fallback a voz normal de Alexa
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
