/**
 * @fileoverview Handler principal para preguntas educativas del Profesor Universal IA.
 * Orquesta la consulta a múltiples fuentes de IA (Claude, Gemini, Wolfram, Wikipedia),
 * maneja caché inteligente, reconstrucción de preguntas ambiguas, y renderizado APL.
 * 
 * Flujo principal:
 * 1. Validación y reconstrucción de pregunta
 * 2. Extracción de keyword y análisis de cacheabilidad
 * 3. Consulta paralela a fuentes (modo DINÁMICO vs ESTÁTICO)
 * 4. Síntesis con Claude y renderizado APL
 * 5. Persistencia en caché y historial
 * 
 * @version 7.7.0
 * @author Profesor Universal IA Team
 */

const Alexa = require('ask-sdk-core');
const { getFromCache, setCache } = require('../utils/cache');
const { analizarCacheabilidad } = require('../utils/cacheabilityAnalyzer');
const { buscarEnCache, guardarEnCache } = require('../utils/s3Cache');
const { guardarPregunta } = require('../utils/userHistory');
const { fallbackSpeech } = require('../utils/fallback');
const { validateSpeech } = require('../utils/validateResponse');
const { traducir } = require('../services/traduccion');
const { consultarGemini } = require('../services/gemini');
const TIMEOUTS = require('../config/timeouts');
const { INPUT, PERFORMANCE } = require('../config/constants');
const { withTimeout } = require('../utils/timeoutManager');
const { generarAPL } = require('../services/apl');
const { obtenerKeyword, traducirGPT } = require('../services/gpt');
const { consultarClaude } = require('../services/claude');
const { reconstruirPreguntaAmbigua, extraerUbicacion } = require('../utils/reconstruccionPregunta');
const { detectarComparacion } = require('../utils/comparacion');
const { consultarWikipedia } = require('../services/wikipedia');
const { consultarWolfram } = require('../services/wolfram');
const { buscarImagenesExtra } = require('../utils/imagenesExtra');
const { esPreguntaMatematica, ejecutarRutaMatematica, formatearTituloMatematico } = require('./mathRoute');
const { esPreguntaCientifica, ejecutarRutaCientifica } = require('./scienceRoute');
const { normalizarNotacionMatematica } = require('../utils/mathNotation');

// Expresiones regulares para detección de tipos de pregunta específicos
const periodoKeywords = /\b(periodo|mandato|presidencia|gobierno|administraci[oó]n)\b/i;
const edadKeywords = /\b(edad|a[nñ]os|cumplea[nñ]os|naci[oó]|nacimiento)\b/i;
const capitalKeywords = /\b(capital)\b/i;
const alturaKeywords = /\b(altura|mide|alto|estatura)\b/i;
const fundacionKeywords = /\b(fundaci[oó]n|fundada|fundar|creada|creaci[oó]n)\b/i;
const duracionSolKeywords = /\b(dura|duraci[oó]n|horas de sol|luz solar|amanecer|atardecer|salida del sol|puesta del sol|daylight)\b/i;

// Regex para detectar preguntas que requieren datos actualizados de Wolfram Alpha
// Solo activa modo DINAMICA para preguntas con datos numéricos/actualizados.
// Preguntas históricas/biográficas van por ESTATICA — Claude+Gemini+Wiki son suficientes.
const NECESITA_WOLFRAM_RE = /\b(precio|costo|cuesta|cotizaci[oó]n|d[oó]lar|euro|bolsa|acciones?|mercado|inflaci[oó]n|pib|gdp|poblaci[oó]n actual|habitantes|clima|temperatura actual|tiempo hoy|lluvia|pronostico|resultado|marcador|campe[oó]n|clasificaci[oó]n|ranking|posici[oó]n|tabla|liga|partido|gana|gano|perdi[oó]|empat[oó]|tipo de cambio|tasa|inter[eé]s|desempleo|paro|elecciones?|votos?|encuesta|sondeo|noticias?|[uú]ltimo|reciente|hoy|ayer|esta semana|este mes|este a[nñ]o|2024|2025|2026|calcula|convierte|cu[aá]nto es|cu[aá]ntos son|resuelve|ecuaci[oó]n|integral|derivada|factorial|ra[ií]z cuadrada|logaritmo|sen[o]?|coseno|tangente|\d+\s*[+\-\*\/\^]\s*\d+|masa de|peso de|distancia de|di[aá]metro de|radio de|velocidad de|gravedad de)\b/i;

/**
 * Determina si una pregunta requiere consulta a Wolfram Alpha.
 * Analiza patrones que indican necesidad de datos actualizados o cálculos.
 * 
 * @param {string} question - Pregunta del usuario
 * @returns {boolean} true si requiere Wolfram Alpha
 */
function necesitaWolfram(question) {
    return NECESITA_WOLFRAM_RE.test(question);
}

// Mapeo de equivalencias para traducción rápida de títulos comunes
const equivalenciasTitulo = {
    Sun: 'Sol', Earth: 'Tierra', Moon: 'Luna', Jupiter: 'Jupiter', Mars: 'Marte',
    Venus: 'Venus', Saturn: 'Saturno', Mercury: 'Mercurio', Neptune: 'Neptuno',
    Uranus: 'Urano', Pluto: 'Pluton', 'United States': 'Estados Unidos',
    Mexico: 'Mexico', France: 'Francia', Spain: 'Espana'
};

