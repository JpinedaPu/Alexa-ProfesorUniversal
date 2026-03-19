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
        
        let imagenesNormales = []; // Pods de la primera llamada (Input, Result, Plot, etc.)
        let allSteps = []; // Pasos de la segunda llamada
        let originalQuestion = '';
        
        if (cachedSession) {
            allSteps = cachedSession.wolframResponse.allSteps || [];
            imagenesNormales = cachedSession.wolframResponse.imagenesNormales || [];
            originalQuestion = cachedSession.originalQuestion;
        } else if (sessionAttributes.wolframData) {
            allSteps = sessionAttributes.wolframData.imagenes || [];
            imagenesNormales = sessionAttributes.wolframData.imagenesNormales || [];
            originalQuestion = sessionAttributes.wolframData.keyword || '';
        }
        
        // Priorizar buscar en imagenesNormales (primera llamada)
        if (imagenesNormales.length === 0 && allSteps.length === 0) {
            return handlerInput.responseBuilder
                .speak('No hay una solución paso a paso activa. Primero pide resolver algo con "modo wolfram".')
                .reprompt('¿Qué quieres calcular?')
                .getResponse();
        }
        
        // Buscar el pod "Result" en las imágenes normales (primera llamada)
        let resultPod = imagenesNormales.find(pod => 
            pod.titulo && (
                pod.titulo === 'Result' || 
                pod.titulo === 'Results' || 
                pod.titulo === 'Solution' || 
                pod.titulo === 'Solutions'
            )
        );
        
        // Si no hay pod Result en imagenesNormales, buscar en allSteps
        if (!resultPod && allSteps.length > 0) {
            resultPod = allSteps.find(pod => 
                pod.titulo && (
                    pod.titulo === 'Result' || 
                    pod.titulo === 'Results' || 
                    pod.titulo === 'Solution' || 
                    pod.titulo === 'Solutions'
                )
            );
        }
        
        // Si aún no hay, usar el último de allSteps
        if (!resultPod && allSteps.length > 0) {
            resultPod = allSteps[allSteps.length - 1];
        }
        
        // Si aún no hay, usar el último de imagenesNormales
        if (!resultPod && imagenesNormales.length > 0) {
            resultPod = imagenesNormales[imagenesNormales.length - 1];
        }
        
        if (!resultPod) {
            return handlerInput.responseBuilder
                .speak('No pude encontrar el resultado. Intenta de nuevo.')
                .reprompt('¿Qué quieres calcular?')
                .getResponse();
        }
        
        console.log(`[SKIP-TO-RESULT] Pod seleccionado: ${resultPod.titulo}`);
        
        // Explicar el resultado con Claude de forma rápida y directa
        const promptRespuesta = `Eres el "Profesor Universal IA". El usuario pidió resolver "${originalQuestion}" y quiere ver directamente el RESULTADO FINAL sin pasos intermedios.

Resultado de Wolfram Alpha: ${resultPod.titulo}

INSTRUCCIONES:
1. Responde EXCLUSIVAMENTE con JSON válido: {"speech": "explicación", "displayTop": "título", "displayBottom": "dato adicional"}
2. En "speech": Explica el resultado final de forma RÁPIDA y DIRECTA en español (máximo 150 caracteres)
   - Ejemplo: "La solución es x igual a 2 o x igual a menos 2. Estas son las raíces de la ecuación."
3. En "displayTop": Un título corto del resultado (ej: "Soluciones: x = ±2")
4. En "displayBottom": Un dato adicional o verificación (ej: "Verificado: (2)² - 4 = 0 ✓")
5. NO uses símbolos unicode (², ³, ×, ÷, √, π, ∞, etc.) - escribe todo en texto
6. Sé conciso y directo, el usuario quiere el resultado YA

Responde SOLO con el JSON, sin texto adicional.`;
        
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
                        titulo: `Resultado Final: ${originalQuestion}`,
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
