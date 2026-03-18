const https = require('https');

// Cargar variables de entorno en desarrollo local
if (process.env.NODE_ENV !== 'production' && !process.env.LAMBDA_TASK_ROOT) {
    try {
        require('dotenv').config();
    } catch (e) {
        console.warn('[ENV] dotenv no disponible, usando variables de entorno del sistema');
    }
}

/** @const {https.Agent} keepAliveAgent - Agente HTTPS HTTP Keep-Alive para persistencia de conexión */
const keepAliveAgent = new https.Agent({ 
    keepAlive: true, 
    maxSockets: 50,
    keepAliveMsecs: 60000,
    timeout: 10000
});

/**
 * Fecha actual ISO reutilizable para prompts y contexto.
 * @const {string}
 */
const HOY = new Date().toISOString().split('T')[0];

/** 
 * @const {string} OPENAI_API_KEY - Clave de API de OpenAI desde variables de entorno.
 * IMPORTANTE: Configurar en AWS Lambda Environment Variables o en archivo .env local.
 */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

if (!OPENAI_API_KEY) {
    console.warn('[GPT] ⚠️ ADVERTENCIA: OPENAI_API_KEY no configurada. Las funciones de IA fallarán.');
} 

/**
 * Traduce texto entre idiomas usando GPT-4o.
 * @param {string} texto - Texto a traducir.
 * @param {string} idiomaOrigen - Código ISO del idioma origen ("es", "en").
 * @param {string} idiomaDestino - Código ISO del idioma destino ("es", "en").
 * @returns {Promise<string>} Texto traducido.
 */

/**
 * Traduce texto usando GPT-4o. Si opciones.modo === 'voz', prepara respuesta para voz Alexa.
 * @param {string} texto
 * @param {string} idiomaOrigen
 * @param {string} idiomaDestino
 * @param {object} [opciones]
 * @returns {Promise<string>}
 */
async function traducirGPT(texto, idiomaOrigen, idiomaDestino, opciones = {}) {
    if (!texto || idiomaOrigen === idiomaDestino) return texto;
    let prompt;
    if (opciones.promptSimple) {
        prompt = `Traduce para voz Alexa, solo texto, sin formato extra: """${texto}"""`;
    } else if (opciones.modo === 'voz') {
        prompt = `Traduce el siguiente texto del ${idiomaOrigen === 'es' ? 'español' : 'inglés'} al ${idiomaDestino === 'es' ? 'español' : 'inglés'} y prepáralo para ser leído en voz alta por Alexa, usando un tono pedagógico, claro y natural. Usa SSML si es útil. Solo responde con el texto listo para voz, sin explicaciones ni formato extra.\n"""${texto}"""`;
    } else {
        prompt = `Traduce el siguiente texto del ${idiomaOrigen === 'es' ? 'español' : 'inglés'} al ${idiomaDestino === 'es' ? 'español' : 'inglés'} de forma natural y sin explicaciones, solo el texto traducido:\n"""${texto}"""`;
    }
    const tInicio = Date.now();
    return new Promise((resolve) => {
        const payload = JSON.stringify({
            model: "gpt-4.1-mini", // GPT-4.1 Mini para traducciones rápidas
            messages: [
                { role: "system", content: "Eres un traductor profesional. Solo responde con el texto traducido, sin explicaciones ni formato extra." },
                { role: "user", content: prompt }
            ],
            temperature: 0.1,
            max_tokens: Math.max(60, Math.round(texto.length * 1.2))
        });
        const gptTimeout = opciones.timeout || 2000;
        const options = {
            hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            timeout: 4000, // Aumentado para permitir síntesis compleja de 3 fuentes
            agent: keepAliveAgent
        };
        let errorTrad = null;
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const tFin = Date.now();
                try {
                    const response = JSON.parse(data);
                    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
                        console.log(`[TRADUCTOR] ❌ Respuesta vacía de GPT. Tiempo: ${tFin-tInicio}ms`);
                        resolve(texto);
                        return;
                    }
                    const traducido = response.choices[0].message.content.trim().replace(/^"|"$/g, '');
                    if (!traducido || traducido.length < 2) {
                        console.log(`[TRADUCTOR] ❌ Traducción vacía. Tiempo: ${tFin-tInicio}ms`);
                        resolve(texto);
                        return;
                    }
                    if (traducido === texto) {
                        console.log(`[TRADUCTOR] ⚠️ Traducción igual al original. Tiempo: ${tFin-tInicio}ms`);
                    } else {
                        console.log(`[TRADUCTOR] ✅ Traducción exitosa (${idiomaOrigen}->${idiomaDestino}) en ${tFin-tInicio}ms`);
                    }
                    resolve(traducido);
                } catch (e) {
                    errorTrad = e;
                    console.log(`[TRADUCTOR] ❌ Error parseando respuesta GPT: ${e.message}. Tiempo: ${tFin-tInicio}ms`);
                    resolve(texto);
                }
            });
        });
        req.on('timeout', () => {
            const tFin = Date.now();
            console.log(`[TRADUCTOR] ❌ Timeout de traducción (${idiomaOrigen}->${idiomaDestino}) tras ${tFin-tInicio}ms`);
            req.destroy();
            resolve(texto);
        });
        req.on('error', (e) => {
            const tFin = Date.now();
            console.log(`[TRADUCTOR] ❌ Error de red en traducción (${idiomaOrigen}->${idiomaDestino}): ${e && e.message}. Tiempo: ${tFin-tInicio}ms`);
            resolve(texto);
        });
        req.write(payload);
        req.end();
    });
}

