const Alexa = require('ask-sdk-core');
const { obtenerUltimaPregunta } = require('../utils/userHistory');

const RepeatLastQuestionIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RepeatLastQuestionIntent';
    },
    async handle(handlerInput) {
        const userId = handlerInput.requestEnvelope.session.user.userId;
        
        const ultimaPregunta = await obtenerUltimaPregunta(userId);
        
        if (!ultimaPregunta) {
            return handlerInput.responseBuilder
                .speak('No tengo registro de preguntas anteriores. ¿Qué quieres preguntarme?')
                .reprompt('¿Qué quieres preguntarme?')
                .getResponse();
        }
        
        const speechOutput = `Tu última pregunta fue: ${ultimaPregunta.pregunta}. ¿Quieres que te la responda de nuevo o tienes otra pregunta?`;
        
        // Guardar la pregunta en session attributes para que el usuario pueda decir "sí"
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes();
        sessionAttributes.pendingRepeat = ultimaPregunta.pregunta;
        attributesManager.setSessionAttributes(sessionAttributes);
        
        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt('¿Quieres que te responda de nuevo o tienes otra pregunta?')
            .getResponse();
    }
};

module.exports = { RepeatLastQuestionIntentHandler };
