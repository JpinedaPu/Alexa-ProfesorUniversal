/**
 * ambiguityDetector.js
 * Detección general de ambigüedades usando GPT-4.1 Mini.
 * No usa tabla hardcodeada — GPT evalúa cualquier término incorrecto o ambiguo.
 */

const https = require('https');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });

const SYSTEM_PROMPT = `Eres un detector de ambigüedades para un asistente educativo de voz (Alexa).

Tu tarea: analizar si la pregunta del usuario contiene un término CLARAMENTE INCORRECTO o AMBIGUO que impediría dar una respuesta útil.

CRITERIOS para marcar como ambigua (sé MUY selectivo, solo casos obvios):
- El usuario confunde el nombre de algo con otro concepto diferente (ej: "planeta plutonio" — plutonio es un elemento, no un planeta)
- El término usado no existe en el contexto de la pregunta (ej: "vitamina del hierro" — el hierro es un mineral, no una vitamina)
- Hay dos interpretaciones radicalmente distintas y la pregunta no deja claro cuál (ej: "mercurio" puede ser planeta o elemento)

NO marcar como ambigua:
- Preguntas con errores ortográficos menores ("Einstin" → Einstein)
- Preguntas imprecisas pero comprensibles ("el planeta grande" → Júpiter)
- Preguntas matemáticas de cualquier tipo
- Preguntas sobre personas, lugares, eventos históricos
- Cualquier duda que puedas resolver con sentido común

Responde SOLO con JSON válido, sin texto extra:
- Si NO es ambigua: {"ambigua": false}
- Si ES ambigua: {
    "ambigua": true,
    "aclaracion": "frase corta que Alexa dirá al usuario explicando la ambigüedad y preguntando qué quiso decir (máx 2 oraciones, tono amigable)",
    "interpretaciones": ["interpretación A en español", "interpretación B en español"],
    "preguntaCorregidaA": "la pregunta original reescrita con interpretación A",
    "preguntaCorregidaB": "la pregunta original reescrita con interpretación B"
  }`;

/**
 * Llama a GPT para detectar si la pregunta es ambigua.
 * Timeout agresivo: 800ms. Si falla o tarda, devuelve { ambigua: false } para no bloquear.
 * @param {string} pregunta
 * @returns {Promise<{ambigua: boolean, aclaracion?: string, interpretaciones?: string[], preguntaCorregidaA?: string, preguntaCorregidaB?: string}>}
 */
function detectarAmbiguedad(pregunta) {
    return new Promise((resolve) => {
        const fallback = { ambigua: false };
        if (!OPENAI_API_KEY || !pregunta) { resolve(fallback); return; }

        const payload = JSON.stringify({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: pregunta }
            ],
            temperature: 0,
            max_tokens: 120
        });

        const req = https.request({
            hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Length': Buffer.byteLength(payload) },
            timeout: 800,
            agent: keepAliveAgent
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                if (res.statusCode !== 200) { resolve(fallback); return; }
                try {
                    const r = JSON.parse(data);
                    const text = r.choices?.[0]?.message?.content?.trim();
                    const s = text.indexOf('{'), e = text.lastIndexOf('}');
                    const result = (s !== -1 && e > s) ? JSON.parse(text.substring(s, e + 1)) : fallback;
                    resolve(result.ambigua === true ? result : fallback);
                } catch (_) { resolve(fallback); }
            });
        });
        req.on('timeout', () => { req.destroy(); resolve(fallback); });
        req.on('error', () => resolve(fallback));
        req.write(payload);
        req.end();
    });
}

/**
 * Resuelve la ambigüedad pendiente según la respuesta del usuario.
 * GPT ya calculó las dos versiones corregidas — solo hay que elegir cuál usar.
 * @param {string} respuesta - Lo que dijo el usuario en el turno de aclaración
 * @param {Object} pendiente - { interpretaciones, preguntaCorregidaA, preguntaCorregidaB, preguntaOriginal }
 * @returns {string} Pregunta corregida lista para procesar
 */
function resolverAmbiguedad(respuesta, pendiente) {
    if (!pendiente) return null;
    const r = (respuesta || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const intA = (pendiente.interpretaciones?.[0] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const intB = (pendiente.interpretaciones?.[1] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Buscar coincidencia con interpretación A o B por palabras clave
    const palabrasA = intA.split(/\s+/).filter(w => w.length > 3);
    const palabrasB = intB.split(/\s+/).filter(w => w.length > 3);
    const scoreA = palabrasA.filter(w => r.includes(w)).length;
    const scoreB = palabrasB.filter(w => r.includes(w)).length;

    if (scoreA > scoreB) return pendiente.preguntaCorregidaA;
    if (scoreB > scoreA) return pendiente.preguntaCorregidaB;

    // Empate o sin coincidencia — usar la pregunta original tal como vino
    // (el usuario puede haber dicho algo completamente diferente)
    return respuesta.length > 5 ? respuesta : pendiente.preguntaOriginal;
}

module.exports = { detectarAmbiguedad, resolverAmbiguedad };
