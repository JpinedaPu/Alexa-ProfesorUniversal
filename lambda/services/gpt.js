/**
 * @module gpt
 * @description Servicios GPT-4.1 Mini para Profesor Universal IA.
 *   - obtenerKeyword(): extrae keyword en inglés para Wolfram/Wikipedia
 *   - traducirGPT(): traducciones rápidas para títulos y voz Alexa
 *
 * La síntesis educativa completa la hace Claude (claude.js).
 *
 * @version 7.7.0
 * @author JpinedaPu
 */

const https = require('https');

if (process.env.NODE_ENV !== 'production' && !process.env.LAMBDA_TASK_ROOT) {
    try { require('dotenv').config(); } catch (e) {}
}

const keepAliveAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 50,
    keepAliveMsecs: 60000,
    timeout: 10000
});

const HOY = new Date().toISOString().split('T')[0];
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

if (!OPENAI_API_KEY) {
    console.warn('[GPT] ⚠️ OPENAI_API_KEY no configurada.');
}

/**
 * Traduce texto usando GPT-4.1 Mini.
 * Si opciones.modo === 'voz', prepara el texto para lectura en Alexa.
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
        prompt = `Traduce del ${idiomaOrigen === 'es' ? 'español' : 'inglés'} al ${idiomaDestino === 'es' ? 'español' : 'inglés'} para voz Alexa, tono pedagógico y natural. Solo el texto traducido:\n"""${texto}"""`;
    } else {
        prompt = `Traduce del ${idiomaOrigen === 'es' ? 'español' : 'inglés'} al ${idiomaDestino === 'es' ? 'español' : 'inglés'} de forma natural, solo el texto:\n"""${texto}"""`;
    }

    const tInicio = Date.now();
    return new Promise((resolve) => {
        const payload = JSON.stringify({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: 'Eres un traductor profesional. Solo responde con el texto traducido, sin explicaciones.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: Math.max(60, Math.round(texto.length * 1.2))
        });

        const req = https.request({
            hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            timeout: 4000,
            agent: keepAliveAgent
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                const ms = Date.now() - tInicio;
                try {
                    const r = JSON.parse(data);
                    const traducido = r.choices?.[0]?.message?.content?.trim().replace(/^"|"$/g, '');
                    if (!traducido || traducido.length < 2) { resolve(texto); return; }
                    console.log(`[TRADUCTOR] ✅ ${idiomaOrigen}->${idiomaDestino} | ${ms}ms`);
                    resolve(traducido);
                } catch (e) {
                    console.log(`[TRADUCTOR] ❌ ERR_PARSE | ${ms}ms`);
                    resolve(texto);
                }
            });
        });
        req.on('timeout', () => { req.destroy(); console.log(`[TRADUCTOR] ❌ TIMEOUT | ${Date.now()-tInicio}ms`); resolve(texto); });
        req.on('error', () => resolve(texto));
        req.write(payload);
        req.end();
    });
}

/**
 * Extrae keyword en inglés optimizado para Wolfram Alpha / Wikipedia.
 * Incluye fast paths para planetas, presidentes y expresiones matemáticas.
 * Resuelve pronombres ambiguos usando contexto de sesión.
 *
 * @param {string} pregunta - Pregunta del usuario en español
 * @param {Array} historial - Historial de conversación
 * @param {string|null} contextoFactual - Última entidad confirmada (ej: "Donald Trump")
 * @param {string|null} rolPrevio - Rol previo para preservar contexto (ej: "President")
 * @returns {Promise<string>} Keyword en inglés
 */
