/**
 * @module wolfram
 * @description Módulo de consulta a Wolfram Alpha Full Results API v2 para "Profesor Universal IA".
 *   Obtiene imágenes de alta resolución (mag=2, width=800) y texto plano (plaintext)
 *   de hasta 20 pods. Las imágenes se muestran en el APL y el texto se usa para
 *   enriquecer/corregir la respuesta de GPT.
 * 
 * @version 7.4.0
 * @author JpinedaPu
 * @see https://products.wolframalpha.com/api/documentation
 * 
 * Parámetros API optimizados para velocidad:
 *   - scantimeout=2, podtimeout=2: Límites internos de Wolfram por pod.
 *   - formattimeout=1.8, parsetimeout=1.8: Parseo rápido.
 *   - format=image,plaintext: Imágenes para APL + texto para GPT.
 *   - mag=2, width=800: Resolución alta para pantallas Alexa.
 *   - units=metric: Sistema métrico (audiencia hispanohablante).
 * 
 * Mejoras documentadas v7.4:
 *   - [DOC] Añadido JSDoc completo con @module, @param, @returns.
 */
const https = require('https');

// Cargar variables de entorno en desarrollo local
if (process.env.NODE_ENV !== 'production' && !process.env.LAMBDA_TASK_ROOT) {
    try {
        require('dotenv').config();
    } catch (e) {
        console.warn('[ENV] dotenv no disponible, usando variables de entorno del sistema');
    }
}

/** 
 * @const {string} WOLFRAM_APP_ID - ID de aplicación Wolfram desde variables de entorno.
 * IMPORTANTE: DEBE configurarse en AWS Lambda Environment Variables.
 * Sin esta variable, el servicio fallará de forma segura.
 */
const WOLFRAM_APP_ID = process.env.WOLFRAM_APP_ID || '';

if (!WOLFRAM_APP_ID || WOLFRAM_APP_ID === 'YOUR_WOLFRAM_APP_ID') {
    console.error('[WOLFRAM] ❌ CRÍTICO: WOLFRAM_APP_ID no configurada correctamente');
    console.error('[WOLFRAM] Configúrala en AWS Lambda → Configuration → Environment variables');
}

// Pods que no aportan valor visual/textual (basura real)
const podsIgnorados = [
    "Alternate forms",
    "Alternate names",
    "Definitions",
    "Basic information",
    "Current result",
    "Local information",
    "Current weather",
    "Sunset",
    "Sunrise"
];

// Pods que deben ir primero en la visualización
const podsPrioritarios = [
    "Input interpretation",
    "Input",
    "Plot",
    "Graph",
    "Result",
    "Image",
    "Scientific data"
];

/**
 * Consulta Wolfram Alpha Full Results API y extrae imágenes + texto plano.
 * 
 * @param {string} keyword - Término de búsqueda en inglés (ej: "Jupiter", "plot sin(x)").
 * @returns {Promise<{imagenes: Array<{titulo: string, url: string, width: number, height: number}>, texto: string}>}
 *   - imagenes: Array de hasta 20 imágenes con título, URL, ancho y alto.
 *   - texto: Texto plano concatenado de todos los pods (para enriquecimiento GPT).
 */