/**
 * @module gpt
 * @description Módulo de inteligencia artificial para "Profesor Universal IA".
 *   Contiene 3 funciones que interactúan con OpenAI GPT-4o:
 *   
 *   1. obtenerKeyword()   — Extrae keyword en inglés para Wolfram/Wikipedia (2s, 15 tokens).
 *   2. consultarGPT()      — Genera respuesta completa en JSON con voz SSML (4s, 250 tokens).
 *   3. enriquecerConWolfram() — Corrige/enriquece respuesta base con datos reales (2s, 300 tokens).
 * 
 * @version 7.4.0
 * @author JpinedaPu
 * 
 * Arquitectura de confianza:
 *   - Wolfram Alpha / Wikipedia = DATOS EN TIEMPO REAL (prioridad máxima).
 *   - GPT-4o = Generación de lenguaje + estructura (entrenamiento puede estar desactualizado).
 *   - Si hay discrepancia entre GPT y fuentes externas, las fuentes externas SIEMPRE ganan.
 * 
 * Seguridad:
 *   - [MEJORA PENDIENTE] La API key debería estar en variable de entorno (process.env.OPENAI_API_KEY).
 *     Actualmente hardcoded para simplificar despliegue en Alexa Hosted Skills.
 * 
 * Mejoras documentadas v7.4:
 *   - [FIX] enriquecerConWolfram: Prompt reescrito con PROTOCOLO DE CORRECCIÓN para forzar
 *     corrección activa de fechas/números/datos erróneos (antes solo "enriquecía" sin corregir).
 *   - [FIX] enriquecerConWolfram: Eliminado truncado a 200 chars del texto Wolfram (ahora usa 500ch completos).
 *   - [FIX] enriquecerConWolfram: max_tokens 250→300 para permitir reescrituras completas.
 *   - [DOC] JSDoc completo en las 3 funciones.
 */



/**
 * Extrae un keyword en inglés optimizado para Wolfram Alpha / Wikipedia.
 * Detecta pronombres y verbos implícitos para resolver contexto conversacional.
 * Soporta reintentos con parámetro intentoFallido (FASE 1.5 del budget).
 * 
 * @param {string} pregunta - Pregunta del usuario en español.
 * @param {Array<{role: string, content: string}>} historial - Historial de conversación.
 * @param {string|null} contextoFactual - ÚLTIMA ENTIDAD FACTUAL CONFIRMADA (ej: "Donald Trump").
 * @returns {Promise<string>} Keyword en inglés (ej: "Jupiter", "plot sin(x)", "Mars vs Venus").
 */