async function obtenerKeyword(pregunta, historial = [], contextoFactual = null, rolPrevio = null) {
    const startTime = Date.now();
    return new Promise((resolve) => {
        const preguntaNorm = (pregunta || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

        // ── FAST PATHS ────────────────────────────────────────────────────────
        const fastPath = {
            'el sol': 'Sun', 'sol': 'Sun',
            'la tierra': 'Earth', 'tierra': 'Earth',
            'la luna': 'Moon', 'luna': 'Moon',
            'marte': 'Mars', 'jupiter': 'Jupiter',
            'saturno': 'Saturn',
            'el presidente de estados unidos': 'President of United States',
            'presidente de estados unidos': 'President of United States',
            'quien es el presidente de estados unidos': 'President of United States',
            'el de japon': 'Prime Minister of Japan',
            'el de francia': 'President of France',
            'edad': 'Age', 'cuantos anos tiene': 'Age'
        };

        // Fast path: duración del sol en ciudad
        const duracionSolMatch = preguntaNorm.match(/(?:cuanto|cuantas horas|duracion|dura).*sol.*(?:en|de)\s+([a-z]+)/i);
        if (duracionSolMatch?.[1]) {
            const ciudad = duracionSolMatch[1].charAt(0).toUpperCase() + duracionSolMatch[1].slice(1);
            console.log(`[GPT-KW] 🌞 FAST PATH SOL | T+${Date.now()-startTime}ms | "Sun in ${ciudad}"`);
            resolve(`Sun in ${ciudad}`);
            return;
        }

        // Fast path: derivadas/integrales/límites
        const mathMatch = preguntaNorm.match(/\b(derivada|integral|limite)\s+de\s+(.+?)(?:\s+paso|$)/i);
        if (mathMatch) {
            const op = mathMatch[1];
            const expr = mathMatch[2].trim()
                // Variables fonéticas
                .replace(/\bequis\b/g, 'x')
                .replace(/\bigriega\b/g, 'y')
                .replace(/\bzeta\b/g, 'z')
                // Potencias
                .replace(/\bx\s+al\s+cubo\b/g, 'x^3')
                .replace(/\bx\s+al\s+cuadrado\b/g, 'x^2')
                .replace(/\b(\w+)\s+al\s+cubo\b/g, '$1^3')
                .replace(/\b(\w+)\s+al\s+cuadrado\b/g, '$1^2')
                .replace(/\b(\w+)\s+a\s+la\s+(\d+)\b/g, '$1^$2')
                // Operadores — "sobre" ANTES que "entre" para no colisionar
                .replace(/\bsobre\b/g, '/')
                .replace(/\bmas\b/g, '+').replace(/\bmenos\b/g, '-')
                .replace(/\bpor\b/g, '*').replace(/\bentre\b/g, '/')
                // Funciones — logaritmo natural ANTES que logaritmo genérico
                .replace(/\blogaritmo\s+natural\s+de\b/g, 'ln(')
                .replace(/\blog\s+natural\s+de\b/g, 'ln(')
                .replace(/\bln\s+de\b/g, 'ln(')
                .replace(/\braiz\s+de\b/g, 'sqrt(')
                .replace(/\bseno\b/g, 'sin').replace(/\bcoseno\b/g, 'cos').replace(/\btangente\b/g, 'tan')
                .replace(/\blogaritmo\b/g, 'log')
                // Límites
                .replace(/\bcuando\s+x\s+tiende\s+a\s+infinito\b/g, 'as x approaches infinity')
                .replace(/\bcuando\s+x\s+tiende\s+a\s+(\w+)\b/g, 'as x approaches $1')
                .replace(/\btiende\s+a\s+infinito\b/g, 'approaches infinity')
                .replace(/\btiende\s+a\s+(\w+)\b/g, 'approaches $1')
                .replace(/\s+/g, ' ').trim();
            // Cerrar paréntesis abiertos por funciones (ln, sqrt, sin, cos, tan, log)
            const abiertos = (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length;
            const exprFinal = abiertos > 0 ? expr + ')'.repeat(abiertos) : expr;
            const keyword = op === 'derivada' ? `derivative of ${exprFinal}`
                : op === 'integral' ? `integral of ${exprFinal}`
                : `limit of ${exprFinal}`;
            console.log(`[GPT-KW] FAST PATH MATH | T+${Date.now()-startTime}ms | "${keyword}"`);
            resolve(keyword);
            return;
        }

        if (fastPath[preguntaNorm]) {
            console.log(`[GPT-KW] 🚀 FAST PATH | T+${Date.now()-startTime}ms | "${fastPath[preguntaNorm]}"`);
            resolve(fastPath[preguntaNorm]);
            return;
        }

        // ── GPT CALL ──────────────────────────────────────────────────────────
        const pronombres = /\b(su|sus|él|ella|eso|esa|este|esta|le|it|its|this|that|the same|el de|la de|y el|y la|en|con|tiene|tienen|puede|pueden|mide|fue|era|son|está|están|pesa|dura|cuesta|necesita|hace|hizo|sirve|funciona|contiene|produce|compáralo|compáralos|compárala|compáralas|compararlo|compararla|comparar)\b/i;
        const tienePronombre = pronombres.test(preguntaNorm);

        let contextoStr = '';
        if (tienePronombre) {
            if (contextoFactual) {
                contextoStr = `The CURRENT FACTUAL SUBJECT is: "${contextoFactual}".`;
            } else if (historial?.length > 0) {
                contextoStr = historial.slice(-2).map(h => h.content).join(' | ');
            }
        }

        let systemPrompt;
        if (tienePronombre && (contextoFactual || historial?.length > 0)) {
            const rolContext = rolPrevio ? ` The previous question was about "${rolPrevio}". PRESERVE this role for the new entity.` : '';
            systemPrompt = `Extract the BEST search keyword for Wolfram Alpha or Wikipedia. Max 6 words, in English.
RULES:
- A PRONOUN or SUBJECT change occurred. RESOLVE it using the CONTEXT: ${contextoStr}.${rolContext}
- MANDATORY: Result in ENGLISH ONLY.
- COMPARISON: If comparison implied, return BOTH entities separated by 'vs' (e.g. 'Sun vs Earth').
- DURATION/SUN: If asking about sun duration in a location, return 'Sun in [City]'.
- MATH: Translate complete mathematical expressions (e.g. "derivada de x al cubo más 2" -> "derivative of x^3 + 2").
- NO FILLER WORDS. Only return the entity name, no explanation.`;
        } else {
            systemPrompt = `Extract the BEST search keyword for Wolfram Alpha or Wikipedia. Max 6 words, in English.
RULES:
- ONLY return the entity in ENGLISH.
- DURATION/SUN: If asking about sun duration in a location, return 'Sun in [City]'.
- MATH: Translate complete mathematical expressions (e.g. "integral de 2x menos 5" -> "integral of 2x - 5").
- NO FILLER WORDS. Just the entity.
- MANDATORY: RESPONSE IN ENGLISH ONLY. Only return the keyword, no explanation.`;
        }

        const payload = JSON.stringify({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `NUEVA PREGUNTA: ${pregunta}` }
            ],
            temperature: 0.1,
            max_tokens: 25
        });

        console.log(`[GPT-KW] ⏱️ T+${Date.now()-startTime}ms | pronombre=${tienePronombre} | ctx="${contextoStr.substring(0,40)}"`);

        const req = https.request({
            hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            timeout: 1500,
            agent: keepAliveAgent
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                const elapsed = Date.now() - startTime;
                if (res.statusCode === 429) { console.log('[GPT-KW] ❌ RATE LIMIT'); resolve(''); return; }
                if (res.statusCode !== 200) { console.log(`[GPT-KW] ❌ HTTP${res.statusCode} | T+${elapsed}ms`); resolve(''); return; }
                try {
                    const r = JSON.parse(data);
                    const kw = r.choices?.[0]?.message?.content?.trim().replace(/['"]/g, '');
                    console.log(`[GPT-KW] ✅ T+${elapsed}ms | "${kw}"`);
                    resolve(kw || '');
                } catch (e) {
                    console.log(`[GPT-KW] ❌ ERR_PARSE | T+${elapsed}ms`);
                    resolve('');
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            console.log(`[GPT-KW] ❌ TIMEOUT | T+${Date.now()-startTime}ms`);
            // Fallback: diccionario de frases comunes
            const fallbacks = {
                'presidente de estados unidos': 'president of the United States',
                'estados unidos': 'United States',
                'presidente de mexico': 'president of Mexico',
                'presidente de espana': 'president of Spain',
                'capital de francia': 'capital of France',
                'capital de mexico': 'capital of Mexico',
                'capital de espana': 'capital of Spain'
            };
            for (const frase in fallbacks) {
                if (preguntaNorm.includes(frase)) { resolve(fallbacks[frase]); return; }
            }
            resolve(preguntaNorm.replace(/[¿?]/g, '').split(' ').filter(w => w.length > 3).slice(-1)[0] || '');
        });
        req.on('error', (e) => {
            console.log(`[GPT-KW] ❌ ERR_NET | T+${Date.now()-startTime}ms | ${e.message}`);
            resolve(pregunta.split(' ').slice(-2).join(' '));
        });
        req.write(payload);
        req.end();
    });
}

module.exports = { obtenerKeyword, traducirGPT };