async function consultarWolfram(keyword, userLocation = null, options = {}) {
    if (!keyword) return { imagenes: [], texto: "", canStepByStep: false };

    const startTime = Date.now();
    
    // FLUJO STEP-BY-STEP: 2 llamadas con presupuesto de tiempo estricto
    if (options.isStepByStep) {
        // Presupuesto total: 4500ms para dejar ~3s a Claude
        const BUDGET_TOTAL = options.timeoutMs || 4500;
        const TIMEOUT_CALL1 = Math.min(3000, BUDGET_TOTAL - 1000);

        console.log(`[WOLFRAM] Modo step-by-step | budget: ${BUDGET_TOTAL}ms`);

        // LLAMADA 1 con timeout ajustado
        const firstResult = await Promise.race([
            consultarWolframInternal(keyword, userLocation, null, startTime, null, TIMEOUT_CALL1),
            new Promise(r => setTimeout(() => r({ imagenes: [], texto: '', canStepByStep: false, stepByStepData: [] }), TIMEOUT_CALL1))
        ]);

        const elapsed1 = Date.now() - startTime;

        if (!firstResult.stepByStepData || firstResult.stepByStepData.length === 0) {
            console.log(`[WOLFRAM] Sin podstate | T+${elapsed1}ms | devolviendo resultado normal`);
            return firstResult;
        }

        // Elegir el mejor podstate para la llamada 2:
        // Preferir el pod cuyo id sea 'Input' — ese es siempre el resultado principal (Derivative, Result, etc.)
        // Si no existe 'Input', tomar el primero con isPrimary:true
        // NUNCA filtrar por podId !== 'Input' — 'Input' ES el id del pod Derivative en Wolfram
        const candidatos = firstResult.stepByStepData;
        const mejorPod = candidatos.find(d => d.podId === 'Input')
            || candidatos.find(d => d.isPrimary)
            || candidatos[0];

        // Tiempo restante para llamada 2
        const remainingMs = BUDGET_TOTAL - elapsed1;
        if (remainingMs < 800) {
            console.log(`[WOLFRAM] Sin tiempo para llamada 2 (${remainingMs}ms) | usando imgs normales`);
            return { ...firstResult, imagenesNormales: firstResult.imagenes, canStepByStep: true };
        }

        const TIMEOUT_CALL2 = Math.min(remainingMs - 200, 2800);
        const sbsInput = mejorPod.input;
        const podId = mejorPod.podId;
        const showAllInput = `${sbsInput.split('__')[0]}__Show all steps`;
        console.log(`[WOLFRAM] Llamada 2 podstates: [${sbsInput}] + [${showAllInput}] | timeout: ${TIMEOUT_CALL2}ms`);

        // LLAMADA 2: pasar podId para que extraerPasosSBS sepa qué pod buscar
        const stepResult = await Promise.race([
            consultarWolframInternal(keyword, userLocation, [sbsInput, showAllInput], startTime, podId, TIMEOUT_CALL2),
            new Promise(r => setTimeout(() => r({ imagenes: [], texto: '' }), TIMEOUT_CALL2))
        ]);

        console.log(`[WOLFRAM] SBS total T+${Date.now() - startTime}ms | steps: ${stepResult.imagenes?.length ?? 0}`);

        const sbsOk = (stepResult.imagenes?.length ?? 0) > 0;
        return {
            imagenes: sbsOk ? stepResult.imagenes : [],
            imagenesNormales: firstResult.imagenes,
            texto: firstResult.texto,
            textoResult: firstResult.textoResult,
            canStepByStep: sbsOk,
            stepByStepInputs: firstResult.stepByStepData.map(d => d.input)
        };
    }
    
    // Llamada normal (sin step-by-step)
    return consultarWolframInternal(keyword, userLocation, null, startTime);
}

/**
 * Función interna que hace la llamada real a Wolfram Alpha
 * @param {string} keyword - Término de búsqueda
 * @param {string} userLocation - Ubicación del usuario (opcional)
 * @param {string} podstate - Podstate para step-by-step (opcional)
 * @param {number} startTime - Timestamp de inicio
 * @param {string} targetPodId - ID del pod que queremos extraer (opcional, solo para step-by-step)
 * @returns {Promise<Object>}
 */