async function obtenerKeyword(pregunta, historial = [], contextoFactual = null, rolPrevio = null) {

    const startTime = Date.now();
    return new Promise((resolve) => {
        // Normalización avanzada antes de keywordLocal
        const preguntaNorm = (pregunta || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        // --- SENIOR FAST PATH: Ahorrar 1.2s en consultas obvias ---
        const fastPath = {
            "el sol": "Sun",
            "sol": "Sun",
            "la tierra": "Earth",
            "tierra": "Earth",
            "la luna": "Moon",
            "luna": "Moon",
            "marte": "Mars",
            "jupiter": "Jupiter",
            "saturno": "Saturn",
            "el presidente de estados unidos": "President of United States",
            "presidente de estados unidos": "President of United States",
            "quien es el presidente de estados unidos": "President of United States",
            "el de japon": "Prime Minister of Japan",
            "el de francia": "President of France",
            "edad": "Age",
            "cuantos años tiene": "Age"
        };
        
        // FAST PATH ESPECIAL: Detectar "cuanto dura el sol en [ciudad]"
        const duracionSolMatch = preguntaNorm.match(/(?:cuanto|cuantas horas|duracion|dura).*sol.*(?:en|de)\s+([a-z]+)/i);
        if (duracionSolMatch && duracionSolMatch[1]) {
            const ciudad = duracionSolMatch[1].charAt(0).toUpperCase() + duracionSolMatch[1].slice(1);
            console.log(`[GPT-KW] 🌞 FAST PATH DURACION SOL | T+${Date.now() - startTime}ms | Keyword: "Sun in ${ciudad}"`);
            resolve(`Sun in ${ciudad}`);
            return;
        }
        
        // FAST PATH MATEMÁTICO: Detectar derivadas/integrales/límites
        const mathMatch = preguntaNorm.match(/\b(derivada|integral|limite)\s+de\s+(.+?)(?:\s+paso|$)/i);
        if (mathMatch) {
            const operacion = mathMatch[1];
            const expresion = mathMatch[2].trim()
                .replace(/\bx\s+al\s+cubo\b/g, 'x^3')
                .replace(/\bx\s+al\s+cuadrado\b/g, 'x^2')
                .replace(/\b(\w+)\s+al\s+cubo\b/g, '$1^3')
                .replace(/\b(\w+)\s+al\s+cuadrado\b/g, '$1^2')
                .replace(/\b(\w+)\s+a\s+la\s+(\d+)\b/g, '$1^$2')
                .replace(/\bmas\b/g, '+')
                .replace(/\bmenos\b/g, '-')
                .replace(/\bpor\b/g, '*')
                .replace(/\bentre\b/g, '/')
                .replace(/\braiz\s+de\b/g, 'sqrt')
                .replace(/\bseno\b/g, 'sin')
                .replace(/\bcoseno\b/g, 'cos')
                .replace(/\btangente\b/g, 'tan')
                .replace(/\blogaritmo\b/g, 'log')
                .replace(/\bcuando\s+x\s+tiende\s+a\s+infinito\b/g, 'as x approaches infinity')
                .replace(/\bcuando\s+x\s+tiende\s+a\s+(\w+)\b/g, 'as x approaches $1')
                .replace(/\btiende\s+a\s+infinito\b/g, 'approaches infinity')
                .replace(/\btiende\s+a\s+(\w+)\b/g, 'approaches $1')
                .replace(/\s+/g, ' ').trim();
            let keyword = '';
            if (operacion === 'derivada') keyword = `derivative of ${expresion}`;
            else if (operacion === 'integral') keyword = `integral of ${expresion}`;
            else if (operacion === 'limite') keyword = `limit of ${expresion}`;
            console.log(`[GPT-KW] FAST PATH MATH | T+${Date.now() - startTime}ms | Keyword: "${keyword}"`);
            resolve(keyword);
            return;
        }
        
        if (fastPath[preguntaNorm]) {
            console.log(`[GPT-KW] 🚀 FAST PATH OK | T+${Date.now() - startTime}ms | Keyword: "${fastPath[preguntaNorm]}"`);
            resolve(fastPath[preguntaNorm]);
            return;
        }

        // Detectar pronombres Y verbos 3ra persona sin sujeto (tiene, puede, mide, etc.)
        const pronombres = /\b(su|sus|él|ella|eso|esa|este|esta|le|it|its|this|that|the same|el de|la de|y el|y la|en|con|tiene|tienen|puede|pueden|mide|fue|era|son|está|están|pesa|dura|cuesta|necesita|hace|hizo|sirve|funciona|contiene|produce|compáralo|compáralos|compárala|compáralas|compararlo|compararla|comparar)\b/i;
        const tienePronombre = pronombres.test(preguntaNorm);

        let contextoStr = "";
        if (tienePronombre) {
            if (contextoFactual) {
                contextoStr = `The CURRENT FACTUAL SUBJECT is: "${contextoFactual}". This entity was verified by live sources.`;
            } else if (historial && historial.length > 0) {
                contextoStr = historial.slice(-2).map(h => h.content).join(' | ');
            }
        }

        let systemPrompt;
        if (tienePronombre && (contextoFactual || (historial && historial.length > 0))) {
            const rolContext = rolPrevio ? ` The previous question was about "${rolPrevio}" (e.g., President, Capital). PRESERVE this role for the new entity.` : '';
            systemPrompt = `Extract the BEST search keyword for Wolfram Alpha or Wikipedia. Max 6 words, in English.
RULES:
- A PRONOUN or SUBJECT change occurred. RESOLVE it using the CONTEXT: ${contextoStr}.${rolContext}
- MANDATORY: Extract the result in ENGLISH ONLY. (e.g., "President of Mexico" instead of "Presidente de México").
- COMPARISON: If the question implies a COMPARISON (e.g. 'compáralo con', 'vs', 'diferencia'), return BOTH entities separated by 'vs' (e.g. 'Sun vs Earth').
- DURATION/SUN: If asking about sun duration/hours in a location (e.g. 'cuánto dura el sol en bogotá'), return 'Sun in [City]' (e.g. 'Sun in Bogota').
- MATH OPERATIONS: For mathematical expressions (derivatives, integrals, equations), translate the COMPLETE expression including ALL terms and operators. Examples: "derivada de x al cubo más 2" -> "derivative of x^3 + 2", "integral de 2x menos 5" -> "integral of 2x - 5", "límite de x al cuadrado cuando x tiende a infinito" -> "limit of x^2 as x approaches infinity".
- NO FILLER WORDS: Never add 'facts', 'information', 'details', 'about', 'the'.
- Examples: "y el de mexico" -> "President of Mexico", "en méxico" with role President -> "President of Mexico", "compáralo con la tierra" -> "Sun vs Earth", "cuánto dura en bogotá" with context Sun -> "Sun in Bogota".
- Only return the entity name in English, no explanation.`;
        } else {
            systemPrompt = `Extract the BEST search keyword for Wolfram Alpha or Wikipedia. Max 6 words, in English.
RULES:
- ONLY return the entity in ENGLISH. If asked about "España", return "Spain". If asked about "Presidente", return "President".
- DURATION/SUN: If asking about sun duration/hours in a location (e.g. 'cuánto dura el sol en bogotá'), return 'Sun in [City]' (e.g. 'Sun in Bogota').
- MATH OPERATIONS: For mathematical expressions (derivatives, integrals, equations), translate the COMPLETE expression including ALL terms and operators. Examples: "derivada de x al cubo más 2" -> "derivative of x^3 + 2", "integral de 2x menos 5" -> "integral of 2x - 5", "límite de x al cuadrado cuando x tiende a infinito" -> "limit of x^2 as x approaches infinity".
- NO FILLER WORDS: Do NOT add 'facts', 'info', 'the'. Just the entity.
- Examples: "el sol" -> "Sun", "quien es el presidente" -> "President", "el de mexico" -> "President of Mexico", "cuánto dura el sol en bogotá" -> "Sun in Bogota".
- MANDATORY: RESPONSE MUST BE IN ENGLISH ONLY. NO SPANISH.
- Only return the keyword, no explanation.`;
        }

        // Ya no se prioriza la heurística local antes de OpenAI

        const payload = JSON.stringify({
            model: "gpt-4.1-mini", // GPT-4.1 Mini (Enero 2025) - Más rápido y actualizado
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `NUEVA PREGUNTA: ${pregunta}` }
            ],
            temperature: 0.1, // Más determinista
            max_tokens: 25
        });

        const options = {
            hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            timeout: 1500, // Reducido a 1.5s para optimización global
            agent: keepAliveAgent
        };

        console.log(`[GPT-KW] ⏱️ T+${Date.now() - startTime}ms | Extrayendo keyword | Pronombre: ${tienePronombre} | Contexto: "${contextoStr.substring(0, 50)}..."`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const elapsed = Date.now() - startTime;
                if (res.statusCode === 429) {
                    console.log("[GPT-KW] ❌ RATE LIMIT OpenAI");
                    resolve("");
                    return;
                }
                if (res.statusCode !== 200) {
                    console.error(`[GPT-KW] ❌ ERR_API_${res.statusCode} | T+${elapsed}ms | Response: ${data.substring(0, 100)}`);
                    resolve("");
                    return;
                }
                try {
                    const response = JSON.parse(data);
                    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
                        console.log("[GPT] ⚠️ respuesta vacía de OpenAI");
                        resolve("");
                        return;
                    }
                    const keywordGenerado = response.choices[0].message.content.trim().replace(/['"]/g, '');
                    console.log(`[GPT-KW] ✅ OK | T+${elapsed}ms | Keyword: "${keywordGenerado}"`);
                    resolve(keywordGenerado);
                } catch (e) {
                    console.log(`[GPT-KW] ❌ ERR_PARSE | T+${elapsed}ms | ${e.message}`);
                    resolve("");
                }
            });
        });
        req.on('timeout', () => {
            console.log(`[GPT-KW] ❌ ERR_TIMEOUT | T+${Date.now() - startTime}ms | Límite: 1500ms`);
            req.destroy();
            // Fallback mejorado: traducción rápida de frases comunes
            const traducciones = {
                "presidente de estados unidos": "president of the United States",
                "presidente estados unidos": "president of the United States",
                "estados unidos": "United States",
                "presidente de mexico": "president of Mexico",
                "presidente de españa": "president of Spain",
                "quien es el presidente": "president",
                "capital de francia": "capital of France",
                "capital de mexico": "capital of Mexico",
                "capital de españa": "capital of Spain"
                // Agrega más frases clave según necesidad
            };
            let fallback = "";
            for (const frase in traducciones) {
                if (preguntaNorm.includes(frase)) {
                    fallback = traducciones[frase];
                    break;
                }
            }
            if (!fallback) {
                // Si no hay coincidencia, usa el fallback local
                fallback = (preguntaNorm.replace(/[¿?]/g, "")
                    .split(" ")
                    .filter(w => w.length > 3)
                    .slice(-1)[0]) || "";
            }
            resolve(fallback);
        });
        req.on('error', (e) => {
            console.log(`[GPT-KW] ❌ ERR_NET | T+${Date.now() - startTime}ms | ${e.message}`);
            resolve(pregunta.split(" ").slice(-2).join(" "));
        });
        req.write(payload);
        req.end();
    });
}

    // Heurística local rápida para keyword (requiere pregunta ya normalizada)
    function keywordLocal(preguntaNorm) {
        return (
            (preguntaNorm || "")
                .replace(/[¿?]/g, "")
                .split(" ")
                .filter(w => w.length > 3 && !/^(porque|donde|como|cuando|para)$/.test(w))
                .slice(-1)[0] || ""
        );
    }

