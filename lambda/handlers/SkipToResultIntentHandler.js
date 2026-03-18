const Alexa = require('ask-sdk-core');
const { generarAPL } = require('../services/apl');
const { consultarClaude } = require('../services/claude');
const { withTimeout } = require('../utils/timeoutManager');
const { buscarSessionCache } = require('../utils/dynamoCache');

/**
 * Handler para saltar directamente al resultado final en modo Wolfram step-by-step.
 * Muestra el último pod (resultado) sin pasar por todos los pasos intermedios.
 */
const SkipToResultIntentHandler = {
    canHandle(handlerInput) {
        const req = handlerInput.requestEnvelope.request;
        
        // Intent de voz
        if (req.type === 'IntentRequest' && req.intent.name === 'SkipToResultIntent') {
            return true;
        }
        
        // Botón APL
        if (req.type === 'Alexa.Presentation.APL.UserEvent') {
            const args = req.arguments || [];
            if (args[0] === 'SkipToResult') {
                return true;
            }
        }
        
        return false;
    },
    
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const sessionId = handlerInput.requestEnvelope.session.sessionId;
        const userId = handlerInput.requestEnvelope.session.user.userId;
        
        // Buscar en caché primero
        const cachedSession = await buscarSessionCache(sessionId, userId);
        
        let allSteps = [];
        let originalQuestion = '';
        
        if (cachedSession) {
            allSteps = cachedSession.wolframResponse.allSteps;
            originalQuestion = cachedSession.originalQuestion;
        } else if (sessionAttributes.wolframData) {
            allSteps = sessionAttributes.wolframData.imagenes || [];
            originalQuestion = sessionAttributes.wolframData.keyword || '';
        }
        
        if (allSteps.length === 0) {
            return handlerInput.responseBuilder
                .speak('No hay una solución paso a paso activa. Primero pide resolver algo con "modo wolfram".')
                .reprompt('¿Qué quieres calcular?')
                .getResponse();
        }
        
        // Obtener el último pod (resultado final)
        const resultPod = allSteps[allSteps.length - 1];
        
        // Explicar el resultado con Claude
        const promptRespuesta = `El usuario pidió la solución de "${originalQuestion}" y quiere ver directamente el resultado final.
Resultado de Wolfram Alpha: ${resultPod.titulo}

REGLAS:
1. Responde SOLO con JSON: {"speech": "explicación", "displayTop": "título", "displayBottom": "resultado"}
2. En "speech" explica brevemente el resultado final en español simple
3. Máximo 200 caracteres en speech
4. No uses símbolos unicode (², ³, ×, ÷, etc.)`;
        
        const sintesisResult = await withTimeout(
            consultarClaude(originalQuestion, resultPod.titulo, '', '', originalQuestion, [], { prompt: promptRespuesta, timeout: 3000 }),
            3500,
            { speech: 'Aquí está el resultado final.', displayTop: 'Resultado', displayBottom: resultPod.titulo, keyword: originalQuestion }
        );
        
        let speechOutput = (sintesisResult.speech || 'Aquí está el resultado final.')
            .replace(/[²³⁴⁵⁶⁷⁸⁹°]/g, '')
            .replace(/[≤≥≠×÷√π∞]/g, ' ')
            .trim();
        
        if (sessionAttributes.whisperMode) {
            speechOutput = `<amazon:effect name="whispered">${speechOutput.replace(/<[^>]+>/g, '')}</amazon:effect>`;
        }
        
        // APL
        const supportedInterfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
        if (supportedInterfaces['Alexa.Presentation.APL']) {
            handlerInput.responseBuilder.addDirective({
                type: "Alexa.Presentation.APL.RenderDocument",
                token: "profDoc",
                document: generarAPL(sessionAttributes.darkMode),
                datasources: {
                    templateData: {
                        titulo: `🎯 Resultado Final: ${originalQuestion}`,
                        textoSuperior: sintesisResult.displayTop || 'Resultado',
                        textoInferior: sintesisResult.displayBottom || '',
                        imagenes: [resultPod],
                        fuenteWolfram: true,
                        fuenteWikipedia: false,
                        fuenteGoogle: false,
                        canStepByStep: false,
                        masPasosDisponibles: false,
                        keyword: originalQuestion,
                        zoomLevel: sessionAttributes.zoomLevel || 85
                    }
                }
            });
        }
        
        console.log('[SKIP-TO-RESULT] ✅ Mostrado resultado final');
        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt('¿Algo más?')
            .getResponse();
    }
};

module.exports = { SkipToResultIntentHandler };
