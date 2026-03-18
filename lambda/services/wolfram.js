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
    return new Promise((resolve) => {
        const q = encodeURIComponent(keyword);
        const locationParam = userLocation ? `&location=${encodeURIComponent(userLocation)}` : '';
        // Según documentación oficial: podstate para step-by-step debe incluir el ID del pod
        // Formato: podstate=PodID__StateName (ej: Result__Step-by-step+solution)
        // Per WA docs: podstate format is PodID__StateName. Use multiple podstate params
        // to cover all possible pod IDs that may contain step-by-step (Result, Solve, etc.)
        const stepByStepParam = options.isStepByStep
            ? '&podstate=Result__Step-by-step+solution&podstate=Solve__Step-by-step+solution&reinterpret=true'
            : '';
        const url = `https://api.wolframalpha.com/v2/query?appid=${WOLFRAM_APP_ID}&input=${q}&output=json&format=image,plaintext&mag=2&width=800&units=metric${locationParam}${stepByStepParam}&scantimeout=3&podtimeout=3&formattimeout=2&parsetimeout=2`;

        const httpsOptions = {
            headers: { 'User-Agent': 'AlexaSkill/1.0' },
            timeout: 5500
        };

        console.log(`[WOLFRAM] ⏱️ T+0ms | Full API optimizada: "${keyword}"`);

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

                    // --- VALIDACIÓN CRÍTICA: success === true y pods ---
                    if (json.queryresult && json.queryresult.success && json.queryresult.pods) {
                        if (!Array.isArray(json.queryresult.pods)) {
                            console.log(`[WOLFRAM] ⚠️ Pods no es array`);
                            return resolve({ imagenes: [], texto: "" });
                        }
                        const pods = json.queryresult.pods.slice(0, 20);
                        pods.forEach(pod => {
                            // Detectar si hay solución paso a paso disponible en cualquier pod
                            if (pod.states && Array.isArray(pod.states)) {
                                const hasStepByStep = pod.states.some(state => 
                                    state.name && state.name.toLowerCase().includes('step-by-step')
                                );
                                if (hasStepByStep) canStepByStep = true;
                            }
                            // Ignorar solo pods basura real
                            if (podsIgnorados.includes(pod.title)) return;
                            if (pod.subpods) {
                                pod.subpods.forEach(subpod => {
                                    // Limitar texto a 1200 caracteres y subpod.plaintext a 300
                                    if (subpod.plaintext && subpod.plaintext.trim().length > 0) {
                                        if (textoExtraido.length < 1200 && subpod.plaintext.length < 300) {
                                            textoExtraido += `${pod.title}: ${subpod.plaintext}. `;
                                        }
                                    }
                                    // Si es el pod Result y no hay texto, intenta extraer alt de la imagen
                                    if (pod.title === "Result" && (!subpod.plaintext || subpod.plaintext.trim().length === 0) && subpod.img && subpod.img.alt) {
                                        textoResult = subpod.img.alt;
                                    }
                                    // Filtrar imágenes pequeñas y priorizar visualmente
                                    if (
                                        subpod.img &&
                                        subpod.img.src &&
                                        parseInt(subpod.img.width || 0) > 50
                                    ) {
                                        const imgData = {
                                            titulo: pod.title || "Datos Técnicos",
                                            url: subpod.img.src,
                                            width: parseInt(subpod.img.width) || 800,
                                            height: parseInt(subpod.img.height) || 400
                                        };
                                        if (podsPrioritarios.includes(pod.title)) {
                                            imagenesPrioritarias.push(imgData);
                                        } else {
                                            imagenesNormales.push(imgData);
                                        }
                                    }
                                });
                            }
                        });
                        let todosLosPods = [...imagenesPrioritarias, ...imagenesNormales];
                        // Subpods pueden multiplicar imágenes — limitar a 20
                        if (todosLosPods.length > 20) todosLosPods = todosLosPods.slice(0, 20);
                        // Corte global de texto para máxima seguridad
                        textoExtraido = textoExtraido.slice(0, 1200);
                        console.log(`[WOLFRAM] ✅ OK | T+${elapsed}ms | ${todosLosPods.length} imgs (de ${json.queryresult.pods.length} pods) | ${textoExtraido.length} chars | textoResult: ${textoResult} | canStepByStep: ${canStepByStep}`);
                        resolve({ imagenes: todosLosPods, texto: textoExtraido, textoResult, canStepByStep });
                    } else {
                        console.log(`[WOLFRAM] ⚠️ NO_PODS | T+${elapsed}ms`);
                        resolve({ imagenes: [], texto: "", canStepByStep: false });
                    }
                } catch (e) {
                    console.log(`[WOLFRAM] ❌ ERR_PARSE | T+${elapsed}ms | ${e.message}`);
                    resolve({ imagenes: [], texto: "", canStepByStep: false });
                }
            });
        });
        req.on('timeout', () => {
            console.log(`[WOLFRAM] ❌ ERR_TIMEOUT | T+${Date.now() - startTime}ms | Límite: 5500ms`);
            req.destroy();
            resolve({ imagenes: [], texto: "", canStepByStep: false });
        });
        req.on('error', (e) => {
            console.log(`[WOLFRAM] ❌ ERR_NET | T+${Date.now() - startTime}ms | ${e.message}`);
            resolve({ imagenes: [], texto: "", canStepByStep: false });
        });
    });
}

module.exports = { consultarWolfram };