/**
 * @fileoverview Punto de entrada principal de la Skill "Profesor Universal IA" para AWS Lambda.
 * Configura todos los handlers de intents, maneja eventos APL, y orquesta la experiencia educativa
 * multimodal con soporte para modo oscuro, zoom, susurro y navegación por voz.
 * 
 * @version 7.7.3
 * @author Profesor Universal IA Team
 */

const Alexa = require('ask-sdk-core');
const { generarAPL } = require('./services/apl');
const { getFromCache, setCache } = require('./utils/cache');
const { fallbackSpeech } = require('./utils/fallback');
const { UI } = require('./config/constants');

const { AskProfeIntentHandler }          = require('./handlers/AskProfeIntentHandler');
const { WolframAlphaModeIntentHandler }  = require('./handlers/WolframAlphaModeIntentHandler');
const { ContinueWolframIntentHandler }   = require('./handlers/ContinueWolframIntentHandler');
const { SkipToResultIntentHandler }      = require('./handlers/SkipToResultIntentHandler');
const { RepeatLastQuestionIntentHandler } = require('./handlers/RepeatLastQuestionIntentHandler');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normaliza texto de entrada para detectar modo visual (oscuro/claro).
 * Elimina acentos y convierte a minúsculas para matching robusto.
 * 
 * @param {string} texto - Texto del slot de voz del usuario
 * @returns {boolean|null} true=oscuro, false=claro, null=no reconocido
 */
function normalizarModoVisual(texto) {
    const n = (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (/oscuro/.test(n)) return true;
    if (/claro/.test(n))  return false;
    return null;
}

/**
 * Normaliza texto de entrada para detectar dirección de zoom.
 * Reconoce variaciones de "acercar/agrandar" vs "alejar/achicar".
 * 
 * @param {string} texto - Texto del slot de voz del usuario
 * @returns {string|null} 'in'=acercar, 'out'=alejar, null=no reconocido
 */
function normalizarDireccionZoom(texto) {
    const n = (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (/\b(acerc|agrand|aument|ampli|mas grande|zoom mas|zoom in)\w*\b/.test(n)) return 'in';
    if (/\b(alej|achic|reduc|dismin|mas peque|zoom menos|zoom out)\w*\b/.test(n)) return 'out';
    return null;
}

function resolverSlot(slots, nombre) {
    const slot = slots && slots[nombre];
    if (!slot) return null;
    // Valor directo
    if (slot.value) return slot.value;
    // Resolución de entidad (cuando Alexa resuelve el slot type)
    const resolutions = slot.resolutions && slot.resolutions.resolutionsPerAuthority;
    if (resolutions && resolutions.length > 0) {
        const resolved = resolutions[0];
        if (resolved.values && resolved.values.length > 0) return resolved.values[0].value.name;
    }
    return null;
}

/**
 * Construye el datasource para el documento APL con datos de la sesión.
 * Centraliza la lógica de mapeo entre sessionAttributes y templateData.
 * 
 * @param {Object} sessionAttributes - Atributos de sesión de Alexa
 * @param {Object} overrides - Valores específicos para sobrescribir
 * @returns {Object} Datasource formateado para APL
 */
function aplDatasource(sessionAttributes, overrides = {}) {
    return {
        templateData: {
            titulo:          sessionAttributes.lastKeyword || 'Profesor Universal IA',
            textoSuperior:   sessionAttributes.lastDisplayTop    || '',
            textoInferior:   sessionAttributes.lastDisplayBottom || '',
            imagenes:        sessionAttributes.lastImagenes       || [],
            imagenesExtra:   (sessionAttributes.imagenesExtraPool || []).slice(0, sessionAttributes.imagenesExtraOffset || 6),
            fuenteWolfram:   !!sessionAttributes.lastFuenteWolfram,
            fuenteWikipedia: !!sessionAttributes.lastFuenteWikipedia,
            fuenteGoogle:    false,
            canStepByStep:   false,
            masPasosDisponibles: false,
            hayMasImagenes:  false,
            keyword:         sessionAttributes.lastKeyword || '',
            zoomLevel:       sessionAttributes.zoomLevel   || 85,
            ...overrides
        }
    };
}

/**
 * Renderiza documento APL si el dispositivo lo soporta.
 * Verifica capacidades del dispositivo antes de enviar directiva de renderizado.
 * 
 * @param {Object} handlerInput - Input del handler de Alexa
 * @param {Object} sessionAttributes - Atributos de sesión actuales
 * @param {Object} overrides - Datos específicos para sobrescribir en datasource
 */
function renderAPL(handlerInput, sessionAttributes, overrides = {}) {
    const si = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
    if (!si || !si['Alexa.Presentation.APL']) return; // Dispositivo sin soporte APL
    handlerInput.responseBuilder.addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: 'profDoc',
        document: generarAPL(!!sessionAttributes.darkMode), // Generar documento según tema
        datasources: aplDatasource(sessionAttributes, overrides)
    });
}

