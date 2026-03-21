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
            .replace(/[¿?]/g, '')  // Eliminar signos de interrogación
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
        // Reparar mojibake en la pregunta completa antes del regex
        const preguntaClean = pregunta
            .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í')
            .replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ã±/g, 'ñ')
            .replace(/Ã/g, 'Á').replace(/Ã/g, 'É').replace(/Ã/g, 'Í')
            .replace(/Ã/g, 'Ó').replace(/Ã/g, 'Ú').replace(/Â¿/g, '¿');
        const mathMatchOriginal = preguntaClean.toLowerCase().match(/\b(derivada|integral|limite)\s+de(?:l)?\s+(.+?)(?:\s+paso|$)/i);
        if (mathMatchOriginal) {
            const op = mathMatchOriginal[1];
            let expr = mathMatchOriginal[2].trim()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // quitar diacríticos después de reparar mojibake
                .replace(/[¿?¡!]/g, '');         // eliminar signos de puntuación residuales
            // PASO 1: e^(nx) — ANTES de convertir operadores para no romper la expresión
            // Capturar "e a la [expr]" ANTES de que "por" se convierta a "*"
            expr = expr
                .replace(/\be\s+a\s+la\s+menos\s+(\w+)/g, 'e^(-$1)')
                .replace(/\be\s+a\s+la\s+(\w+)/g, 'e^($1)');
            // PASO 2: funciones inversas — ANTES que las directas
            expr = expr
                .replace(/\b(?:arco\s*seno|arc\s*seno|arcoseno)\s*(?:de\s+)?/g, 'arcsin(')
                .replace(/\b(?:arco\s*coseno|arc\s*coseno)\s*(?:de\s+)?/g, 'arccos(')
                .replace(/\b(?:arco\s*tangente|arc\s*tangente)\s*(?:de\s+)?/g, 'arctan(');
            // PASO 3: funciones al cuadrado — marcar con __sq__ para resolver después
            expr = expr
                .replace(/\b(?:el\s+|la\s+)?seno\s+al\s+cuadrado\s*(?:de\s+)?/g, '__sinSQ__(')
                .replace(/\b(?:el\s+|la\s+)?coseno\s+al\s+cuadrado\s*(?:de\s+)?/g, '__cosSQ__(')
                .replace(/\b(?:el\s+|la\s+)?tangente\s+al\s+cuadrado\s*(?:de\s+)?/g, '__tanSQ__(');
            // PASO 4: funciones simples — marcar con __fn__ para cerrar paren después del argumento
            // NO abrir paréntesis aquí — se cierra en PASO 4b tras convertir variables/números
            expr = expr
                .replace(/\b(?:el\s+|la\s+)?seno\s*(?:de\s+)?/g, '__sin__')
                .replace(/\b(?:el\s+|la\s+)?coseno\s*(?:de\s+)?/g, '__cos__')
                .replace(/\b(?:el\s+|la\s+)?tangente\s*(?:de\s+)?/g, '__tan__');
            // PASO 5: raíz cuadrada y logaritmos — apertura directa, PASO 12 cierra
            // (a diferencia de sin/cos/tan, sqrt/ln/log suelen tener argumentos compuestos
            // como sqrt(x+1) o ln(x^2+1) que el sistema de marcadores no captura bien)
            expr = expr
                .replace(/\b(?:la\s+)?raiz\s+cuadrada\s+de(?:l)?\s*/g, 'sqrt(')
                .replace(/\braiz\s+de(?:l)?\s*/g, 'sqrt(')
                .replace(/\blogaritmo\s+natural\s+de(?:l)?\s*/g, 'ln(')
                .replace(/\blog\s+natural\s+de(?:l)?\s*/g, 'ln(')
                .replace(/\bln\s+de(?:l)?\s*/g, 'ln(')
                .replace(/\blogaritmo\s+de(?:l)?\s*/g, 'log(')
                .replace(/\blogaritmo\b/g, 'log(');
            // PASO 6: limpiar palabras no matemáticas
            expr = expr
                .replace(/\bla\s+funci[oó]n\b/gi, '')
                .replace(/\bla\s+expresi[oó]n\b/gi, '')
                .replace(/\bde\s+la\b/gi, '')
                .replace(/\b(el|la)\s+(sin|cos|tan|log|ln|sqrt|arcsin|arccos|arctan)\(/g, '$2(');
            // PASO 7: variables fonéticas y palabras en español residuales
            expr = expr
                .replace(/equis/g, 'x')   // sin \b — equis puede estar pegado a marcadores __fn__
                .replace(/\bigriega\b/g, 'y')
                .replace(/\bzeta\b/g, 'z')
                .replace(/\bmas\b/g, '+')  // "más" sin acento después de normalizar
                .replace(/\bal\b/g, '')    // "al" residual (de "x al cuadrado" cuando cuadrado se procesa antes)
                .replace(/\bla\b/g, '')
                .replace(/\bel\b/g, '')
                .replace(/\bde\b/g, '');
            // PASO 8: números (sin \b — pueden estar pegados a marcadores __fn__)
            expr = expr
                .replace(/cero/g, '0').replace(/un[ao]?(?![a-z])/g, '1')
                .replace(/dos/g, '2').replace(/tres/g, '3')
                .replace(/cuatro/g, '4').replace(/cinco/g, '5')
                .replace(/seis/g, '6').replace(/siete/g, '7')
                .replace(/ocho/g, '8').replace(/nueve/g, '9')
                .replace(/\bdiez\b/g, '10').replace(/\bonce\b/g, '11')
                .replace(/\bdoce\b/g, '12').replace(/\bveinte\b/g, '20')
                .replace(/\bcien\b/g, '100').replace(/\bpi\b/g, 'pi');
            // PASO 9: potencias
            expr = expr
                .replace(/\bx\s+cuadrado\b/g, 'x^2')
                .replace(/\bx\s+cubo\b/g, 'x^3')
                .replace(/\b(\w+)\s+cuadrado\b/g, '$1^2')
                .replace(/\b(\w+)\s+cubo\b/g, '$1^3')
                .replace(/\bx\s+al\s+cubo\b/g, 'x^3')
                .replace(/\bx\s+al\s+cuadrado\b/g, 'x^2')
                .replace(/\b(\w+)\s+al\s+cubo\b/g, '$1^3')
                .replace(/\b(\w+)\s+al\s+cuadrado\b/g, '$1^2')
                .replace(/\b(\w+)\s+a\s+la\s+(\d+)\b/g, '$1^$2');
            // PASO 10: operadores
            expr = expr
                .replace(/\bsobre\b/g, '/')
                .replace(/\bdividido\s+entre\b/g, '/').replace(/\bdividido\s+por\b/g, '/')
                .replace(/\bm[aá]s\b/g, '+').replace(/\bmenos\b/g, '-')
                .replace(/\bpor\b/g, '*').replace(/\bentre\b/g, '/');
            // PASO 10b: colapsar e^(N) * x → e^(N*x) DESPUÉS de convertir "por" → "*"
            // Solo colapsar si el siguiente token es una variable sola (x,y,z), no una función
            expr = expr.replace(/e\^\((-?[\w.]+)\)\s*\*?\s*([xyz])(?![a-z(])/g, 'e^($1*$2)');
            // PASO 10c: resolver marcadores __sin__/__cos__/__tan__ de adentro hacia afuera
            // (__sqrt__/__ln__/__log__ ya fueron resueltos con apertura directa en PASO 5)
            const fnArgSimple = '([+-]?\\s*\\d*\\.?\\d*\\s*\\*?\\s*[a-z](?:\\^[\\w.]+)?|[+-]?\\s*\\d+(?:\\.\\d+)?(?:\\^[\\w.]+)?)';
            for (let pass = 0; pass < 3; pass++) {
                expr = expr
                    .replace(new RegExp('__sin__\\s*' + fnArgSimple, 'g'), 'sin($1)')
                    .replace(new RegExp('__cos__\\s*' + fnArgSimple, 'g'), 'cos($1)')
                    .replace(new RegExp('__tan__\\s*' + fnArgSimple, 'g'), 'tan($1)');
                // Resolver cuando el argumento es una función ya resuelta: ln(sin(x))
                expr = expr
                    .replace(/__sin__\s*((?:sin|cos|tan|sqrt|ln|log|arcsin|arccos|arctan)\([^)]+\)(?:\^[\w.]+)?)/g, 'sin($1)')
                    .replace(/__cos__\s*((?:sin|cos|tan|sqrt|ln|log|arcsin|arccos|arctan)\([^)]+\)(?:\^[\w.]+)?)/g, 'cos($1)')
                    .replace(/__tan__\s*((?:sin|cos|tan|sqrt|ln|log|arcsin|arccos|arctan)\([^)]+\)(?:\^[\w.]+)?)/g, 'tan($1)');
            }
            // Marcadores sin resolver → abrir paréntesis y cerrar al final (PASO 12)
            expr = expr
                .replace(/__sin__/g, 'sin(').replace(/__cos__/g, 'cos(').replace(/__tan__/g, 'tan(');
            expr = expr.replace(/\s+/g, ' ').trim();
            // PASO 11: 1/(denominador) — envolver ANTES de cerrar paréntesis y ANTES de convertir límites
            // \S+ solo capturaba el primer token; esta regex captura todo el denominador hasta la cláusula de límite
            expr = expr.replace(
                /^1\s*\/\s*(.+?)(\s+(?:as\s+x|approaches\s+|cuando\s+x).*)?$/,
                (_, denom, limitClause) => '1/(' + denom.trim() + ')' + (limitClause || '')
            );
            // PASO 12 (antes): cerrar paréntesis abiertos
            const abiertos = (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length;
            let exprFinal = abiertos > 0 ? expr + ')'.repeat(abiertos) : expr;
            // PASO 13: resolver marcadores __sq__ → sin(...)^2
            exprFinal = exprFinal
                .replace(/__sinSQ__\(([^)]+)\)/g, 'sin($1)^2')
                .replace(/__cosSQ__\(([^)]+)\)/g, 'cos($1)^2')
                .replace(/__tanSQ__\(([^)]+)\)/g, 'tan($1)^2');
            // PASO 14: límites — al final para no ser envueltos por PASO 11
            exprFinal = exprFinal
                .replace(/\bcuando\s+x\s+tiende\s+a\s+infinito\b/g, 'as x approaches infinity')
                .replace(/\bcuando\s+x\s+tiende\s+a\s+(\w+)\b/g, 'as x approaches $1')
                .replace(/\btiende\s+a\s+infinito\b/g, 'approaches infinity')
                .replace(/\btiende\s+a\s+(\w+)\b/g, 'approaches $1');
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
- CRITICAL: If the question says "el de [country/place]" or "la de [country/place]", it means the EQUIVALENT ROLE in that country, NOT the previous person in that country. Example: context="Donald Trump", question="el de México" → "President of Mexico" (NOT "Donald Trump Mexico").
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
            // Fallback: Gemini extrae el keyword
            _keywordConGemini(pregunta, contextoFactual).then(resolve);
        });
        req.on('error', (e) => {
            console.log(`[GPT-KW] ❌ ERR_NET | T+${Date.now()-startTime}ms | ${e.message}`);
            _keywordConGemini(pregunta, contextoFactual).then(resolve);
        });
        req.write(payload);
        req.end();
    });
}