/**
 * System prompt constante para consultarGPT().
 * Inyecta fecha actual para que GPT sea consciente de su potencial desactualización.
 * Define las 4 claves JSON de salida: speech, displayTop, displayBottom, keyword.
 * @const {string}
 */

const systemContent = `Eres el "Profesor Universal IA". Tu objetivo es educar con precisión técnica pero con MUCHO CARISMA.
FECHA ACTUAL: ${HOY}. Tu entrenamiento puede estar DESACTUALIZADO. Los datos de Wolfram Alpha y Wikipedia son EN TIEMPO REAL y reflejan la realidad ACTUAL.

RAZONAMIENTO Y CONTEXTO (MUY IMPORTANTE):
Siempre debes analizar el historial completo de la conversación para entender a qué se refieren los pronombres, referencias y preguntas encadenadas. Si el usuario hace una pregunta ambigua como "¿y cuántos años tiene?" o "¿y cuál es su periodo?", debes buscar en el historial la última entidad relevante (persona, país, objeto, etc.) y responder sobre esa entidad, aunque no se mencione explícitamente en la pregunta actual.

EJEMPLOS DE SECUENCIAS ENCADENADAS Y DESAMBIGUACIÓN:
// Ejemplo 1: Presidentes encadenados
Usuario: ¿Quién es el presidente de Estados Unidos?
IA: { "speech": "El presidente actual de Estados Unidos es Donald Trump...", "keyword": "Donald Trump", ... }
Usuario: ¿Cuántos años tiene?
IA: { "speech": "Donald Trump tiene 78 años...", "keyword": "Donald Trump", ... }
Usuario: ¿Cuál es su periodo?
IA: { "speech": "Su periodo presidencial comenzó el 20 de enero de 2025...", "keyword": "Donald Trump", ... }

// Ejemplo 2: Cambios de tema y pronombres
Usuario: ¿Quién es el presidente de México?
IA: { "speech": "La presidenta actual de México es Claudia Sheinbaum...", "keyword": "Claudia Sheinbaum", ... }
Usuario: ¿Y cuántos años tiene?
IA: { "speech": "Claudia Sheinbaum tiene 62 años...", "keyword": "Claudia Sheinbaum", ... }
Usuario: ¿Y el de Estados Unidos?
IA: { "speech": "El presidente de Estados Unidos es Donald Trump...", "keyword": "Donald Trump", ... }
Usuario: ¿Y el de Japón?
IA: { "speech": "En el caso de Japón, el cargo equivalente es el de Primer Ministro, cuya posición ocupa actualmente Fumio Kishida...", "keyword": "Prime Minister of Japan", ... }

REGLAS DE RESPUESTA:
- Usa los datos de las fuentes (Wolfram/Gemini/Wiki) para dar respuestas precisas.
- SIEMPRE responde en ESPAÑOL.
- ACLARACIÓN DE ROLES: Si el usuario pregunta por un 'Presidente' pero el país tiene un 'Primer Ministro' (o viceversa), ACLARA educadamente esa diferencia institucional mientras das el nombre correcto.
- VOZ (speech): Debe ser un relato fluido, pedagógico y con carisma. No leas los datos como una lista.
// Ejemplo 3: Capitales y referencias
Usuario: ¿Cuál es la capital de España?
IA: { "speech": "La capital de España es Madrid...", ... }
Usuario: ¿Y la de Italia?
IA: { "speech": "La capital de Italia es Roma...", ... }
Usuario: ¿Y la de Alemania?
IA: { "speech": "La capital de Alemania es Berlín...", ... }

// Ejemplo 4: Preguntas técnicas encadenadas
Usuario: ¿Cuánto mide el Everest?
IA: { "speech": "El monte Everest mide aproximadamente 8,848 metros...", ... }
Usuario: ¿Y el Aconcagua?
IA: { "speech": "El Aconcagua mide aproximadamente 6,961 metros...", ... }

Siempre responde usando el historial para desambiguar, aunque la pregunta sea ambigua o use pronombres.

REGLAS CRÍTICAS:
1. PRIORIDAD ABSOLUTA DE DATOS EXTERNOS: Wolfram Alpha y Wikipedia tienen DATOS EN TIEMPO REAL. Si dicen que el presidente es X, ESO es correcto aunque tú creas que es Y. Si dicen que un país tiene Z población, ESO es correcto. NUNCA contradigas datos de Wolfram/Wikipedia con tu entrenamiento. Tu entrenamiento es VIEJO, las fuentes son ACTUALES.
2. REGLA DE PRONUNCIACIÓN (MUY IMPORTANTE): Escribe los números científicos y símbolos con letras para que la voz de Alexa los lea naturalmente. (Ejemplo: escribe "1.898 por 10 a la 27" en lugar de "1.898 x 10^27", "1.898*10^27" o símbolos extraños).
3. REGLA DE NO-CONFUSIÓN: Si ninguna fuente devuelve datos, NO inventes información técnica específica.
4. ESTILO (MUY IMPORTANTE): Sé un profesor apasionado, cálido y fascinante. Usa un tono que despierte curiosidad y asombro. No seas un robot leyendo datos; sé conversacional, ameno y muy entusiasta (máximo 3-4 frases).

REGLAS DE DISEÑO JSON:
1. "speech": Voz de Alexa EN ESPAÑOL. Inyecta emociones SSML (<amazon:emotion name="excited" intensity="medium">). Crea un relato coherente que integre todas las fuentes (Wolfram, Gemini, Wikipedia).
2. "displayTop": Resumen ejecutivo EN ESPAÑOL resaltando los datos CLAVE (fechas, nombres, cifras). NO copies el texto de voz; debe ser un complemento visual. NUNCA respondas con términos en inglés.
JERARQUÍA DE VERDAD:
- Wolfram Alpha > Gemini Grounding > Wikipedia. Wolfram es la fuente técnica definitiva. Gemini se usa para "Grounding" (noticias, contexto actual de la web, eventos post-2024). Wikipedia es el respaldo general.
- Si hay discrepancia técnica (fechas, números), Wolfram gana. Si se trata de un evento muy reciente (noticias de ayer/hoy), Gemini gana.
- SÍNTESIS: Usa los pods de Wolfram para la estructura visual y técnica, y usa a Gemini para darle ese toque de "actualidad" y fluidez a la conversación.

IMPORTANTE: TODO el JSON debe estar en ESPAÑOL.

EJEMPLOS DE DESAMBIGUACIÓN Y CONTEXTO:
// Ejemplo 1: Preguntas encadenadas sobre presidentes
Usuario: ¿Quién es el presidente de Estados Unidos?
IA: { "speech": "El presidente actual de Estados Unidos es Joe Biden...", ... }
Usuario: ¿Cuántos años tiene?
IA: { "speech": "Joe Biden tiene 81 años...", "keyword": "Joe Biden", ... }
Usuario: ¿Cuál es su periodo?
IA: { "speech": "El periodo presidencial de Joe Biden comenzó en 2021...", "keyword": "Joe Biden", ... }

// Ejemplo 2: Pronombres y temas cambiantes
Usuario: ¿Cuál es la capital de Francia?
IA: { "speech": "La capital de Francia es París...", "keyword": "París", ... }
Usuario: ¿Y la de Alemania?
IA: { "speech": "La capital de Alemania es Berlín...", "keyword": "Berlín", ... }

// Ejemplo 3: Referencias a datos previos
Usuario: ¿Cuánto mide el Everest?
IA: { "speech": "El monte Everest mide aproximadamente 8,848 metros...", "keyword": "Monte Everest", ... }
Usuario: ¿Y el Aconcagua?
IA: { "speech": "El Aconcagua mide aproximadamente 6,961 metros...", "keyword": "Aconcagua", ... }

REGLAS CRÍTICAS DE SALIDA:
1. Responde EXCLUSIVAMENTE con un objeto JSON válido.
2. NO incluyas explicaciones, saludos ni texto fuera del JSON.
3. NO trunques la respuesta. Asegúrate de cerrar siempre la llave final }.
4. Máximo 500 tokens de salida.
5. El campo "speech" debe ser un relato fluido de máximo 4 frases.

Debes responder SIEMPRE en un objeto JSON con estas 4 claves exactas.`;

