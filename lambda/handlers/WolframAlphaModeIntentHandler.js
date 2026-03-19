/**
 * @fileoverview Handler para el modo matemático paso a paso del Profesor Universal IA.
 * Procesa ecuaciones y expresiones matemáticas usando Wolfram Alpha con soluciones
 * detalladas, paginación inteligente y caché en DynamoDB para continuación de sesiones.
 * 
 * Flujo principal:
 * 1. Conversión de lenguaje natural a notación matemática (GPT)
 * 2. Consulta a Wolfram Alpha con parámetros step-by-step
 * 3. Paginación de resultados (3 pasos por turno)
 * 4. Caché en DynamoDB para continuación de sesiones
 * 5. Síntesis educativa con Claude y renderizado APL
 * 
 * @version 7.7.0
 * @author Profesor Universal IA Team
 */

const Alexa = require('ask-sdk-core');
const { fallbackSpeech } = require('../utils/fallback');
const { consultarWolfram } = require('../services/wolfram');
const { consultarClaude } = require('../services/claude');
const { generarAPL } = require('../services/apl');
const { withTimeout } = require('../utils/timeoutManager');
const { buscarSessionCache, guardarSessionCache, actualizarPaginaCache } = require('../utils/dynamoCache');
const { formatearTituloMatematico } = require('./mathRoute');
const https = require('https');

/**
 * Convierte una pregunta matemática en lenguaje natural (español) a notación
 * matemática estándar en inglés que Wolfram Alpha puede interpretar correctamente.
 * 
 * Utiliza GPT-4o-mini con prompt especializado para traducir expresiones como:
 * - "x al cuadrado menos cuatro igual a cero" → "x^2 - 4 = 0"
 * - "derivada de seno de x" → "derivative of sin(x)"
 * - "integral de x cuadrado" → "integrate x^2"
 * 
 * @param {string} preguntaEs - Pregunta matemática en español
 * @returns {Promise<string>} Notación matemática en inglés para Wolfram Alpha
 */
async function convertirANotacionMatematica(preguntaEs) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
    
    return new Promise((resolve) => {
        const payload = JSON.stringify({
            model: "gpt-4.1-mini",
            max_tokens: 60,
            temperature: 0, // Determinista para conversiones matemáticas consistentes
            messages: [
                {
                    role: "system",
                    content: "You are a math notation converter. Convert mathematical expressions from Spanish natural language into standard English math notation suitable for Wolfram Alpha. Output ONLY the notation, nothing else. Examples:\n- 'x al cuadrado menos cuatro igual a cero' -> 'x^2 - 4 = 0'\n- 'integral de x cuadrado' -> 'integrate x^2'\n- 'derivada de seno de x' -> 'derivative of sin(x)'\n- 'raíz cuadrada de doscientos cincuenta y seis' -> 'sqrt(256)'\n- 'dos elevado a la diez' -> '2^10'"
                },
                {
                    role: "user",
                    content: preguntaEs
                }
            ],
            response_format: { type: "text" }
        });

        const options = {
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            timeout: 3000 // Timeout corto para conversión rápida
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const json = JSON.parse(data);
                        const notation = json.choices[0].message.content.trim();
                        console.log(`[WOLF-MODE] Math conversion: "${preguntaEs}" -> "${notation}"`);
                        resolve(notation);
                    } else {
                        // Fallback a pregunta original si falla la conversión
                        resolve(preguntaEs);
                    }
                } catch (e) {
                    resolve(preguntaEs);
                }
            });
        });
        req.on('error', () => resolve(preguntaEs));
        req.on('timeout', () => { req.destroy(); resolve(preguntaEs); });
        req.write(payload);
        req.end();
    });
}

/**
 * Handler principal para el intent WolframAlphaModeIntent.
 * Maneja consultas matemáticas paso a paso con paginación y caché inteligente.
 */
const WolframAlphaModeIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'WolframAlphaModeIntent';
    },
    
    /**
     * Procesa consultas matemáticas paso a paso.
     * 
     * @param {Object} handlerInput - Input del handler de Alexa
     * @param {string|null} overrideKeyword - Keyword específico o 'CONTINUE_WOLFRAM_MODE' para paginación
     * @returns {Promise<Object>} Respuesta de Alexa con pasos matemáticos y APL
     */
    async handle(handlerInput, overrideKeyword = null) {
        const startTime = Date.now();
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const sessionId = handlerInput.requestEnvelope.session.sessionId;
        const userId = handlerInput.requestEnvelope.session.user.userId;

        // Determinar si es una continuación de paginación
        const isContinue = overrideKeyword === 'CONTINUE_WOLFRAM_MODE';
        // Detectar si viene del botón APL con datos ya inyectados (no re-llamar Wolfram)
        const hasInjectedData = !isContinue && overrideKeyword
            && sessionAttributes.wolframData
            && Array.isArray(sessionAttributes.wolframData.imagenes)
            && sessionAttributes.wolframData.imagenes.length > 0;

        // Si viene del botón con datos inyectados, saltar caché y usar directamente
        if (hasInjectedData) {
            console.log(`[WOLF-MODE] Datos inyectados: ${sessionAttributes.wolframData.imagenes.length} pasos`);
        }

        // 1. BUSCAR EN CACHÉ PRIMERO (DynamoDB) — solo si no hay datos inyectados
        const cachedSession = hasInjectedData ? null : await buscarSessionCache(sessionId, userId);
        
        if (cachedSession && isContinue) {
            console.log('[CACHE] ✅ Session encontrada - Continuando paginación');
            
            // Incrementar página
            const nextPage = cachedSession.currentPage + 1;
            const startIdx = nextPage * cachedSession.stepsPerPage;
            const totalSteps = cachedSession.wolframResponse.totalSteps;
            const endIdx = Math.min(startIdx + cachedSession.stepsPerPage, totalSteps);
            
            const stepsToShow = cachedSession.wolframResponse.allSteps.slice(startIdx, endIdx);
            
            if (stepsToShow.length === 0) {
                return handlerInput.responseBuilder
                    .speak('Has completado todos los pasos de la solución.')
                    .getResponse();
            }
            
            // Actualizar página en DynamoDB
            await actualizarPaginaCache(sessionId, userId, nextPage);
            
            // Explicar SOLO estos pasos con Claude de forma pedagógica
            const descripcionPasosCache = stepsToShow.map((step, i) => {
                const texto = (step.alt || step.titulo || '').replace(/\bIndefinite integral\b/gi, 'Integral indefinida').replace(/\bStep\b/gi, 'Paso').replace(/\bconstant\b/gi, 'constante');
                return `Paso ${startIdx + i + 1}: ${texto}`;
            }).join('\n');

            const promptRespuesta = `Eres el "Profesor Universal IA", experto en matemáticas. El usuario está resolviendo: "${cachedSession.originalQuestion}".
Mostrando pasos ${startIdx + 1} al ${endIdx} de ${cachedSession.wolframResponse.totalSteps}.

Contenido de los pasos (imágenes de Wolfram Alpha):
${descripcionPasosCache}

INSTRUCCIONES — responde SOLO con JSON válido:
{"speech": "...", "displayTop": "...", "displayBottom": "..."}

- "speech": explica TODOS los pasos mostrados en español, pedagógico y conversacional (máx 280 chars). NO uses inglés. NO repitas la expresión matemática completa.
- "displayTop": nombre descriptivo del proceso en español, SIN expresiones matemáticas (ej: "Separación de Términos", "Integración por Partes", "Simplificación Final")
- "displayBottom": qué viene después o dato útil en español
- Sin símbolos unicode (², √, π, ∞). TODO en ESPAÑOL.`;
            
            const sintesisResult = await withTimeout(
                consultarClaude(cachedSession.originalQuestion, JSON.stringify(stepsToShow), '', '', cachedSession.originalQuestion, [], { prompt: promptRespuesta, timeout: 4000 }),
                4500,
                { speech: `Aquí están los pasos ${startIdx + 1} al ${endIdx}.`, displayTop: `Paso ${startIdx + 1}-${endIdx}`, displayBottom: '', keyword: cachedSession.originalQuestion }
            );
            
            let speechOutput = (sintesisResult.speech || '')
                .replace(/[²³⁴⁵⁶⁷⁸⁹°]/g, '')
                .replace(/[≤≥≠×÷√π∞]/g, ' ')
                .replace(/\uFFFD/g, '')
                .replace(/[\u0080-\u009F]/g, '')
                .trim();
            
            if (sessionAttributes.whisperMode) {
                speechOutput = `<amazon:effect name="whispered">${speechOutput.replace(/<[^>]+>/g, '')}</amazon:effect>`;
            }
            
            const hayMasPasos = endIdx < totalSteps;
            if (hayMasPasos) {
                speechOutput += ' Cuando quieras continuar, di continúa.';
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
                            titulo: `Solución Paso a Paso (${startIdx + 1}-${endIdx} de ${totalSteps})`,
                            textoSuperior: sintesisResult.displayTop || '',
                            textoInferior: sintesisResult.displayBottom || '',
                            imagenes: stepsToShow,
                            fuenteWolfram: true,
                            fuenteWikipedia: false,
                            fuenteGoogle: false,
                            canStepByStep: hayMasPasos,
                            masPasosDisponibles: hayMasPasos,
                            keyword: cachedSession.originalQuestion,
                            zoomLevel: sessionAttributes.zoomLevel || 85
                        }
                    }
                });
            }
            
            const reprompt = hayMasPasos ? "Di continúa para ver los siguientes pasos." : "¿Tienes otra duda matemática?";
            console.log(`[WOLF-MODE] ✅ CACHED ${Date.now() - startTime}ms | paso ${startIdx + 1}-${endIdx}/${cachedSession.wolframResponse.totalSteps}`);
            return handlerInput.responseBuilder.speak(speechOutput).reprompt(reprompt).getResponse();
        }
        
        // 2. NO HAY CACHÉ O ES PRIMERA CONSULTA → Obtener keyword
        let keyword = null;
        let keywordMath = null;

        if (isContinue && sessionAttributes.wolframData) {
            keyword = sessionAttributes.wolframData.keyword;
            keywordMath = sessionAttributes.wolframData.keywordMath;
        } else if (overrideKeyword && overrideKeyword !== 'CONTINUE_WOLFRAM_MODE') {
            keyword = overrideKeyword;
        } else {
            try {
                const slots = handlerInput.requestEnvelope.request.intent.slots;
                keyword = (slots && (slots.question && slots.question.value || slots.query && slots.query.value)) || null;
            } catch (e) {}
        }

        if (!keyword) {
            return handlerInput.responseBuilder
                .speak("¿Qué cálculo matemático quieres resolver paso a paso?")
                .reprompt("Dime la ecuación o cálculo.")
                .getResponse();
        }

        try {
            let wolfram;

            if (isContinue && sessionAttributes.wolframData) {
                // Reuso de datos ya obtenidos — no llama a Wolfram de nuevo
                wolfram = sessionAttributes.wolframData;
            } else if (hasInjectedData) {
                // Viene del botón APL — datos ya inyectados por index.js, no re-llamar Wolfram
                wolfram = sessionAttributes.wolframData;
                keywordMath = sessionAttributes.wolframData.keywordMath || keyword;
                // Forzar reset del step a 0 para empezar siempre desde el paso 1
                sessionAttributes.currentWolframStep = 0;
                console.log(`[WOLF-MODE] Datos inyectados: ${wolfram.imagenes.length} pasos | keyword: ${keyword}`);
            } else {
                // PASO CRUCIAL: Convertir lenguaje natural -> notación matemática para Wolfram
                console.log(`[WOLF-MODE] Convirtiendo query a notación matemática: "${keyword}"`);
                keywordMath = await withTimeout(
                    convertirANotacionMatematica(keyword),
                    2800,
                    keyword
                );
                console.log(`[WOLF-MODE] Query final para Wolfram: "${keywordMath}"`);

                // --- PROGRESSIVE RESPONSE ---
                try {
                    const buyingTimeMessages = [
                        "Procesando tu ecuación matemática... un momento.",
                        "Consultando a Wolfram Alpha para darte la solución paso a paso...",
                        "Pidiendo los pasos a Wolfram Alpha, esto puede tomar unos segundos...",
                        "Analizando la expresión matemática... ya casi lo tengo."
                    ];
                    const randomMsg = buyingTimeMessages[Math.floor(Math.random() * buyingTimeMessages.length)];
                    if (handlerInput.serviceClientFactory) {
                        const directiveServiceClient = handlerInput.serviceClientFactory.getDirectiveServiceClient();
                        await directiveServiceClient.enqueue(
                            { header: { requestId: handlerInput.requestEnvelope.request.requestId }, directive: { type: "VoicePlayer.Speak", speech: randomMsg } },
                            handlerInput.requestEnvelope.context.System.apiEndpoint,
                            handlerInput.requestEnvelope.context.System.apiAccessToken
                        );
                    }
                } catch (err) {
                    console.log('[WOLF-MODE] Progressive response no disponible:', err.message);
                }

                // 3. Traducir la pregunta a notación matemática y consultar Wolfram con podstate correcto
                wolfram = await withTimeout(
                    consultarWolfram(keywordMath, null, { isStepByStep: true }),
                    6500,
                    { imagenes: [], texto: '', canStepByStep: false }
                );

                // 3. GUARDAR EN CACHÉ (DynamoDB)
                if (wolfram.imagenes && wolfram.imagenes.length > 0) {
                    await guardarSessionCache({
                        sessionId,
                        userId,
                        originalQuestion: keyword,
                        originalQuestionEn: keywordMath,
                        questionType: 'step-by-step',
                        wolframResponse: {
                            allSteps: wolfram.imagenes,
                            totalSteps: wolfram.imagenes.length,
                            imagenesNormales: wolfram.imagenesNormales || [] // ← NUEVO: Guardar pods normales
                        },
                        currentPage: 0,
                        stepsPerPage: 3,
                        timestamp: Date.now()
                    });
                }

                // Persistir en sesión para paginación (fallback)
                sessionAttributes.wolframData = {
                    keyword,
                    keywordMath,
                    imagenes: wolfram.imagenes || [],
                    imagenesNormales: wolfram.imagenesNormales || [], // ← NUEVO: Guardar pods normales
                    texto: wolfram.texto || '',
                    canStepByStep: wolfram.canStepByStep || false
                };
                sessionAttributes.currentWolframStep = 0;
            }

            if (!wolfram.texto && (!wolfram.imagenes || wolfram.imagenes.length === 0)) {
                return handlerInput.responseBuilder
                    .speak(`Lo siento, Wolfram no encontró una solución paso a paso para "${keywordMath || keyword}". Puedes intentar con más detalle.`)
                    .reprompt("¿Algo más?")
                    .getResponse();
            }

            // ── Paginación: máx 3 pods por turno ──
            const allImages = (sessionAttributes.wolframData && sessionAttributes.wolframData.imagenes) || wolfram.imagenes || [];
            const currentStep = sessionAttributes.currentWolframStep || 0;
            const maxPodsPerTurn = 3;
            const imagenesAMostrar = allImages.slice(currentStep, currentStep + maxPodsPerTurn);
            const hayMasPasos = (currentStep + maxPodsPerTurn) < allImages.length;

            // Avanzar contador
            sessionAttributes.currentWolframStep = currentStep + maxPodsPerTurn;
            attributesManager.setSessionAttributes(sessionAttributes);

            // ── Prompt Claude para que explique en español de forma pedagógica ──
            const wolframTexto = (sessionAttributes.wolframData && sessionAttributes.wolframData.texto) || wolfram.texto || '';
            const textoES = wolframTexto
                .replace(/\bIndefinite integral\b/gi, 'Integral indefinida')
                .replace(/\bDefinite integral\b/gi, 'Integral definida')
                .replace(/\bDerivative\b/gi, 'Derivada')
                .replace(/\bResult:/gi, 'Resultado:')
                .replace(/\bAlternate forms?\b/gi, 'Forma alternativa')
                .replace(/\bSeries expansion\b/gi, 'Expansión en serie')
                .replace(/\bconstant\b/gi, 'constante')
                .replace(/\bInput interpretation\b/gi, 'Interpretación')
                .replace(/\bRoots?:/gi, 'Raíces:')
                .replace(/\bPlot\b/gi, 'Gráfica');

            // Construir descripción de los pasos actuales con su texto (no solo título)
            const descripcionPasos = imagenesAMostrar.map((img, i) => {
                const texto = (img.alt || img.titulo || '').replace(/\bIndefinite integral\b/gi, 'Integral indefinida').replace(/\bStep\b/gi, 'Paso').replace(/\bconstant\b/gi, 'constante');
                return `Paso ${currentStep + i + 1}: ${texto}`;
            }).join('\n');

            const tituloSBS = formatearTituloMatematico(keywordMath || keyword);
            const promptRespuesta = `Eres el "Profesor Universal IA", experto en matemáticas. El usuario está resolviendo: "${keyword}".
Mostrando pasos ${currentStep + 1} al ${currentStep + imagenesAMostrar.length} de ${allImages.length}.

Contenido de los pasos (imágenes de Wolfram Alpha):
${descripcionPasos}

Contexto matemático: ${textoES}

INSTRUCCIONES — responde SOLO con JSON válido:
{"speech": "...", "displayTop": "...", "displayBottom": "...", "keyword": "${keyword}"}

- "speech": explica TODOS los pasos mostrados en español, pedagógico y conversacional (máx 280 chars). NO uses inglés. NO repitas la expresión matemática completa.
- "displayTop": nombre descriptivo del proceso en español, SIN expresiones matemáticas (ej: "Separación de Términos", "Integración por Partes", "Simplificación Final")
- "displayBottom": qué viene después o dato útil en español (ej: "Siguiente: agregar la constante de integración")
- Sin símbolos unicode (², √, π, ∞). TODO en ESPAÑOL.`;

            const sintesisResult = await withTimeout(
                consultarClaude(keyword, textoES, '', '', keyword, [], { prompt: promptRespuesta, timeout: 4000 }),
                4500,
                { speech: 'Aquí tienes los pasos de la solución.', displayTop: `Paso ${currentStep + 1}`, displayBottom: '', keyword }
            );

            // Limpiar speech de caracteres problemáticos para Alexa
            let speechOutput = (sintesisResult.speech || '')
                .replace(/[²³⁴⁵⁶⁷⁸⁹°]/g, '')
                .replace(/[≤≥≠×÷√π∞]/g, ' ')
                .replace(/\uFFFD/g, '')  // replacement char
                .replace(/[\u0080-\u009F]/g, '')  // control chars
                .trim();

            if (sessionAttributes.whisperMode) {
                speechOutput = `<amazon:effect name="whispered">${speechOutput.replace(/<[^>]+>/g, '')}</amazon:effect>`;
            }

            if (hayMasPasos) {
                speechOutput += ' Cuando quieras continuar, di continúa.';
            }

            // ── APL ──
            const supportedInterfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
            if (supportedInterfaces['Alexa.Presentation.APL']) {
                handlerInput.responseBuilder.addDirective({
                    type: "Alexa.Presentation.APL.RenderDocument",
                    token: "profDoc",
                    document: generarAPL(sessionAttributes.darkMode),
                    datasources: {
                        templateData: {
                            titulo: `Solución Paso a Paso (${currentStep + 1}-${Math.min(currentStep + maxPodsPerTurn, allImages.length)} de ${allImages.length})`,
                            textoSuperior: sintesisResult.displayTop || '',
                            textoInferior: sintesisResult.displayBottom || '',
                            imagenes: imagenesAMostrar,
                            fuenteWolfram: true,
                            fuenteWikipedia: false,
                            fuenteGoogle: false,
                            canStepByStep: hayMasPasos,
                            masPasosDisponibles: hayMasPasos,
                            keyword: keyword,
                            zoomLevel: sessionAttributes.zoomLevel || 85
                        }
                    }
                });
            }

            const reprompt = hayMasPasos
                ? "Di continúa para ver los siguientes pasos."
                : "¿Tienes otra duda matemática?";

            console.log(`[WOLF-MODE] ✅ OK ${Date.now() - startTime}ms | paso ${currentStep + 1}-${currentStep + imagenesAMostrar.length}/${allImages.length}`);
            return handlerInput.responseBuilder.speak(speechOutput).reprompt(reprompt).getResponse();

        } catch (e) {
            console.error("[WOLF-MODE] Error:", e);
            return handlerInput.responseBuilder.speak(fallbackSpeech('error')).getResponse();
        }
    }
};

module.exports = { WolframAlphaModeIntentHandler };
