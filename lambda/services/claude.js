const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const https = require('https');

/**
 * @module claude
 * @description Claude Haiku 4.5 vía Amazon Bedrock (us-east-1).
 * Fallback automático a API directa de Anthropic si Bedrock no está habilitado.
 * @version 7.7.0
 */

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

// Fallback: API directa de Anthropic (mientras se acepta el acuerdo en Bedrock)
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

const HOY = new Date().toISOString().split('T')[0];

// Inference Profile ID de Claude Haiku 4.5 en Bedrock (us-east-1)
// Los modelos recientes requieren inference profile, no model ID directo
const BEDROCK_MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

/**
 * Sanitiza el texto de speech para que Alexa lo pronuncie correctamente.
 * @param {string} text
 * @returns {string}
 */
function sanitizeSpeech(text) {
    if (!text) return text;
    let result = text
        .normalize('NFC')
        .replace(/²/g, ' al cuadrado')
        .replace(/³/g, ' al cubo')
        .replace(/±/g, ' más o menos ')
        .replace(/×/g, ' por ')
        .replace(/÷/g, ' entre ')
        .replace(/≠/g, ' diferente de ')
        .replace(/≤/g, ' menor o igual que ')
        .replace(/≥/g, ' mayor o igual que ')
        .replace(/√/g, ' raíz cuadrada de ')
        .replace(/π/g, ' pi ')
        .replace(/∞/g, ' infinito ')
        .replace(/°/g, ' grados ')
        .replace(/x²/g, 'x al cuadrado')
        .replace(/x³/g, 'x al cubo')
        .replace(/\^2/g, ' al cuadrado')
        .replace(/\^3/g, ' al cubo')
        .replace(/\^(\d+)/g, ' a la $1')
        .replace(/\*/g, ' por ')
        .replace(/–|—/g, ' menos ')
        .replace(/\s{2,}/g, ' ')  // Eliminar espacios múltiples
        .trim();
    
    // Eliminar duplicaciones solo si NO están entre números (para preservar "2 por 3 por 4")
    // Solo elimina patrones como "el el", "para para", "de de", etc.
    result = result.replace(/\b(el|la|los|las|de|del|para|con|sin|en|un|una|y|o|que|se|es|son|fue|fueron|está|están)\s+\1\b/gi, '$1');
    
    return result;
}

const systemContent = `Eres el "Profesor Universal IA". Educa con precisión técnica y MUCHO CARISMA.
FECHA ACTUAL: ${HOY}. Tu entrenamiento puede estar DESACTUALIZADO. Los datos de Wolfram Alpha, Gemini y Wikipedia son EN TIEMPO REAL y reflejan la realidad ACTUAL.

RAZONAMIENTO Y CONTEXTO (MUY IMPORTANTE):
Siempre analiza el historial completo de la conversación para entender pronombres, referencias y preguntas encadenadas. Si el usuario pregunta "¿y cuántos años tiene?" o "¿y el de México?", busca en el historial la última entidad relevante y responde sobre ella.

EJEMPLOS DE SECUENCIAS ENCADENADAS:
Usuario: ¿Quién es el presidente de Estados Unidos?
IA: {"speech": "El presidente actual de Estados Unidos es Donald Trump...", "keyword": "Donald Trump", ...}
Usuario: ¿Cuántos años tiene?
IA: {"speech": "Donald Trump tiene 78 años...", "keyword": "Donald Trump", ...}
Usuario: ¿Y el de México?
IA: {"speech": "La presidenta de México es Claudia Sheinbaum...", "keyword": "Claudia Sheinbaum", ...}

REGLAS CRÍTICAS:
1. PRIORIDAD ABSOLUTA: Wolfram Alpha > Gemini > Wikipedia. Si Wolfram dice X, ESO es correcto aunque tú creas Y. Tu entrenamiento es VIEJO, las fuentes son ACTUALES.
2. PRONUNCIACIÓN: Escribe números científicos con letras para voz Alexa ("1.898 por 10 a la 27" en lugar de "1.898×10²⁷").
3. NO INVENTES: Si ninguna fuente devuelve datos, NO inventes información técnica específica.
4. ESTILO: Sé un profesor apasionado, cálido y fascinante. Usa tono conversacional y entusiasta (máximo 3-4 frases).

REGLAS DE DISEÑO JSON:
1. "speech": Voz de Alexa EN ESPAÑOL. Inyecta emociones SSML (<amazon:emotion name="excited" intensity="medium">). Crea un relato coherente que integre todas las fuentes.
2. "displayTop": Resumen ejecutivo EN ESPAÑOL resaltando datos CLAVE (fechas, nombres, cifras). NO copies el texto de voz; debe ser complemento visual.
3. "displayBottom": Un dato curioso o "Sabías que..." basado en la síntesis de fuentes (EN ESPAÑOL).
4. "keyword": CRÍTICO — debe ser el NOMBRE ESPECÍFICO de la persona, lugar o concepto principal. NO uses términos genéricos.
   - ✅ CORRECTO: "Gustavo Petro", "Claudia Sheinbaum", "Donald Trump", "Torre Eiffel"
   - ❌ INCORRECTO: "presidente de Colombia", "presidente de México", "torre famosa"
   - Si la pregunta es sobre un cargo actual (presidente, primer ministro, etc.), el keyword DEBE ser el nombre de la persona que ocupa ese cargo HOY.
   - Este keyword se usa para buscar imágenes actuales, así que debe ser específico y actual.

JERARQUÍA DE VERDAD:
- Wolfram Alpha > Gemini > Wikipedia. Si hay contradicciones, la fuente más técnica (Wolfram) o reciente (Gemini) manda.
- Si recibes múltiples fuentes, agrúpalas en una única respuesta fluida.

IMPORTANTE: TODO el JSON debe estar en ESPAÑOL.

REGLAS CRÍTICAS DE SALIDA:
1. Responde EXCLUSIVAMENTE con un objeto JSON válido.
2. NO incluyas explicaciones, saludos ni texto fuera del JSON.
3. NO trunques la respuesta. Asegúrate de cerrar siempre la llave final }.
4. Máximo 500 tokens de salida.
5. El campo "speech" debe ser un relato fluido de máximo 4 frases (6 frases si es paso a paso).

Debes responder SIEMPRE en un objeto JSON con estas 4 claves exactas: speech, displayTop, displayBottom, keyword.`;