function consultarWolframInternal(keyword, userLocation, podstate, startTime, targetPodId = null, timeoutMs = 2000) {
    return new Promise((resolve) => {
        const q = encodeURIComponent(keyword);
        const locationParam = userLocation ? `&location=${encodeURIComponent(userLocation)}` : '';
        // podstate puede ser string (llamada normal) o array (llamada step-by-step con múltiples podstates)
        const podstateParam = Array.isArray(podstate)
            ? podstate.map(ps => `&podstate=${encodeURIComponent(ps)}`).join('')
            : (podstate ? `&podstate=${encodeURIComponent(podstate)}` : '');
        // scantimeout/podtimeout ajustados al presupuesto disponible
        // Para SBS (podstate presente) necesitamos al menos 3s internos
        // Para consultas normales: 0.8s es suficiente para cálculos simples (verificado con tests)
        const wScan = podstate ? Math.min(4, Math.max(2, Math.floor(timeoutMs / 1000) - 1)) : 0.8;
        const url = `https://api.wolframalpha.com/v2/query?appid=${WOLFRAM_APP_ID}&input=${q}&output=json&format=image,plaintext&mag=2&width=800&units=metric${locationParam}${podstateParam}&scantimeout=${wScan}&podtimeout=${wScan}&formattimeout=1.5&parsetimeout=1.5`;

        const httpsOptions = {
            headers: { 'User-Agent': 'AlexaSkill/1.0' },
            timeout: timeoutMs
        };

        const logPrefix = podstate ? '[WOLFRAM-STEP]' : '[WOLFRAM]';
        const podstateLog = Array.isArray(podstate) ? podstate.join(' + ') : (podstate || '');
        console.log(`${logPrefix} ⏱️ T+0ms | Query: "${keyword}"${podstateLog ? ' | podstate: ' + podstateLog : ''}`);

        const req = https.get(url, httpsOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const elapsed = Date.now() - startTime;
                if (res.statusCode !== 200) {
                    console.log(`[WOLFRAM] ❌ ERR_API_${res.statusCode} | T+${elapsed}ms`);
                    return resolve({ imagenes: [], texto: "" });
                }
                try {
                    const json = JSON.parse(data);
                    let imagenesPrioritarias = [];
                    let imagenesNormales = [];
                    let textoExtraido = "";
                    let textoResult = "";
                    let canStepByStep = false;
                    let stepByStepData = []; // Array de {input, podId}

                    // --- VALIDACIÓN CRÍTICA: success === true y pods ---
                    if (json.queryresult && json.queryresult.success && json.queryresult.pods) {
                        if (!Array.isArray(json.queryresult.pods)) {
                            console.log(`${logPrefix} ⚠️ Pods no es array`);
                            return resolve({ imagenes: [], texto: "", canStepByStep: false, stepByStepInputs: [] });
                        }
                        const pods = json.queryresult.pods.slice(0, 20);

                        // LLAMADA 2 (SBS): extraer subpods del pod expandido con los pasos
                        // Wolfram repite todos los pods normales + el pod expandido con pasos.
                        // Puede haber múltiples pods con primary:true — el expandido es el que tiene MÁS subpods.
                        // Fallback: buscar por targetPodId, luego cualquier primary.
                        if (podstate) {
                            const primaries = pods.filter(p => p.primary === true);
                            const podPrimary = primaries.length > 1
                                ? primaries.reduce((a, b) => (b.subpods?.length ?? 0) > (a.subpods?.length ?? 0) ? b : a)
                                : (primaries[0] ?? pods.find(p => p.id === targetPodId) ?? pods[0]);
                            if (podPrimary?.subpods) {
                                podPrimary.subpods.forEach(subpod => {
                                    if (!subpod.img?.src) return;
                                    const sbsType = subpod.stepbystepcontenttype;
                                    // Incluir si: tiene tipo SBS explícito, O si no tiene tipo pero tiene tamaño razonable
                                    const incluir = sbsType === 'SBSStep' || sbsType === 'SBSHintStep';
                                    if (incluir) {
                                        imagenesPrioritarias.push({
                                            titulo: podPrimary.title || 'Solución',
                                            url: subpod.img.src,
                                            width: parseInt(subpod.img.width) || 800,
                                            height: parseInt(subpod.img.height) || 400,
                                            alt: subpod.img.alt || ''
                                        });
                                    }
                                });
                            }
                            console.log(`${logPrefix} ✅ OK | T+${elapsed}ms | ${imagenesPrioritarias.length} imgs SBS del pod primary`);
                            return resolve({ imagenes: imagenesPrioritarias, texto: '', textoResult: '', canStepByStep: false, stepByStepData: [] });
                        }

                        // LLAMADA 1 (normal): procesar todos los pods
                        pods.forEach(pod => {
                            // Detectar podstate SBS — buscar en pod primary primero (orden garantizado)
                            if (pod.states && Array.isArray(pod.states)) {
                                pod.states.forEach(state => {
                                    if (state.name && state.name.toLowerCase().includes('step-by-step') && state.input) {
                                        canStepByStep = true;
                                        stepByStepData.push({ input: state.input, podId: pod.id, isPrimary: !!pod.primary });
                                        console.log(`${logPrefix} ✅ Podstate: ${state.input} | primary: ${!!pod.primary}`);
                                    }
                                });
                            }

                            if (podsIgnorados.includes(pod.title)) return;

                            if (pod.subpods) {
                                pod.subpods.forEach(subpod => {
                                    if (subpod.plaintext?.trim().length > 0 && textoExtraido.length < 1200 && subpod.plaintext.length < 300) {
                                        textoExtraido += `${pod.title}: ${subpod.plaintext}. `;
                                    }
                                    if (pod.title === 'Result' && !subpod.plaintext?.trim() && subpod.img?.alt) {
                                        textoResult = subpod.img.alt;
                                    }
                                    if (subpod.img?.src && parseInt(subpod.img.width || 0) > 50) {
                                        const imgData = {
                                            titulo: pod.title || 'Datos Técnicos',
                                            url: subpod.img.src,
                                            width: parseInt(subpod.img.width) || 800,
                                            height: parseInt(subpod.img.height) || 400,
                                            alt: subpod.img.alt || ''
                                        };
                                        if (podsPrioritarios.includes(pod.title)) imagenesPrioritarias.push(imgData);
                                        else imagenesNormales.push(imgData);
                                    }
                                });
                            }
                        });
                        let todosLosPods = [...imagenesPrioritarias, ...imagenesNormales];
                        if (todosLosPods.length > 20) todosLosPods = todosLosPods.slice(0, 20);
                        textoExtraido = textoExtraido.slice(0, 1200);
                        console.log(`${logPrefix} ✅ OK | T+${elapsed}ms | ${todosLosPods.length} imgs (de ${json.queryresult.pods.length} pods) | ${textoExtraido.length} chars | canStepByStep: ${canStepByStep} | podstates: ${stepByStepData.length}`);
                        resolve({ imagenes: todosLosPods, texto: textoExtraido, textoResult, canStepByStep, stepByStepData });
                    } else {
                        console.log(`${logPrefix} ⚠️ NO_PODS | T+${elapsed}ms`);
                        resolve({ imagenes: [], texto: "", canStepByStep: false, stepByStepInputs: [] });
                    }
                } catch (e) {
                    console.log(`${logPrefix} ❌ ERR_PARSE | T+${elapsed}ms | ${e.message}`);
                    resolve({ imagenes: [], texto: "", canStepByStep: false, stepByStepInputs: [] });
                }
            });
        });
        req.on('timeout', () => {
            console.log(`${logPrefix} ❌ ERR_TIMEOUT | T+${Date.now() - startTime}ms | Límite: 5500ms`);
            req.destroy();
            resolve({ imagenes: [], texto: "", canStepByStep: false, stepByStepInputs: [] });
        });
        req.on('error', (e) => {
            console.log(`${logPrefix} ❌ ERR_NET | T+${Date.now() - startTime}ms | ${e.message}`);
            resolve({ imagenes: [], texto: "", canStepByStep: false, stepByStepInputs: [] });
        });
    });
}

module.exports = { consultarWolfram };