async function consultarGPT(pregunta, datoWolfram, datoWikipedia, datoGemini, keywordOriginal, historial = [], opciones = {}) {
    const startTime = Date.now();
    const gptTimeout = opciones.timeout || 3800; // Por defecto 3.8s si no se provee.

    return new Promise((resolve) => {
        let contextoExtra = "";
        const HOY = new Date().toISOString().split('T')[0];

        if (datoWolfram && datoWolfram.length > 5) {
            contextoExtra += `\n[WOLFRAM: "${datoWolfram.slice(0, 600)}"]`;
        }
        if (datoGemini && datoGemini.length > 5) {
            contextoExtra += `\n[GEMINI: "${datoGemini.slice(0, 600)}"]`;
        }
        if (datoWikipedia && datoWikipedia.length > 5) {
            contextoExtra += `\n[WIKI: "${datoWikipedia.slice(0, 600)}"]`;
        }

        if (!contextoExtra) {
            contextoExtra = "\n[AVISO: No hay datos externos disponibles. Usa tu conocimiento general.]";
        }

        const payload = JSON.stringify({
            model: "gpt-4.1-mini", // GPT-4.1 Mini (Enero 2025) - Más rápido y actualizado
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: opciones.prompt || systemContent },
                ...historial.slice(-4),
                { role: "user", content: `Pregunta: ${pregunta}${contextoExtra}\nFecha actual: ${HOY}` }
            ],
            temperature: 0.3,
            max_tokens: 280 // Reducido agresivamente para evitar timeout (v41)
        });

        const options = {
            hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            timeout: gptTimeout + 1000, // Margen amplio para overhead de red
            agent: keepAliveAgent
        };

        console.log(`[GPT-RESP] ⏱️ T+${Date.now()-startTime}ms | Solicitando respuesta | Wolfram: ${datoWolfram ? datoWolfram.length : 0}ch | Wiki: ${datoWikipedia ? datoWikipedia.length : 0}ch`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const elapsed = Date.now() - startTime;
                if (res.statusCode === 429) {
                    console.log("[GPT-RESP] ❌ RATE LIMIT OpenAI");
                    resolve({ speech: "Estoy recibiendo muchas preguntas a la vez. Intenta de nuevo en unos segundos.", displayTop: "Límite de uso alcanzado", displayBottom: "", keyword: keywordOriginal });
                    return;
                }
                if (res.statusCode !== 200) {
                    console.error(`[GPT-RESP] ❌ ERR_API_${res.statusCode} | T+${elapsed}ms | ${data.substring(0, 100)}`);
                    resolve({ speech: "Lo siento, mi cerebro digital se distrajo. ¿Repites?", displayTop: "Error de conexión", displayBottom: "", keyword: keywordOriginal });
                    return;
                }
                let fullResponse;
                try {
                    fullResponse = JSON.parse(data);
                } catch (e) {
                    console.log(`[GPT-RESP] ❌ JSON_PARSE_FAIL | Data: ${data}`);
                    resolve({ speech: "Tuve un problema interpretando la respuesta. ¿Puedes repetir?", displayTop: "Error de formato", displayBottom: "", keyword: keywordOriginal });
                    return;
                }
                if (!fullResponse.choices || !fullResponse.choices[0] || !fullResponse.choices[0].message) {
                    console.log("[GPT] ⚠️ respuesta vacía de OpenAI");
                    resolve({ speech: "Lo siento, no recibí respuesta de la IA. ¿Repites?", displayTop: "Sin respuesta de IA", displayBottom: "", keyword: keywordOriginal });
                    return;
                }
                let message = null;
                if (fullResponse.choices && fullResponse.choices[0] && fullResponse.choices[0].message && typeof fullResponse.choices[0].message.content === 'string') {
                    message = fullResponse.choices[0].message.content;
                }
                if (!message) {
                    resolve({
                        speech: "No recibí respuesta de la inteligencia artificial.",
                        displayTop: "Respuesta vacía",
                        displayBottom: "",
                        keyword: keywordOriginal
                    });
                    return;
                }
                let content = message
                    .replace(/```json/gi,'')
                    .replace(/```/g,'')
                    .trim();
                let enriched = null;
                try {
                    // Validar que el contenido sea JSON antes de parsear
                    if (/^\s*\{[\s\S]*\}\s*$/.test(content)) {
                        enriched = JSON.parse(content);
                    } else {
                        throw new Error("Respuesta no es JSON válido: " + content);
                    }
                } catch(e) {
                    console.log(`[GPT-RESP] ❌ JSON_PARSE_FAIL | Content: ${content}`);
                    resolve({ speech: "Tuve un problema interpretando la respuesta. ¿Puedes repetir?", displayTop: "Error de formato", displayBottom: "", keyword: keywordOriginal });
                    return;
                }
                if (!enriched || typeof enriched !== 'object' || !enriched.speech) {
                    resolve({
                        speech: "No pude generar una respuesta clara. ¿Puedes repetir?",
                        displayTop: "Sin respuesta",
                        displayBottom: "",
                        keyword: keywordOriginal
                    });
                    return;
                }
                console.log(`[GPT-RESP] ✅ OK | T+${elapsed}ms | Respuesta generada`);
                resolve(enriched); 
            });
        });

        req.on('timeout', () => {
            req.destroy();
            console.log(`[GPT-RESP] ❌ ERR_TIMEOUT | T+${Date.now() - startTime}ms | Límite: ${gptTimeout}ms`);
            resolve({ speech: "Lo siento, la respuesta tardó demasiado. ¿Puedes repetir?", displayTop: "Timeout", displayBottom: "", keyword: keywordOriginal });
        });
        req.on('error', (e) => {
            console.log(`[GPT-RESP] ❌ ERR_NET | T+${Date.now() - startTime}ms | ${e.message}`);
            resolve({ speech: "No pude conectar con mi base de datos.", displayTop: "Error de red", displayBottom: "", keyword: keywordOriginal });
        });
        req.write(payload);
        req.end();
    });
}