/**
 * Genera respuesta usando Claude Haiku 4.5 vía Amazon Bedrock.
 * No requiere API key — usa el IAM Role de la Lambda.
 *
 * @param {string} pregunta
 * @param {string} datoWolfram
 * @param {string} datoWikipedia
 * @param {string} datoGemini
 * @param {string} keywordOriginal
 * @param {Array} historial
 * @param {Object} opciones
 */
async function consultarClaude(pregunta, datoWolfram, datoWikipedia, datoGemini, keywordOriginal, historial = [], opciones = {}) {
    const startTime = Date.now();
    const claudeTimeout = opciones.timeout || 3000;

    const fallback = (speech, displayTop) => ({
        speech, displayTop, displayBottom: '', keyword: keywordOriginal
    });

    let contextoExtra = '';
    const hoy = new Date().toISOString().split('T')[0];

    if (datoWolfram && datoWolfram.length > 5)   contextoExtra += `\n[WOLFRAM: "${datoWolfram.slice(0, 400)}"]`;
    if (datoGemini && datoGemini.length > 5)     contextoExtra += `\n[GEMINI: "${datoGemini.slice(0, 300)}"]`;
    if (datoWikipedia && datoWikipedia.length > 5) contextoExtra += `\n[WIKI: "${datoWikipedia.slice(0, 300)}"]`;
    if (!contextoExtra) contextoExtra = '\n[AVISO: No hay datos externos disponibles. Usa tu conocimiento general.]';

    const messages = [
        ...historial.slice(-4).map(h => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.content
        })),
        {
            role: 'user',
            content: `Pregunta: ${pregunta}${contextoExtra}\nFecha actual: ${hoy}`
        }
    ];

    const bedrockPayload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 700,
        temperature: 0.3,
        system: opciones.prompt || systemContent,
        messages
    };

    console.log(`[CLAUDE-BEDROCK] ⏱️ T+0ms | Wolfram: ${datoWolfram ? datoWolfram.length : 0}ch | Wiki: ${datoWikipedia ? datoWikipedia.length : 0}ch`);

    // AbortController para timeout manual
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), claudeTimeout);

    try {
        const command = new InvokeModelCommand({
            modelId: BEDROCK_MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(bedrockPayload)
        });

        const response = await bedrockClient.send(command, { abortSignal: controller.signal });
        clearTimeout(timer);

        const elapsed = Date.now() - startTime;
        const responseBody = JSON.parse(Buffer.from(response.body).toString('utf-8'));

        if (!responseBody.content || !responseBody.content[0] || !responseBody.content[0].text) {
            console.log('[CLAUDE-BEDROCK] ⚠️ Respuesta vacía');
            return fallback('Lo siento, no recibí respuesta de la IA. ¿Repites?', 'Sin respuesta de IA');
        }

        if (responseBody.stop_reason === 'max_tokens') {
            console.log(`[CLAUDE-BEDROCK] ⚠️ Truncado por max_tokens | T+${elapsed}ms`);
            return fallback('La respuesta es muy extensa. Intenta hacer la pregunta más específica.', 'Respuesta demasiado larga');
        }

        const textContent = responseBody.content[0].text.trim();

        // Extraer JSON (puede venir en bloque markdown o directo)
        let jsonStr = null;
        const mdMatch = textContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (mdMatch) {
            jsonStr = mdMatch[1].trim();
        } else {
            const s = textContent.indexOf('{');
            const e = textContent.lastIndexOf('}');
            if (s !== -1 && e > s) jsonStr = textContent.substring(s, e + 1);
        }

        if (!jsonStr) {
            console.log(`[CLAUDE-BEDROCK] ❌ No JSON | T+${elapsed}ms | ${textContent.substring(0, 100)}`);
            return fallback('Tuve un problema con el formato de respuesta. ¿Puedes repetir?', 'Error de formato');
        }

        const enriched = JSON.parse(jsonStr);
        if (!enriched || !enriched.speech) {
            return fallback('No pude generar una respuesta clara. ¿Puedes repetir?', 'Sin respuesta');
        }

        if (enriched.speech) enriched.speech = sanitizeSpeech(enriched.speech);

        console.log(`[CLAUDE-BEDROCK] ✅ OK | T+${elapsed}ms`);
        return enriched;

    } catch (err) {
        clearTimeout(timer);
        const elapsed = Date.now() - startTime;

        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
            console.log(`[CLAUDE-BEDROCK] ❌ TIMEOUT | T+${elapsed}ms | límite: ${claudeTimeout}ms`);
            return fallback('Lo siento, la respuesta tardó demasiado. ¿Puedes repetir?', 'Timeout');
        }
        if (err.name === 'ThrottlingException') {
            console.log(`[CLAUDE-BEDROCK] ❌ THROTTLING | T+${elapsed}ms`);
            return fallback('Estoy recibiendo muchas preguntas a la vez. Intenta de nuevo en unos segundos.', 'Límite de uso alcanzado');
        }
        if (err.name === 'AccessDeniedException') {
            // Acuerdo de Anthropic no aceptado en Bedrock → fallback a API directa
            console.log(`[CLAUDE-BEDROCK] ⚠️ ACCESS DENIED — fallback a API directa | T+${elapsed}ms`);
            if (CLAUDE_API_KEY) {
                return consultarClaudeDirecto(messages, opciones.prompt || systemContent, keywordOriginal, claudeTimeout - elapsed);
            }
            return fallback('Lo siento, mi cerebro digital se distrajo. ¿Repites?', 'Error de acceso');
        }

        console.log(`[CLAUDE-BEDROCK] ❌ ERR | T+${elapsed}ms | ${err.message}`);
        return fallback('No pude conectar con mi base de datos.', 'Error de red');
    }
}

