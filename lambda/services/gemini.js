const https = require('https');
const { logStep } = require('../utils/logger');

if (process.env.NODE_ENV !== 'production' && !process.env.LAMBDA_TASK_ROOT) {
    try { require('dotenv').config(); } catch (e) {}
}

const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 60000, timeout: 10000 });

/**
 * Consulta a Google Gemini 3.1 Flash Lite Preview.
 * Cutoff: febrero 2025. Sin thinking tokens → respuesta rápida (~1.3s).
 * @param {string} query
 * @returns {Promise<{texto: string, fuente: string}>}
 */
async function consultarGemini(query) {
    if (!query || query.length < 2) return { texto: '', fuente: '' };

    return new Promise((resolve) => {
        const apiKey = process.env.GEMINI_API_KEY || '';

        if (!apiKey) {
            console.log('[GEMINI] ⚠️ Sin API key, omitiendo Gemini');
            resolve({ texto: '', fuente: '' });
            return;
        }

        const startTime = Date.now();

        const payload = JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `Eres un experto. Responde de forma muy concisa (máximo 2 párrafos) con datos actualizados (tienes conocimiento hasta febrero 2025): ${query}` }] }],
            generationConfig: { maxOutputTokens: 600, temperature: 0.2 }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
            timeout: 5000,
            agent: keepAliveAgent
        };

        console.log(`[GEMINI] ⏱️ T+0ms | Consultando Gemini 2.5 Flash-Lite para: "${query}"`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const elapsed = Date.now() - startTime;

                if (res.statusCode !== 200) {
                    console.log(`[GEMINI] ❌ ERR_API_${res.statusCode} | T+${elapsed}ms | ${data.substring(0, 100)}`);
                    if (res.statusCode === 400 && data.includes('API key not valid'))
                        console.log('[GEMINI] ⚠️ Falta configurar la API Key de Gemini en process.env.GEMINI_API_KEY');
                    resolve({ texto: '', fuente: '' });
                    return;
                }

                try {
                    const response = JSON.parse(data);
                    if (!response.candidates || !response.candidates[0] || !response.candidates[0].content) {
                        resolve({ texto: '', fuente: '' });
                        return;
                    }
                    const textoGenerado = response.candidates[0].content.parts[0].text.trim();
                    if (textoGenerado === 'NADA' || textoGenerado.toLowerCase().includes('no encontr') || textoGenerado.length < 5) {
                        console.log(`[GEMINI] ⚠️ Sin datos relevantes | T+${elapsed}ms`);
                        resolve({ texto: '', fuente: '' });
                        return;
                    }
                    console.log(`[GEMINI] ✅ OK | T+${elapsed}ms | ${textoGenerado.length} chars`);
                    resolve({ texto: textoGenerado, fuente: 'Gemini 2.5 Flash-Lite' });
                } catch (e) {
                    console.log(`[GEMINI] ❌ ERR_PARSE | T+${elapsed}ms | ${e.message}`);
                    resolve({ texto: '', fuente: '' });
                }
            });
        });

        req.on('timeout', () => {
            console.log(`[GEMINI] ❌ ERR_TIMEOUT | T+${Date.now() - startTime}ms`);
            req.destroy();
            resolve({ texto: '', fuente: '' });
        });
        req.on('error', (e) => {
            console.log(`[GEMINI] ❌ ERR_NET | T+${Date.now() - startTime}ms | ${e.message}`);
            resolve({ texto: '', fuente: '' });
        });

        req.write(payload);
        req.end();
    });
}

module.exports = { consultarGemini };