/**
 * Corrige y enriquece una respuesta GPT existente usando datos de Wolfram/Wikipedia en tiempo real.
 * MISIÓN PRINCIPAL: Detectar y corregir errores factuales (fechas, nombres, cifras) de la respuesta
 * base que fueron generados con el entrenamiento desactualizado de GPT.
 * 
 * Llamada rápida (~500ms) porque no genera desde cero, solo ajusta.
 * Se invoca en FASE 2 del budget dinámico si hay ≥1000ms disponibles.
 * 
 * @param {{speech: string, displayTop: string, displayBottom: string, keyword: string}} respuestaBase - Respuesta GPT a corregir.
 * @param {string} datosWolfram - Texto plano de Wolfram Alpha en tiempo real.
 * @param {string} datosWikipedia - Texto de Wikipedia en tiempo real.
 * @returns {Promise<{speech: string, displayTop: string, displayBottom: string, keyword: string}>}
 */
async function enriquecerConWolfram(respuestaBase, datosWolfram, datosWikipedia) {
    if (!respuestaBase || !respuestaBase.speech) return respuestaBase;
    if ((!datosWolfram || datosWolfram.length < 10) && (!datosWikipedia || datosWikipedia.length < 10)) return respuestaBase;
    
    const startTime = Date.now();
    return new Promise((resolve) => {
        let fuentesExtra = "";
        if (datosWolfram && datosWolfram.length >= 10) fuentesExtra += `DATOS WOLFRAM (TIEMPO REAL): "${datosWolfram}"\n`;
        if (datosWikipedia && datosWikipedia.length >= 10) fuentesExtra += `DATOS WIKIPEDIA (TIEMPO REAL): "${datosWikipedia}"\n`;
        
        const payload = JSON.stringify({
            model: "gpt-4.1-mini", // GPT-4.1 Mini para enriquecimiento rápido
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: `Corrige la respuesta usando los datos en tiempo real. Si los números, fechas o nombres no coinciden, los datos de Wolfram o Wikipedia son correctos. Devuelve el JSON completo manteniendo: speech, displayTop, displayBottom, keyword.` },
                { role: "user", content: `RESPUESTA BASE: ${JSON.stringify(respuestaBase)}\n${fuentesExtra}` }
            ],
            temperature: 0.3,
            max_tokens: 300
        });

        const options = {
            hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            timeout: 3500, // Aumentado a 3.5s para dar más rango de búsqueda/procesamientol
            agent: keepAliveAgent
        };

        console.log(`[GPT-ENRICH] ⏱️ T+0ms | Enriqueciendo con Wolfram: ${datosWolfram ? datosWolfram.length : 0}ch + Wiki: ${datosWikipedia ? datosWikipedia.length : 0}ch`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const elapsed = Date.now() - startTime;
                try {
                    if (res.statusCode === 429) {
                        console.log("[GPT-ENRICH] ❌ RATE LIMIT OpenAI");
                        resolve(respuestaBase);
                        return;
                    }
                    const fullResponse = JSON.parse(data);
                    if (!fullResponse.choices || !fullResponse.choices[0] || !fullResponse.choices[0].message) {
                        console.log("[GPT] ⚠️ respuesta vacía de OpenAI");
                        resolve(respuestaBase);
                        return;
                    }
                    let message = null;
                    if (fullResponse.choices && fullResponse.choices[0] && fullResponse.choices[0].message && typeof fullResponse.choices[0].message.content === 'string') {
                        message = fullResponse.choices[0].message.content;
                    }
                    if (!message) {
                        resolve(respuestaBase);
                        return;
                    }
                    let content = message
                        .replace(/```json/gi,'')
                        .replace(/```/g,'')
                        .trim();
                    let enriched;
                    try {
                        enriched = JSON.parse(content);
                    } catch (e) {
                        console.log('[GPT-ENRICH] ❌ JSON_PARSE_FAIL | Content:', content, '| Error:', e.message);
                        resolve(respuestaBase);
                        return;
                    }
                    if (!enriched.keyword) enriched.keyword = respuestaBase.keyword;
                    console.log(`[GPT-ENRICH] ✅ OK | T+${elapsed}ms | Respuesta enriquecida`);
                    resolve(enriched);
                } catch (e) {
                    console.log(`[GPT-ENRICH] ⚠️ T+${elapsed}ms | Fallback a respuesta base | ${e.message}`);
                    resolve(respuestaBase);
                }
            });
        });

        req.on('timeout', () => {
            console.log(`[GPT-ENRICH] ⏰ T+${Date.now() - startTime}ms | Timeout - usando respuesta base`);
            req.destroy();
            resolve(respuestaBase);
        });
        req.on('error', () => {
            resolve(respuestaBase);
        });
        req.write(payload);
        req.end();
    });
}