// Prefijos dinámicos para generar títulos educativos atractivos
const PREFIJOS_TITULO = [
    'Explorando', 'Descubriendo', 'Aprendiendo sobre', 'Conoce', 'Todo sobre',
    'El universo de', 'Fascinante:', 'Hoy estudiamos', 'Clase de', 'Tema:'
];

/**
 * Genera un título educativo atractivo para el APL.
 * Combina prefijos dinámicos con el tema traducido.
 * 
 * @param {string} temaTraducido - Tema principal en español
 * @returns {string} Título formateado para mostrar
 */
function generarTitulo(temaTraducido) {
    if (!temaTraducido) return 'Profesor Universal IA';
    const prefijo = PREFIJOS_TITULO[Math.floor(Math.random() * PREFIJOS_TITULO.length)];
    return `${prefijo} ${temaTraducido}`;
}

/**
 * Traduce títulos técnicos al español con fallback a equivalencias.
 * Usa servicio de traducción con timeout agresivo para no bloquear.
 * 
 * @param {string} titulo - Título en inglés u otro idioma
 * @returns {Promise<string>} Título traducido al español
 */
async function traducirTituloVisual(titulo) {
    if (!titulo) return '';
    if (equivalenciasTitulo[titulo]) return equivalenciasTitulo[titulo];
    try {
        const traducido = await Promise.race([
            traducir(titulo, 'en', 'es'),
            new Promise(resolve => setTimeout(() => resolve(null), 1500))
        ]);
        if (traducido && traducido.length > 1 && traducido !== titulo)
            return traducido.charAt(0).toUpperCase() + traducido.slice(1);
    } catch (e) {}
    return titulo.charAt(0).toUpperCase() + titulo.slice(1);
}

/**
 * Verifica si el dispositivo soporta Progressive Response.
 * Necesario para enviar mensajes de "procesando" mientras se consultan las IAs.
 * 
 * @param {Object} handlerInput - Input del handler de Alexa
 * @returns {boolean} true si soporta Progressive Response
 */
function canSendProgressive(handlerInput) {
    const system = handlerInput.requestEnvelope.context && handlerInput.requestEnvelope.context.System;
    return !!(system && system.apiEndpoint && system.apiAccessToken &&
        handlerInput.serviceClientFactory && handlerInput.serviceClientFactory.getDirectiveServiceClient);
}

/**
 * Determina si una respuesta debe ser cacheada.
 * Filtra respuestas de error, timeouts y contenido insuficiente.
 * 
 * @param {Object} result - Resultado de síntesis de Claude
 * @param {Object} sources - Fuentes consultadas (wiki, wolfram, gemini)
 * @returns {boolean} true si debe cachearse
 */
function shouldCacheResponse(result, sources) {
    if (!result || !validateSpeech(result.speech)) return false;
    const normalized = (result.speech || '').toLowerCase();
    // Filtrar mensajes de error conocidos
    if (normalized.includes('la respuesta tardo') || normalized.includes('error de conexion') ||
        normalized.includes('sin respuesta de ia') || normalized.includes('tuve un problema') ||
        normalized.includes('no pude conectar') || normalized.includes('puedes repetir') ||
        normalized.includes('cerebro digital se distrajo') || normalized.includes('limite de uso alcanzado'))
        return false;
    // Verificar que hay contenido sustancial de las fuentes
    const totalChars = ((sources.wiki && sources.wiki.texto) || '').length
        + ((sources.wolfram && sources.wolfram.texto) || '').length
        + ((sources.gemini && sources.gemini.texto) || '').length;
    return totalChars > 0;
}

/**
 * Construye respuesta para solicitud de permisos de ubicación.
 * Usado cuando se necesita ubicación para preguntas sobre duración del sol.
 * 
 * @param {Object} handlerInput - Input del handler de Alexa
 * @param {boolean} permissionDenied - Si el permiso fue denegado explícitamente
 * @returns {Object} Respuesta de Alexa con card de permisos
 */
function buildLocationPermissionResponse(handlerInput, permissionDenied) {
    const builder = handlerInput.responseBuilder
        .speak('Para decirte cuanto dura el sol en tu zona necesito permiso de direccion o que me digas una ciudad, por ejemplo Bogota.')
        .reprompt('Puedes decirme una ciudad, por ejemplo Bogota, o conceder permiso de direccion.');
    if (permissionDenied)
        builder.withAskForPermissionsConsentCard(['read::alexa:device:all:address:country_and_postal_code']);
    return builder.getResponse();
}

/**
 * Handler principal para el intent AskProfeIntent.
 * Procesa preguntas educativas consultando múltiples fuentes de IA y generando
 * respuestas multimodales con contenido visual APL.
 */
const AskProfeIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskProfeIntent';
    },
    
    /**
     * Maneja la pregunta educativa del usuario.
     * 
     * Flujo principal:
     * 1. Inicialización y validación de entrada
     * 2. Obtención de ubicación (si es necesaria)
     * 3. Reconstrucción de preguntas ambiguas
     * 4. Extracción de keyword y análisis de caché
     * 5. Consulta a fuentes (modo DINÁMICO vs ESTÁTICO)
     * 6. Síntesis con Claude y renderizado APL
     * 7. Persistencia y respuesta final
     * 
     * @param {Object} handlerInput - Input del handler de Alexa
     * @returns {Promise<Object>} Respuesta de Alexa con speech y APL
     */
    async handle(handlerInput) {
        const startTime = Date.now();
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes();

        // Inicializar atributos de sesión con valores por defecto
        if (!sessionAttributes.memory) sessionAttributes.memory = {};
        if (!sessionAttributes.history) sessionAttributes.history = [];
        if (typeof sessionAttributes.lastQuestion === 'undefined') sessionAttributes.lastQuestion = '';
        if (typeof sessionAttributes.lastSubject === 'undefined') sessionAttributes.lastSubject = '';
        if (typeof sessionAttributes.lastKeyword === 'undefined') sessionAttributes.lastKeyword = '';
        if (typeof sessionAttributes.whisperMode === 'undefined') sessionAttributes.whisperMode = false;
        if (typeof sessionAttributes.darkMode === 'undefined') sessionAttributes.darkMode = false;
        if (typeof sessionAttributes.zoomLevel === 'undefined') sessionAttributes.zoomLevel = 85;
        if (typeof sessionAttributes.pendingLocationRequest === 'undefined') sessionAttributes.pendingLocationRequest = null;

        // Obtener ubicación del dispositivo de forma asíncrona (para preguntas sobre duración del sol)
        const locationPromise = (async () => {
            try {
                const system = handlerInput.requestEnvelope.context && handlerInput.requestEnvelope.context.System;
                if (!system || !system.device) return { postalCode: null, countryCode: null, permissionDenied: false };
                const { deviceId } = system.device;
                const apiAccessToken = system.apiAccessToken;
                const apiEndpoint = system.apiEndpoint;
                if (!deviceId || !apiAccessToken || !apiEndpoint) return { postalCode: null, countryCode: null, permissionDenied: false };
                const endpointUrl = new URL(apiEndpoint);
                const https = require('https');
                return await Promise.race([
                    new Promise((resolve) => {
                        const req = https.get({
                            hostname: endpointUrl.hostname,
                            path: `/v1/devices/${deviceId}/settings/address/countryAndPostalCode`,
                            method: 'GET',
                            headers: { Authorization: `Bearer ${apiAccessToken}` },
                            timeout: 800
                        }, (res) => {
                            let data = '';
                            res.on('data', chunk => { data += chunk; });
                            res.on('end', () => {
                                try {
                                    if (res.statusCode === 200) {
                                        const loc = JSON.parse(data);
                                        if (loc.postalCode && loc.postalCode !== '94043') {
                                            resolve({ postalCode: loc.postalCode, countryCode: loc.countryCode || null, permissionDenied: false });
                                            return;
                                        }
                                    }
                                    if (res.statusCode === 403) { resolve({ postalCode: null, countryCode: null, permissionDenied: true }); return; }
                                    resolve({ postalCode: null, countryCode: null, permissionDenied: false });
                                } catch (e) { resolve({ postalCode: null, countryCode: null, permissionDenied: false }); }
                            });
                        });
                        req.on('error', () => resolve({ postalCode: null, countryCode: null, permissionDenied: false }));
                        req.on('timeout', () => { req.destroy(); resolve({ postalCode: null, countryCode: null, permissionDenied: false }); });
                    }),
                    new Promise(resolve => setTimeout(() => resolve({ postalCode: null, countryCode: null, permissionDenied: false }), 800))
                ]);
            } catch (e) { return { postalCode: null, countryCode: null, permissionDenied: false }; }
        })();

        let question = handlerInput.requestEnvelope.request.intent.slots
            && handlerInput.requestEnvelope.request.intent.slots.question
            && handlerInput.requestEnvelope.request.intent.slots.question.value
            ? handlerInput.requestEnvelope.request.intent.slots.question.value : '';

        // Truncar preguntas excesivamente largas para evitar problemas de procesamiento
        if (question && question.length > INPUT.MAX_QUESTION_LENGTH) question = question.substring(0, INPUT.MAX_QUESTION_LENGTH);
        console.log(`[IN-ASK] Pregunta: "${question}" | T+${Date.now() - startTime}ms`);

        // Fallback a última pregunta si no se detectó entrada
        if (!question || question.length < 2) {
            if (sessionAttributes.lastQuestion) { question = sessionAttributes.lastQuestion; }
            else return handlerInput.responseBuilder.speak('Que quieres preguntarle al profesor?').reprompt('Que quieres preguntarle al profesor?').getResponse();
        }

        const rawQuestion = question;
        // Detectar si la entrada parece ser solo una ubicación (para contexto de duración del sol)
        const questionLooksLikeLocationOnly = /^[a-zA-Z\u00C0-\u017F\s-]{2,40}$/.test(rawQuestion.trim()) && rawQuestion.trim().split(/\s+/).length <= 4;

        // Manejar contexto de ubicación pendiente para preguntas sobre duración del sol
        if (sessionAttributes.pendingLocationRequest === 'duracion_sol') {
            if (questionLooksLikeLocationOnly && !duracionSolKeywords.test(rawQuestion))
                question = `cuanto dura el sol en ${rawQuestion.trim()}`;
            sessionAttributes.pendingLocationRequest = null;
        }

        // Detectar preguntas ambiguas que requieren reconstrucción con contexto
        const pronombresAmbiguos = /\b(el|ella|eso|esa|este|esta|lo|la|le|it|its|this|that|tiene|puede|mide|fue|era|son|esta|pesa|cuesta|necesita|hace|hizo|sirve|funciona|contiene|produce|comparalo|comparalos|compararla|compararlas|comparar|quien|cual|donde|como|cuando|para|su|sus)\b/i;
        const comparacionKeywords = /\b(compara|comparar|comparado|vs|versus|contra|frente a|comparacion)\b/i;
        const contextoRelevante = sessionAttributes.lastSubject || sessionAttributes.lastKeyword || '';
        
        // Clasificar tipo de dato solicitado para optimizar la reconstrucción
        const datoSolicitado = (() => {
            if (periodoKeywords.test(question)) return 'periodo';
            if (edadKeywords.test(question)) return 'edad';
            if (capitalKeywords.test(question)) return 'capital';
            if (alturaKeywords.test(question)) return 'altura';
            if (fundacionKeywords.test(question)) return 'fundacion';
            if (duracionSolKeywords.test(question)) return 'duracion_sol';
            return null;
        })();

        let preguntaReconstruida = question;
        let questionEn = question;
        
        // Reconstruir preguntas ambiguas usando contexto de conversación
        if (pronombresAmbiguos.test(question) && contextoRelevante) {
            const comparacion = detectarComparacion(question, sessionAttributes, comparacionKeywords);
            if (comparacion.preguntaReconstruida) {
                preguntaReconstruida = comparacion.preguntaReconstruida;
            } else {
                // Usar GPT para reconstruir pregunta ambigua con contexto
                const reconstruccion = await withTimeout(
                    reconstruirPreguntaAmbigua(question, contextoRelevante, datoSolicitado, sessionAttributes, { pronombresAmbiguos, comparacionKeywords, traducirGPT }),
                    1200,
                    { preguntaReconstruida: question, preguntaReconstruidaEn: question, preguntaAmbigua: false }
                );
                preguntaReconstruida = reconstruccion.preguntaReconstruida;
                questionEn = reconstruccion.preguntaReconstruidaEn || question;
                console.log(`[RECONSTRUCT] "${question}" -> "${preguntaReconstruida}" | T+${Date.now() - startTime}ms`);
            }
        }
        question = preguntaReconstruida;

        // Extraer keyword principal usando GPT con contexto de historial
        let keyword = await withTimeout(
            obtenerKeyword(question, sessionAttributes.history, sessionAttributes.lastSubject || sessionAttributes.lastKeyword, datoSolicitado),
            TIMEOUTS.KEYWORD_EXTRACTION_TIMEOUT, question
        );
        if (!keyword || keyword.length < INPUT.MIN_QUESTION_LENGTH) keyword = question;
        
        // Sanitizar keyword para Wolfram: traducir expresiones matemáticas en español a notación estándar
        keyword = normalizarNotacionMatematica(keyword);
        console.log(`[KEYWORD] "${keyword}" | T+${Date.now() - startTime}ms`);

        // ═══════════════════════════════════════════════════════════════════════════
        // RUTAS ESPECIALIZADAS: Matemática y Científica
        // ═══════════════════════════════════════════════════════════════════════════
        
        // Detectar si es pregunta matemática
        if (esPreguntaMatematica(question)) {
            console.log('[ROUTE] Detectada pregunta MATEMÁTICA');
            try {
                const resultadoMath = await ejecutarRutaMatematica(question, keyword, startTime);
                if (resultadoMath) {
                    // Aplicar whisper mode si está activo
                    let speechOutput = resultadoMath.speech;
                    if (sessionAttributes.whisperMode)
                        speechOutput = `<amazon:effect name="whispered">${speechOutput.replace(/<[^>]+>/g, '')}</amazon:effect>`;
                    
                    // Actualizar sesión
                    sessionAttributes.lastQuestion = question;
                    sessionAttributes.lastSubject = resultadoMath.keyword;
                    sessionAttributes.lastKeyword = keyword;
                    sessionAttributes.lastDisplayTop = resultadoMath.displayTop;
                    sessionAttributes.lastDisplayBottom = resultadoMath.displayBottom;
                    sessionAttributes.lastImagenes = resultadoMath.imagenes.slice(0, 12);
                    sessionAttributes.lastImagenesPasos = (resultadoMath.imagenesPasos || []).slice(0, 20);
                    sessionAttributes.lastFuenteWolfram = true;
                    sessionAttributes.lastFuenteWikipedia = false;
                    sessionAttributes.history.push(
                        { role: 'user', content: question },
                        { role: 'assistant', content: resultadoMath.speech }
                    );
                    sessionAttributes.history = sessionAttributes.history.slice(-8);
                    attributesManager.setSessionAttributes(sessionAttributes);
                    
                    // Guardar historial
                    const userId = handlerInput.requestEnvelope.session.user.userId;
                    guardarPregunta(userId, question, keyword).catch(e => console.log('[HISTORY] Error:', e.message));
                    
                    console.log(`[MATH-ROUTE] Completada | T+${Date.now() - startTime}ms`);
                    
                    // Renderizar APL
                    const supportedInterfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
                    if (supportedInterfaces['Alexa.Presentation.APL']) {
                        try {
                            handlerInput.responseBuilder.addDirective({
                                type: 'Alexa.Presentation.APL.RenderDocument',
                                token: 'profDoc',
                                document: generarAPL(sessionAttributes.darkMode),
                                datasources: {
                                    templateData: {
                                        titulo: resultadoMath.tituloAPL || formatearTituloMatematico(keyword),
                                        textoSuperior: resultadoMath.displayTop,
                                        textoInferior: resultadoMath.displayBottom,
                                        imagenes: resultadoMath.imagenes.slice(0, 12),
                                        imagenesExtra: [],
                                        fuenteWolfram: true,
                                        fuenteWikipedia: false,
                                        fuenteGoogle: false,
                                        canStepByStep: resultadoMath.canStepByStep,
                                        masPasosDisponibles: false,
                                        hayMasImagenes: false,
                                        keyword,
                                        originalQuestion: question,
                                        originalQuestionEn: questionEn,
                                        zoomLevel: sessionAttributes.zoomLevel
                                    }
                                }
                            });
                        } catch (aplError) { console.log('[APL] Error:', aplError.message); }
                    }
                    
                    return handlerInput.responseBuilder.speak(speechOutput).reprompt('Algo mas?').getResponse();
                }
            } catch (mathError) {
                console.error('[MATH-ROUTE] Error:', mathError);
                // Wolfram ya fue consultado y falló — marcar para no repetir en flujo normal
                sessionAttributes._wolframYaFallo = true;
            }
        }
        
        // Detectar si es pregunta científica
        if (esPreguntaCientifica(question)) {
            console.log('[ROUTE] Detectada pregunta CIENTÍFICA');
            try {
                const resultadoScience = await ejecutarRutaCientifica(question, keyword);
                if (resultadoScience) {
                    let speechOutput = resultadoScience.speech;
                    if (sessionAttributes.whisperMode)
                        speechOutput = `<amazon:effect name="whispered">${speechOutput.replace(/<[^>]+>/g, '')}</amazon:effect>`;
                    
                    sessionAttributes.lastQuestion = question;
                    sessionAttributes.lastSubject = resultadoScience.keyword;
                    sessionAttributes.lastKeyword = keyword;
                    sessionAttributes.lastDisplayTop = resultadoScience.displayTop;
                    sessionAttributes.lastDisplayBottom = resultadoScience.displayBottom;
                    sessionAttributes.lastImagenes = resultadoScience.imagenes.slice(0, 12);
                    sessionAttributes.lastFuenteWolfram = true;
                    sessionAttributes.lastFuenteWikipedia = true;
                    sessionAttributes.history.push(
                        { role: 'user', content: question },
                        { role: 'assistant', content: resultadoScience.speech }
                    );
                    sessionAttributes.history = sessionAttributes.history.slice(-8);
                    attributesManager.setSessionAttributes(sessionAttributes);
                    
                    const userId = handlerInput.requestEnvelope.session.user.userId;
                    guardarPregunta(userId, question, keyword).catch(e => console.log('[HISTORY] Error:', e.message));
                    
                    console.log(`[SCIENCE-ROUTE] Completada | T+${Date.now() - startTime}ms`);
                    
                    const supportedInterfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
                    if (supportedInterfaces['Alexa.Presentation.APL']) {
                        try {
                            handlerInput.responseBuilder.addDirective({
                                type: 'Alexa.Presentation.APL.RenderDocument',
                                token: 'profDoc',
                                document: generarAPL(sessionAttributes.darkMode),
                                datasources: {
                                    templateData: {
                                        titulo: `Ciencia: ${keyword}`,
                                        textoSuperior: resultadoScience.displayTop,
                                        textoInferior: resultadoScience.displayBottom,
                                        imagenes: resultadoScience.imagenes.slice(0, 12),
                                        imagenesExtra: [],
                                        fuenteWolfram: true,
                                        fuenteWikipedia: true,
                                        fuenteGoogle: false,
                                        canStepByStep: false,
                                        masPasosDisponibles: false,
                                        hayMasImagenes: false,
                                        keyword,
                                        originalQuestion: question,
                                        originalQuestionEn: questionEn,
                                        zoomLevel: sessionAttributes.zoomLevel
                                    }
                                }
                            });
                        } catch (aplError) { console.log('[APL] Error:', aplError.message); }
                    }
                    
                    return handlerInput.responseBuilder.speak(speechOutput).reprompt('Algo mas?').getResponse();
                }
            } catch (scienceError) {
                console.error('[SCIENCE-ROUTE] Error:', scienceError);
                // Continuar con flujo normal si falla
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════════════
        // FLUJO NORMAL: Preguntas generales
        // ═══════════════════════════════════════════════════════════════════════════

        // Iniciar tareas asíncronas para optimizar tiempo de respuesta
        const tituloIA_Promise = traducirTituloVisual(keyword);
        const imagenesExtraPromise = buscarImagenesExtra(keyword, 30);

        // Enviar Progressive Response para mejorar experiencia de usuario durante procesamiento
        if (canSendProgressive(handlerInput)) {
            const msgs = [
                'Un momento mientras busco la mejor explicacion para ti...',
                'Dejame pensar... revisando informacion en Wolfram Alpha y Wikipedia.',
                'Consultando a mis inteligencias artificiales, dame un segundo...',
                'Sabias que puedes decir activa modo wolfram para resolver ecuaciones paso a paso? Ya casi tengo tu respuesta.',
                'Procesando tu pregunta en mis bases de datos...'
            ];
            try {
                const directiveServiceClient = handlerInput.serviceClientFactory.getDirectiveServiceClient();
                await directiveServiceClient.enqueue(
                    { header: { requestId: handlerInput.requestEnvelope.request.requestId }, directive: { type: 'VoicePlayer.Speak', speech: msgs[Math.floor(Math.random() * msgs.length)] } },
                    handlerInput.requestEnvelope.context.System.apiEndpoint,
                    handlerInput.requestEnvelope.context.System.apiAccessToken
                );
                console.log(`[PROGRESSIVE] Enviado | T+${Date.now() - startTime}ms`);
            } catch (err) { console.log('[PROGRESSIVE] No se pudo enviar:', err.message); }
        }

        try {
            const explicitLocation = extraerUbicacion(rawQuestion) || extraerUbicacion(question);
            const locationData = await locationPromise;
            const userLocation = explicitLocation
                ? explicitLocation
                : locationData.postalCode
                    ? locationData.countryCode ? `${locationData.postalCode}, ${locationData.countryCode}` : locationData.postalCode
                    : null;

            const contextualCache = pronombresAmbiguos.test(rawQuestion) && !!contextoRelevante;
            const analisisCache = analizarCacheabilidad(question, { keyword, location: userLocation, contextual: contextualCache });

            // Intentar caché S3 primero
            let cachedResult = null;
            if (analisisCache.cacheable) {
                cachedResult = getFromCache(analisisCache.cacheKey);
                if (!cachedResult) {
                    const s3Hit = await withTimeout(buscarEnCache(analisisCache.cacheKey), 800, null);
                    if (s3Hit) cachedResult = { wiki: { texto: '' }, wolfram: { imagenes: s3Hit.imagenes || [], texto: '' }, gemini: { texto: '' }, sintesisResult: s3Hit };
                }
                if (cachedResult) console.log(`[CACHE] HIT | T+${Date.now() - startTime}ms`);
            }

            let wiki, wolfram, gemini, sintesisResult, imagenesExtraPool = [];

            if (cachedResult) {
                wiki = cachedResult.wiki;
                gemini = cachedResult.gemini;
                sintesisResult = cachedResult.sintesisResult;
                // URLs de Wolfram expiran (~1-2h) — siempre re-consultar para imágenes frescas
                const wolframKeywordCache = keyword;
                const [wolframFresh, imgExtraFresh] = await Promise.all([
                    withTimeout(consultarWolfram(wolframKeywordCache, null), TIMEOUTS.WOLFRAM_TIMEOUT, { imagenes: [], texto: '', canStepByStep: false }),
                    withTimeout(imagenesExtraPromise, TIMEOUTS.IMAGES_EXTRA_TIMEOUT, [])
                ]);
                wolfram = (wolframFresh && wolframFresh.imagenes.length > 0) ? wolframFresh : (cachedResult.wolfram || { imagenes: [], texto: '', canStepByStep: false });
                imagenesExtraPool = Array.isArray(imgExtraFresh) ? imgExtraFresh : [];
                console.log(`[CACHE-HIT] Wolfram fresco: ${wolfram.imagenes.length} imgs | T+${Date.now() - startTime}ms`);
            } else {
                const wolframKeyword = datoSolicitado === 'duracion_sol' && userLocation ? 'Sun' : keyword;

                if (datoSolicitado === 'duracion_sol' && !explicitLocation && !userLocation) {
                    sessionAttributes.pendingLocationRequest = 'duracion_sol';
                    attributesManager.setSessionAttributes(sessionAttributes);
                    return buildLocationPermissionResponse(handlerInput, locationData.permissionDenied);
                }

                const DEADLINE = startTime + PERFORMANCE.GLOBAL_DEADLINE_MS;

                const wolframPromise = sessionAttributes._wolframYaFallo
                    ? Promise.resolve({ imagenes: [], texto: '', canStepByStep: false, stepByStepInputs: [] })
                    : withTimeout(consultarWolfram(wolframKeyword, userLocation), TIMEOUTS.WOLFRAM_TIMEOUT, { imagenes: [], texto: '', canStepByStep: false, stepByStepInputs: [] });
                delete sessionAttributes._wolframYaFallo;
                const wikiPromise    = withTimeout(consultarWikipedia(keyword), TIMEOUTS.WIKI_TIMEOUT, { texto: '', imagen: '', titulo: '' });
                const geminiPromise  = withTimeout(consultarGemini(question), TIMEOUTS.GEMINI_TIMEOUT, { texto: '', fuente: '' });
                const imgExtraPromise2 = withTimeout(imagenesExtraPromise, TIMEOUTS.IMAGES_EXTRA_TIMEOUT, []);

                const preguntaNecesitaWolfram = necesitaWolfram(question);
                const esCalculoNumerico = /\b(ecuaci[oó]n|resuelve|calcula|factorial|ra[ií]z|logaritmo|\d+\s*[+\-\*\/\^]\s*\d+)\b/i.test(question);
                let wolframLlego = false;

                if (preguntaNecesitaWolfram) {
                    // Modo DINAMICA: esperar wiki primero, luego gemini con timeout agresivo
                    // Si gemini tarda mas de 2.5s, arrancar Claude sin el
                    const GEMINI_MAX = Math.min(2500, DEADLINE - Date.now() - 3500);
                    const [wikiResult, geminiResult] = await Promise.all([
                        wikiPromise,
                        GEMINI_MAX > 0
                            ? Promise.race([geminiPromise, new Promise(r => setTimeout(() => r({ texto: '', fuente: '' }), GEMINI_MAX))])
                            : Promise.resolve({ texto: '', fuente: '' })
                    ]);
                    wiki   = wikiResult  || { texto: '', imagen: '', titulo: '' };
                    gemini = geminiResult || { texto: '', fuente: '' };

                    const maxGrace = esCalculoNumerico ? 1500 : 800;
                    const wolframGrace = Math.max(0, Math.min(maxGrace, DEADLINE - Date.now() - 2500));
                    const wolframEarly = wolframGrace > 0
                        ? await Promise.race([wolframPromise, new Promise(r => setTimeout(() => r(null), wolframGrace))])
                        : null;
                    wolfram = wolframEarly || { imagenes: [], texto: '', canStepByStep: false, stepByStepInputs: [] };
                    wolframLlego = !!wolframEarly;
                    console.log(`[WOLFRAM-MODE] DINAMICA | numerico=${esCalculoNumerico} | gracia=${wolframGrace}ms | llegó=${wolframLlego} | T+${Date.now() - startTime}ms`);
                } else {
                    // Modo ESTATICA: wiki llega rápido (~60ms), Claude arranca en paralelo con Gemini
                    wiki = await wikiPromise;
                    wiki = wiki || { texto: '', imagen: '', titulo: '' };
                    wolfram = { imagenes: [], texto: '', canStepByStep: false, stepByStepInputs: [] };
                    wolframLlego = false;
                    console.log(`[WOLFRAM-MODE] ESTATICA | wiki=${wiki.texto.length}ch | Claude arranca en paralelo con Gemini | T+${Date.now() - startTime}ms`);
                }

                console.log(`[SOURCES] wolfram=${wolfram.texto.length}ch imgs=${wolfram.imagenes.length} wolframOK=${wolframLlego} | wiki=${wiki.texto.length}ch | T+${Date.now() - startTime}ms`);

                const timeoutClaude = Math.max(1800, DEADLINE - Date.now() - 100);
                console.log(`[CLAUDE-BUDGET] ${timeoutClaude}ms disponibles para Claude | T+${Date.now() - startTime}ms`);

                // En modo ESTATICA: Claude arranca con wiki (ya disponible), Gemini llega para display.
                // En modo DINAMICA: gemini ya está resuelto arriba.
                const geminiTextoParaClaude = preguntaNecesitaWolfram ? gemini.texto : '';

                const [sintesisRaw, imgExtraResult, wolframFinal, geminiLate] = await Promise.all([
                    withTimeout(
                        consultarClaude(question, wolfram.texto, wiki.texto, geminiTextoParaClaude, keyword, sessionAttributes.history.slice(-4), { timeout: timeoutClaude }),
                        timeoutClaude + 300,
                        { speech: fallbackSpeech('timeout'), displayTop: keyword, displayBottom: '', keyword }
                    ),
                    imgExtraPromise2,
                    wolframLlego ? Promise.resolve(wolfram) : withTimeout(wolframPromise, timeoutClaude + 200, wolfram),
                    preguntaNecesitaWolfram ? Promise.resolve(gemini) : geminiPromise.catch(() => ({ texto: '', fuente: '' }))
                ]);

                sintesisResult = sintesisRaw;
                if (!preguntaNecesitaWolfram && geminiLate && geminiLate.texto)
                    gemini = geminiLate;
                imagenesExtraPool = Array.isArray(imgExtraResult) ? imgExtraResult : [];

                if (!wolframLlego && wolframFinal && (wolframFinal.imagenes.length > 0 || wolframFinal.texto.length > 0)) {
                    wolfram = wolframFinal;
                    console.log(`[WOLFRAM-LATE] imgs=${wolfram.imagenes.length} | T+${Date.now() - startTime}ms`);
                }

                if (analisisCache.cacheable && shouldCacheResponse(sintesisResult, { wiki, wolfram, gemini })) {
                    setCache(analisisCache.cacheKey, { wiki, wolfram, gemini, sintesisResult });
                    const dataToCache = {
                        speech: sintesisResult.speech, displayTop: sintesisResult.displayTop,
                        displayBottom: sintesisResult.displayBottom, keyword: sintesisResult.keyword || keyword,
                        imagenes: [], // URLs Wolfram expiran — no cachear, se re-consultan en cada HIT
                        canStepByStep: !!(wolfram && wolfram.canStepByStep)
                    };
                    guardarEnCache(analisisCache.cacheKey, question, dataToCache).catch(e => console.log('[S3-CACHE] Error:', e.message));
                }
            }

            if (!sintesisResult || !validateSpeech(sintesisResult.speech))
                sintesisResult = { speech: fallbackSpeech('error'), displayTop: keyword, displayBottom: '', keyword };

            function stripEmojis(str) {
                if (!str) return str;
                return str.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA9F}]/gu, '').replace(/\s{2,}/g, ' ').trim();
            }
            function stripMarkdown(str) {
                if (!str) return str;
                return str
                    .replace(/\*\*(.+?)\*\*/g, '$1')  // **negrita**
                    .replace(/\*(.+?)\*/g, '$1')       // *cursiva*
                    .replace(/#{1,6}\s*/g, '')          // # encabezados
                    .replace(/`{1,3}[^`]*`{1,3}/g, '') // `codigo`
                    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url)
                    .trim();
            }
            sintesisResult.displayTop = stripMarkdown(stripEmojis(sintesisResult.displayTop) || sintesisResult.displayTop);
            if (!sintesisResult.displayBottom && wiki && wiki.texto && wiki.texto.length > 20)
                sintesisResult.displayBottom = wiki.texto.substring(0, 300);
            sintesisResult.displayBottom = stripMarkdown(stripEmojis(sintesisResult.displayBottom) || sintesisResult.displayBottom);

            let speechOutput = sintesisResult.speech;
            if (sessionAttributes.whisperMode)
                speechOutput = `<amazon:effect name="whispered">${speechOutput.replace(/<[^>]+>/g, '')}</amazon:effect>`;

            if (!cachedResult) {
                sessionAttributes.imagenesExtraPool = imagenesExtraPool;
                sessionAttributes.imagenesExtraOffset = 6;
            } else {
                // Caché hit: actualizar pool con imágenes frescas del keyword actual
                sessionAttributes.imagenesExtraPool = imagenesExtraPool;
                sessionAttributes.imagenesExtraOffset = 6;
            }
            const imagenesExtraIniciales = imagenesExtraPool.slice(0, 6);
            const hayMasImagenes = imagenesExtraPool.length > 6;

            sessionAttributes.lastQuestion = question;
            sessionAttributes.lastSubject = sintesisResult.keyword || keyword;
            sessionAttributes.lastKeyword = keyword;
            sessionAttributes.lastDisplayTop = sintesisResult.displayTop || '';
            sessionAttributes.lastDisplayBottom = sintesisResult.displayBottom || '';
            sessionAttributes.lastImagenes = (wolfram.imagenes && wolfram.imagenes.length > 0) ? wolfram.imagenes.slice(0, 12) : [];
            sessionAttributes.lastFuenteWolfram = !!(wolfram && (wolfram.imagenes.length > 0 || (wolfram.texto || '').length > 5));
            sessionAttributes.lastFuenteWikipedia = !!(wiki && wiki.texto && wiki.texto.length > 10);
            sessionAttributes.pendingLocationRequest = null;
            sessionAttributes.history.push({ role: 'user', content: question }, { role: 'assistant', content: sintesisResult.speech });
            sessionAttributes.history = sessionAttributes.history.slice(-8);
            attributesManager.setSessionAttributes(sessionAttributes);

            // Guardar historial en DynamoDB en background
            const userId = handlerInput.requestEnvelope.session.user.userId;
            guardarPregunta(userId, question, keyword).catch(e => console.log('[HISTORY] Error:', e.message));

            console.log(`[TOTAL] ${Date.now() - startTime}ms`);

            const supportedInterfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
            if (supportedInterfaces['Alexa.Presentation.APL']) {
                try {
                    handlerInput.responseBuilder.addDirective({
                        type: 'Alexa.Presentation.APL.RenderDocument',
                        token: 'profDoc',
                        document: generarAPL(sessionAttributes.darkMode),
                        datasources: {
                            templateData: {
                                titulo: generarTitulo(await tituloIA_Promise),
                                textoSuperior: sintesisResult.displayTop,
                                textoInferior: sintesisResult.displayBottom,
                                imagenes: (wolfram.imagenes && wolfram.imagenes.length > 0) ? wolfram.imagenes.slice(0, 12) : [],
                                imagenesExtra: imagenesExtraIniciales,
                                fuenteWolfram: !!(wolfram && (wolfram.imagenes.length > 0 || (wolfram.texto || '').length > 5)),
                                fuenteWikipedia: !!(wiki && wiki.texto && wiki.texto.length > 10),
                                fuenteGoogle: !!(gemini && gemini.texto && gemini.texto.length > 5),
                                canStepByStep: !!(wolfram && wolfram.canStepByStep),
                                masPasosDisponibles: false,
                                hayMasImagenes,
                                keyword,
                                originalQuestion: question,
                                originalQuestionEn: questionEn,
                                zoomLevel: sessionAttributes.zoomLevel
                            }
                        }
                    });
                } catch (aplError) { console.log('[APL] Error:', aplError.message); }
            }

            return handlerInput.responseBuilder.speak(speechOutput).reprompt('Algo mas?').getResponse();
        } catch (e) {
            console.error('[ASK-PROFE] Error:', e);
            return handlerInput.responseBuilder.speak(fallbackSpeech('error')).getResponse();
        }
    }
};

module.exports = { AskProfeIntentHandler };