/**
 * Fallback: extrae keyword usando Gemini cuando GPT falla o hace timeout.
 * @param {string} pregunta
 * @param {string|null} contexto
 * @returns {Promise<string>}
 */
function _keywordConGemini(pregunta, contexto) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
    if (!GEMINI_API_KEY) return Promise.resolve(pregunta.split(' ').slice(-2).join(' '));

    const ctx = contexto ? ` Context: "${contexto}".` : '';
    const prompt = `Extract the best search keyword for Wolfram Alpha or Wikipedia. Max 5 words, in English only. No explanation.${ctx}\nQuestion: ${pregunta}`;

    return new Promise((resolve) => {
        const payload = JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 20, temperature: 0 }
        });
        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            timeout: 2000
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const kw = JSON.parse(data).candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                    console.log(`[GPT-KW] 🟡 GEMINI FALLBACK | "${kw}"`);
                    resolve(kw || pregunta.split(' ').slice(-2).join(' '));
                } catch { resolve(pregunta.split(' ').slice(-2).join(' ')); }
            });
        });
        req.on('timeout', () => { req.destroy(); resolve(pregunta.split(' ').slice(-2).join(' ')); });
        req.on('error', () => resolve(pregunta.split(' ').slice(-2).join(' ')));
        req.write(payload);
        req.end();
    });
}

module.exports = { obtenerKeyword, traducirGPT };