/**
 * Auditoría rápida de respuesta final (mejora redacción, claridad, tono, sin cambiar el dato principal de Wolfram)
 * @param {string} speech - Texto de la respuesta a auditar
 * @param {string} datoWolfram - Texto de Wolfram Alpha
 * @param {string} datoWikipedia - Texto de Wikipedia
 * @param {string} keyword - Palabra clave principal
 * @returns {Promise<{speech: string}>}
 */
async function auditarRespuesta(speech, datoWolfram, datoWikipedia, keyword) {
    return new Promise((resolve) => {
        const payload = JSON.stringify({
            model: "gpt-4.1-mini", // GPT-4.1 Mini para auditoría rápida
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "Revisa la siguiente respuesta para Alexa. NO CAMBIES el dato principal de Wolfram Alpha, solo mejora redacción, claridad y tono si es posible." },
                { role: "user", content: `Respuesta: ${speech}\nWolfram: ${datoWolfram}\nWikipedia: ${datoWikipedia}` }
            ],
            temperature: 0.2,
            max_tokens: 120
        });
        const options = {
            hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            timeout: 1200, // Mantener en 1200ms para auditoría rápida
            agent: keepAliveAgent
        };
        let resolved = false;
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (resolved) return;
                let audit = null;
                try {
                    const response = JSON.parse(data);
                    if (response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content) {
                        let content = response.choices[0].message.content.replace(/```json/gi,'').replace(/```/g,'').trim();
                        try { audit = JSON.parse(content); } catch (e) {}
                    }
                } catch (e) {}
                if (audit && audit.speech) {
                    resolved = true;
                    resolve(audit);
                } else {
                    resolved = true;
                    resolve({ speech: speech });
                }
            });
        });
        req.on('timeout', () => {
            if (!resolved) {
                resolved = true;
                req.destroy();
                resolve({ speech: speech });
            }
        });
        req.on('error', () => {
            if (!resolved) {
                resolved = true;
                resolve({ speech: speech });
            }
        });
        req.write(payload);
        req.end();
    });
}

module.exports = { obtenerKeyword, consultarGPT, enriquecerConWolfram, auditarRespuesta, traducirGPT };