/**
 * Fallback: llama a la API directa de Anthropic.
 * Solo se usa si Bedrock no tiene el acuerdo aceptado aún.
 */
function consultarClaudeDirecto(messages, system, keywordOriginal, timeoutMs) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const fallback = (speech, displayTop) => ({ speech, displayTop, displayBottom: '', keyword: keywordOriginal });

        const payload = JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 700,
            temperature: 0.3,
            system,
            messages
        });

        const req = https.request({
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(payload)
            },
            timeout: Math.max(1000, timeoutMs || 2000),
            agent: keepAliveAgent
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                const elapsed = Date.now() - startTime;
                if (res.statusCode !== 200) {
                    console.log(`[CLAUDE-DIRECT] ❌ HTTP ${res.statusCode} | T+${elapsed}ms`);
                    resolve(fallback('Lo siento, mi cerebro digital se distrajo. ¿Repites?', 'Error de conexión'));
                    return;
                }
                try {
                    const r = JSON.parse(data);
                    const text = r.content && r.content[0] && r.content[0].text ? r.content[0].text.trim() : null;
                    if (!text) { resolve(fallback('No recibí respuesta. ¿Repites?', 'Sin respuesta')); return; }
                    const s = text.indexOf('{'), e = text.lastIndexOf('}');
                    const enriched = (s !== -1 && e > s) ? JSON.parse(text.substring(s, e + 1)) : null;
                    if (!enriched || !enriched.speech) { resolve(fallback('No pude generar respuesta. ¿Repites?', 'Error')); return; }
                    if (enriched.speech) enriched.speech = sanitizeSpeech(enriched.speech);
                    console.log(`[CLAUDE-DIRECT] ✅ OK | T+${elapsed}ms`);
                    resolve(enriched);
                } catch (e2) { resolve(fallback('Error de formato. ¿Repites?', 'Error')); }
            });
        });
        req.on('timeout', () => { req.destroy(); resolve(fallback('Respuesta tardó demasiado. ¿Repites?', 'Timeout')); });
        req.on('error', () => resolve(fallback('No pude conectar. ¿Repites?', 'Error de red')));
        req.write(payload);
        req.end();
    });
}

module.exports = { consultarClaude };
