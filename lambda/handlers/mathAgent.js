/**
 * mathAgent.js
 * Agente especializado en generar pasos matemáticos usando Claude
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const MODEL_HAIKU = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';

/**
 * Genera pasos matemáticos detallados usando Claude
 * @param {string} pregunta - Pregunta matemática original
 * @param {string} resultado - Resultado final de Wolfram
 * @param {string} tipo - Tipo de problema (derivada|integral|ecuacion|etc)
 * @returns {Promise<Array<string>>} Array de pasos explicados
 */
async function generarPasosMatematicos(pregunta, resultado, tipo) {
  const prompts = {
    derivada: `Explica paso a paso cómo calcular esta derivada:
${pregunta}
Resultado final: ${resultado}

Genera exactamente 3-5 pasos numerados. Cada paso debe ser claro y conciso (máximo 40 palabras por paso).
Formato: 
1. [paso]
2. [paso]
3. [paso]`,

    integral: `Explica paso a paso cómo resolver esta integral:
${pregunta}
Resultado final: ${resultado}

Genera exactamente 3-5 pasos numerados. Cada paso debe ser claro y conciso (máximo 40 palabras por paso).`,

    ecuacion: `Explica paso a paso cómo resolver esta ecuación:
${pregunta}
Resultado final: ${resultado}

Genera exactamente 3-5 pasos numerados. Cada paso debe ser claro y conciso (máximo 40 palabras por paso).`,

    limite: `Explica paso a paso cómo calcular este límite:
${pregunta}
Resultado final: ${resultado}

Genera exactamente 3-5 pasos numerados. Cada paso debe ser claro y conciso (máximo 40 palabras por paso).`,

    aritmetica: `Explica paso a paso cómo resolver:
${pregunta}
Resultado final: ${resultado}

Genera exactamente 2-4 pasos numerados. Cada paso debe ser claro y conciso (máximo 30 palabras por paso).`,

    otro: `Explica paso a paso la solución de:
${pregunta}
Resultado final: ${resultado}

Genera exactamente 3-5 pasos numerados. Cada paso debe ser claro y conciso (máximo 40 palabras por paso).`
  };

  const prompt = prompts[tipo] || prompts.otro;

  try {
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 500,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    };

    const cmd = new InvokeModelCommand({
      modelId: MODEL_HAIKU,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });

    const res = await bedrockClient.send(cmd);
    const body = JSON.parse(Buffer.from(res.body).toString('utf-8'));
    const texto = body.content?.[0]?.text?.trim() || '';

    // Parsear pasos numerados
    const pasos = texto
      .split(/\n/)
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(paso => paso.length > 10);

    console.log(`[MATH-AGENT] Generados ${pasos.length} pasos para tipo: ${tipo}`);
    return pasos;

  } catch (error) {
    console.error('[MATH-AGENT] Error:', error.message);
    return [];
  }
}

module.exports = { generarPasosMatematicos };