// ── Handlers de sistema ───────────────────────────────────────────────────────

/**
 * Handler para LaunchRequest - Inicialización de la skill.
 * Configura atributos de sesión por defecto y da la bienvenida educativa.
 */
const LaunchRequestHandler = {
    canHandle(h) { return Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest'; },
    handle(h) {
        // Inicializar sesión con valores por defecto
        h.attributesManager.setSessionAttributes({
            history: [], lastSubject: '', lastKeyword: '',
            whisperMode: false, darkMode: false, zoomLevel: 85
        });
        const msg = '¡Profesor en línea! ¿Qué concepto vamos a estudiar hoy?';
        return h.responseBuilder.speak(msg).reprompt(msg).getResponse();
    }
};

/**
 * Handler para cambio de modo visual (claro/oscuro).
 * Procesa slots de voz y actualiza tema visual del APL.
 */
const DarkModeIntentHandler = {
    canHandle(h) {
        return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(h.requestEnvelope) === 'DarkModeIntent';
    },
    handle(h) {
        const sa = h.attributesManager.getSessionAttributes();
        const slots = h.requestEnvelope.request.intent.slots;
        const val = resolverSlot(slots, 'visualMode');
        const modo = normalizarModoVisual(val);
        if (modo === null) {
            return h.responseBuilder
                .speak('Di modo oscuro o modo claro.')
                .reprompt('Di modo oscuro o modo claro.').getResponse();
        }
        
        const yaActivo = sa.darkMode === modo;
        sa.darkMode = modo;
        h.attributesManager.setSessionAttributes(sa);
        
        const msg = yaActivo
            ? (modo ? 'El modo oscuro ya está activado.' : 'El modo claro ya está activado.')
            : (modo ? 'Modo oscuro activado.' : 'Modo claro activado.');
            
        // Actualizar APL con nuevo tema visual
        renderAPL(h, sa, {
            titulo: 'Profesor Universal IA',
            textoSuperior: modo ? 'Modo oscuro activado' : 'Modo claro activado',
            textoInferior: 'Pregúntame lo que quieras.',
            imagenes: [], fuenteWolfram: false, fuenteWikipedia: false
        });
        return h.responseBuilder.speak(msg).reprompt('¿Qué deseas saber?').getResponse();
    }
};

/**
 * Handler para modo susurro (whisper mode).
 * Alterna entre voz normal y efecto SSML de susurro para ambientes silenciosos.
 */
const WhisperModeIntentHandler = {
    canHandle(h) {
        return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(h.requestEnvelope) === 'WhisperModeIntent';
    },
    handle(h) {
        const sa = h.attributesManager.getSessionAttributes();
        const slot = h.requestEnvelope.request.intent.slots;
        const val = slot && slot.whisperMode && slot.whisperMode.value
            ? slot.whisperMode.value.toLowerCase() : '';
        
        // Toggle automático o basado en palabras clave
        sa.whisperMode = val ? !/normal|deja|desactiva|alto|fuerte/.test(val) : !sa.whisperMode;
        h.attributesManager.setSessionAttributes(sa);
        
        const msg = sa.whisperMode
            ? '<amazon:effect name="whispered">Modo susurro activado.</amazon:effect>'
            : 'Modo de voz normal activado.';
        return h.responseBuilder.speak(msg).reprompt('¿Qué deseas saber?').getResponse();
    }
};

/**
 * Handler para control de zoom del contenido APL.
 * Ajusta el nivel de zoom dentro de límites configurados para accesibilidad.
 */
const ZoomIntentHandler = {
    canHandle(h) {
        return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(h.requestEnvelope) === 'ZoomIntent';
    },
    handle(h) {
        const sa = h.attributesManager.getSessionAttributes();
        const slots = h.requestEnvelope.request.intent.slots;
        const val = resolverSlot(slots, 'direction');
        const dir = normalizarDireccionZoom(val);
        if (!dir) {
            return h.responseBuilder
                .speak('No entendí si quieres acercar o alejar. Di acercar o alejar.')
                .reprompt('Di acercar o alejar.').getResponse();
        }
        
        // Aplicar zoom con límites de accesibilidad
        sa.zoomLevel = dir === 'out'
            ? Math.max(UI.MIN_ZOOM, (sa.zoomLevel || 85) - UI.ZOOM_STEP)
            : Math.min(UI.MAX_ZOOM, (sa.zoomLevel || 85) + UI.ZOOM_STEP);
        h.attributesManager.setSessionAttributes(sa);
        
        renderAPL(h, sa, { zoomLevel: sa.zoomLevel });
        return h.responseBuilder.speak(`Zoom al ${sa.zoomLevel} por ciento.`).reprompt('¿Qué deseas saber?').getResponse();
    }
};

/**
 * Handler para "ver más imágenes" por voz — equivalente al botón APL.
 */
const VerMasImagenesIntentHandler = {
    canHandle(h) {
        return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(h.requestEnvelope) === 'VerMasImagenesIntent';
    },
    handle(h) {
        const sa = h.attributesManager.getSessionAttributes();
        const pool   = sa.imagenesExtraPool || [];
        const offset = sa.imagenesExtraOffset || 0;
        if (pool.length === 0 || offset >= pool.length) {
            return h.responseBuilder
                .speak('No hay más imágenes disponibles.')
                .reprompt('¿Qué deseas saber?').getResponse();
        }
        const siguientes = pool.slice(offset, offset + 6);
        sa.imagenesExtraOffset = offset + 6;
        const hayMas = sa.imagenesExtraOffset < pool.length;
        h.attributesManager.setSessionAttributes(sa);
        renderAPL(h, sa, {
            textoSuperior: '', textoInferior: '', imagenes: [],
            imagenesExtra: siguientes, fuenteWolfram: false, fuenteWikipedia: false,
            canStepByStep: false, masPasosDisponibles: false,
            hayMasImagenes: hayMas, soloImagenes: true
        });
        return h.responseBuilder
            .speak(hayMas ? 'Aquí tienes más imágenes.' : 'Estas son las últimas imágenes disponibles.')
            .reprompt('¿Qué deseas saber?').getResponse();
    }
};

/**
 * Handler para eventos de usuario APL (toques, botones).
 * Procesa interacciones táctiles y ejecuta acciones correspondientes.
 */
const APLUserEventHandler = {
    canHandle(h) { return Alexa.getRequestType(h.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent'; },
    handle(h) {
        const args = h.requestEnvelope.request.arguments || [];
        const sa   = h.attributesManager.getSessionAttributes();
        // Controles de zoom táctiles
        if (args[0] === 'zoomIn' || args[0] === 'zoomOut') {
            sa.zoomLevel = args[0] === 'zoomOut'
                ? Math.max(UI.MIN_ZOOM, (sa.zoomLevel || 85) - UI.ZOOM_STEP)
                : Math.min(UI.MAX_ZOOM, (sa.zoomLevel || 85) + UI.ZOOM_STEP);
            h.attributesManager.setSessionAttributes(sa);
            renderAPL(h, sa, { zoomLevel: sa.zoomLevel });
            return h.responseBuilder.speak(`Zoom al ${sa.zoomLevel} por ciento.`).reprompt('Algo mas?').getResponse();
        }

        // Toggle modo susurro táctil
        if (args[0] === 'toggleWhisper') {
            sa.whisperMode = !sa.whisperMode;
            h.attributesManager.setSessionAttributes(sa);
            const msg = sa.whisperMode
                ? '<amazon:effect name="whispered">Modo susurro activado.</amazon:effect>'
                : 'Modo normal activado.';
            return h.responseBuilder.speak(msg).reprompt('¿Qué deseas saber?').getResponse();
        }

        // Toggle modo oscuro táctil
        if (args[0] === 'toggleDarkMode') {
            sa.darkMode = !sa.darkMode;
            h.attributesManager.setSessionAttributes(sa);
            renderAPL(h, sa, {
                titulo: 'Profesor Universal IA',
                textoSuperior: sa.darkMode ? 'Modo oscuro activado' : 'Modo claro activado',
                textoInferior: 'Pregúntame lo que quieras.',
                imagenes: [], fuenteWolfram: false, fuenteWikipedia: false
            });
            return h.responseBuilder
                .speak(sa.darkMode ? 'Modo oscuro activado.' : 'Modo claro activado.')
                .reprompt('¿Qué deseas saber?').getResponse();
        }

        // Activar modo paso a paso de Wolfram
        if (args[0] === 'StepByStep') {
            const imagenesPasos = sa.lastImagenesPasos || [];
            const keyword = sa.lastKeyword || args[1] || '';
            // Inyectar pasos ya capturados en wolframData — sin re-llamar Wolfram
            // currentWolframStep SIEMPRE en 0 para empezar desde el paso 1
            sa.wolframData = {
                keyword,
                keywordMath: keyword,
                imagenes: imagenesPasos,
                imagenesNormales: sa.lastImagenes || [],
                texto: sa.lastDisplayBottom || '',
                canStepByStep: imagenesPasos.length > 0
            };
            sa.currentWolframStep = 0;  // reset explícito siempre
            h.attributesManager.setSessionAttributes(sa);
            return WolframAlphaModeIntentHandler.handle(h, keyword);
        }

        // Saltar al resultado final en modo Wolfram
        if (args[0] === 'SkipToResult') {
            const { SkipToResultIntentHandler } = require('./handlers/SkipToResultIntentHandler');
            return SkipToResultIntentHandler.handle(h);
        }

        // Cargar más imágenes del pool
        if (args[0] === 'verMasImagenes') {
            const pool   = sa.imagenesExtraPool || [];
            const offset = sa.imagenesExtraOffset || 6;
            const siguientes = pool.slice(offset, offset + 6);
            sa.imagenesExtraOffset = offset + 6;
            const hayMas = sa.imagenesExtraOffset < pool.length;
            h.attributesManager.setSessionAttributes(sa);
            
            renderAPL(h, sa, {
                textoSuperior: '', textoInferior: '', imagenes: [],
                imagenesExtra: siguientes, fuenteWolfram: false, fuenteWikipedia: false,
                canStepByStep: false, masPasosDisponibles: false,
                hayMasImagenes: hayMas, soloImagenes: true
            });
            return h.responseBuilder
                .speak(hayMas ? 'Aqui tienes mas imagenes.' : 'Estas son las ultimas imagenes disponibles.')
                .reprompt('Que deseas saber?').getResponse();
        }

        return h.responseBuilder.reprompt('¿Qué deseas saber?').getResponse();
    }
};

/**
 * Handler para intent de ayuda - Explica capacidades de la skill.
 */
const HelpIntentHandler = {
    canHandle(h) {
        return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(h) {
        const msg = 'Puedes preguntarme temas de ciencia, historia o matemáticas. También puedes decir modo oscuro, modo susurro, acercar o alejar.';
        return h.responseBuilder.speak(msg).reprompt('Por ejemplo: dime qué es el sol.').getResponse();
    }
};

/**
 * Handler para navegación al inicio - Resetea contexto de conversación.
 */
const NavigateHomeIntentHandler = {
    canHandle(h) {
        return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.NavigateHomeIntent';
    },
    handle(h) {
        return h.responseBuilder
            .speak('Listo, volvimos al inicio. ¿Qué tema quieres consultar?')
            .reprompt('¿Qué tema quieres consultar?').getResponse();
    }
};

/**
 * Handler para cancelar/detener - Finaliza la sesión educativa.
 */
const CancelAndStopIntentHandler = {
    canHandle(h) {
        return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.StopIntent'
             || Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.CancelIntent');
    },
    handle(h) {
        return h.responseBuilder.speak('¡Clase terminada!').withShouldEndSession(true).getResponse();
    }
};

/**
 * Handler para fin de sesión - Limpieza automática.
 */
const SessionEndedRequestHandler = {
    canHandle(h) { return Alexa.getRequestType(h.requestEnvelope) === 'SessionEndedRequest'; },
    handle(h) { return h.responseBuilder.getResponse(); }
};

/**
 * Handler para AMAZON.YesIntent — confirma repetir la última pregunta.
 * Solo actúa cuando hay un pendingRepeat en sesión (puesto por RepeatLastQuestionIntentHandler).
 */
const YesIntentHandler = {
    canHandle(h) {
        const sa = h.attributesManager.getSessionAttributes();
        return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.YesIntent'
            && !!sa.pendingRepeat;
    },
    handle(h) {
        const sa = h.attributesManager.getSessionAttributes();
        const pregunta = sa.pendingRepeat;
        sa.pendingRepeat = null;
        // Inyectar la pregunta como si el usuario la hubiera dicho ahora
        h.requestEnvelope.request.intent = {
            name: 'AskProfeIntent',
            slots: { question: { name: 'question', value: pregunta } }
        };
        h.attributesManager.setSessionAttributes(sa);
        return AskProfeIntentHandler.handle(h);
    }
};

/**
 * Handler de fallback - Maneja intents no reconocidos.
 */
const FallbackIntentHandler = {
    canHandle(h) {
        return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(h) {
        const msg = 'Lo siento, no estoy seguro de cómo ayudarte con eso. ¿Podrías repetirlo o preguntarme sobre otro tema?';
        return h.responseBuilder.speak(msg).reprompt(msg).getResponse();
    }
};

/**
 * Handler global de errores - Captura excepciones no manejadas.
 * @param {Object} h - Handler input
 * @param {Error} error - Error capturado
 */
const ErrorHandler = {
    canHandle() { return true; },
    handle(h, error) {
        console.error('[ERROR GLOBAL]', error);
        return h.responseBuilder.speak(fallbackSpeech('error')).getResponse();
    }
};

// ── Skill builder ─────────────────────────────────────────────────────────────

/**
 * Configuración y exportación del handler principal de la Lambda.
 * Registra todos los handlers en orden de prioridad y configura cliente API.
 * 
 * NOTA: Usa .create() en lugar de .lambda() para compatibilidad con Node.js 24+
 * El wrapper async/await elimina el warning de callbacks deprecados.
 */
const skillBuilder = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,           // Inicialización
        HelpIntentHandler,              // Ayuda
        NavigateHomeIntentHandler,      // Navegación
        AskProfeIntentHandler,          // Pregunta principal (corazón de la skill)
        WolframAlphaModeIntentHandler,  // Modo matemático paso a paso
        ContinueWolframIntentHandler,   // Continuación de pasos Wolfram
        SkipToResultIntentHandler,      // Saltar al resultado final
        RepeatLastQuestionIntentHandler,// Repetir última respuesta
        YesIntentHandler,               // Confirmar repetir pregunta
        DarkModeIntentHandler,          // Control de tema visual
        WhisperModeIntentHandler,       // Control de volumen
        ZoomIntentHandler,              // Control de accesibilidad
        VerMasImagenesIntentHandler,    // Ver más imágenes por voz
        APLUserEventHandler,            // Eventos táctiles APL
        CancelAndStopIntentHandler,     // Finalización
        SessionEndedRequestHandler,     // Limpieza de sesión
        FallbackIntentHandler           // Fallback (debe ir al final)
    )
    .addErrorHandlers(ErrorHandler)     // Captura global de errores
    .withApiClient(new Alexa.DefaultApiClient()) // Cliente para APIs de Alexa
    .create(); // Usa .create() en lugar de .lambda()

// Wrapper async/await para compatibilidad con Node.js 24+
exports.handler = async (event, context) => {
    return await skillBuilder.invoke(event, context);
};
