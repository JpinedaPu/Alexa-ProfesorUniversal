const Alexa = require('ask-sdk-core');
const { WolframAlphaModeIntentHandler } = require('./WolframAlphaModeIntentHandler');

const ContinueWolframIntentHandler = {
    canHandle(handlerInput) {
        const req = handlerInput.requestEnvelope.request;
        
        // Atrapa intenciones comunes de afirmación o continuación
        if (req.type === 'IntentRequest') {
            const intentName = req.intent.name;
            const validIntents = ['AMAZON.NextIntent', 'AMAZON.ResumeIntent', 'AMAZON.YesIntent', 'ContinueWolframIntent'];
            if (validIntents.includes(intentName)) {
                const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
                // No interceptar YesIntent si hay un pendingRepeat activo (lo maneja YesIntentHandler)
                if (intentName === 'AMAZON.YesIntent' && sessionAttributes.pendingRepeat) return false;
                if (sessionAttributes.wolframData && sessionAttributes.currentWolframStep !== undefined) {
                    const allImagesLength = sessionAttributes.wolframData.imagenes ? sessionAttributes.wolframData.imagenes.length : 0;
                    if (sessionAttributes.currentWolframStep < allImagesLength) {
                        return true;
                    }
                }
                // Si es ContinueWolframIntent dedicado, siempre lo atrapamos (aunque ya no quedan pasos)
                if (intentName === 'ContinueWolframIntent') return true;
            }
        }
        
        // También atrapar el botón visual en la pantalla APL
        if (req.type === 'Alexa.Presentation.APL.UserEvent') {
            const args = req.arguments || [];
            if (args[0] === 'ContinueWolfram') {
                return true;
            }
        }
        return false;
    },
    handle(handlerInput) {
        console.log("[SKILL] ⏩ Capturado intento de continuación para Wolfram");
        // Delegar de vuelta al manejador principal con flag de continuar
        return WolframAlphaModeIntentHandler.handle(handlerInput, 'CONTINUE_WOLFRAM_MODE');
    }
};

module.exports = { ContinueWolframIntentHandler };
