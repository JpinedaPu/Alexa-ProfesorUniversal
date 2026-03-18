/**
 * @module wikipedia
 * @description Módulo de consulta a Wikipedia REST API para la skill "Profesor Universal IA".
 *   Obtiene resúmenes breves, imágenes thumbnail y títulos desde Wikipedia en inglés.
 *   Optimizado para el límite de 8 segundos de Alexa Lambda (timeout: 1500ms).
 * 
 * @version 7.4.0
 * @author JpinedaPu
 * @see https://en.wikipedia.org/api/rest_v1/
 * 
 * Flujo:
 *   1. Recibe keyword en inglés (traducido por GPT).
 *   2. Consulta /page/summary/ de Wikimedia REST API (una sola llamada HTTP).
 *   3. Retorna { texto, imagen, titulo } o vacío si no hay resultados.
 * 
 * Mejoras documentadas v7.4:
 *   - [DOC] Añadido JSDoc completo con @module, @param, @returns.
 *   - [FIX] Corregido comentario del timeout (decía 1500ms pero el valor real es 2000ms).
 */
const https = require('https');

/**
 * Consulta la API REST de Wikipedia para obtener un resumen del tema.
 * 
 * @param {string} keyword - Término de búsqueda en inglés (viene de obtenerKeyword en gpt.js).
 * @returns {Promise<{texto: string, imagen: string, titulo: string}>}
 *   - texto: Extracto de hasta 250 caracteres del artículo.
 *   - imagen: URL del thumbnail del artículo (o "" si no hay).
 *   - titulo: Título canónico del artículo en Wikipedia.
 */
async function consultarWikipedia(keyword) {
    if (!keyword) return { texto: "", imagen: "", titulo: "" };
    // Para comparaciones "A vs B", buscar solo el primer término
    const keywordClean = keyword.replace(/\s+(vs|versus|contra|and|y)\s+.*/i, '').trim();
    const startTime = Date.now();
    return new Promise((resolve) => {
        const tituloEncoded = encodeURIComponent(keywordClean.replace(/ /g, '_'));
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|categories&exintro&titles=${tituloEncoded}&format=json&pithumbsize=500&redirects=1&formatversion=2`;
        const options = {
            headers: {
                'User-Agent': 'AlexaSkill-ProfesorUniversal/1.0 (github.com/JpinedaPu)',
                'Accept': 'application/json'
            },
            timeout: 3200 // Sincronizado para permitir los 3.0s del handler
        };
        console.log(`[WIKI] ⏱️ T+0ms | Consultando: "${keyword}"`);
        const req = https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const elapsed = Date.now() - startTime;
                if (res.statusCode !== 200) {
                    console.log(`[WIKI] ❌ ERR_API_${res.statusCode} | T+${elapsed}ms`);
                    return resolve({ texto: "", imagen: "", titulo: "" });
                }
                try {
                    const json = JSON.parse(data);
                    const page = json.query && json.query.pages && json.query.pages[0];
                    if (!page || page.missing) {
                        console.log(`[WIKI] ⚠️ NOT_FOUND | T+${elapsed}ms | "${keyword}"`);
                        return resolve({ texto: "", imagen: "", titulo: "" });
                    }
                    // Detectar desambiguación por categorías
                    if (page.categories && page.categories.some(cat => /disambiguation/i.test(cat.title))) {
                        console.log(`[WIKI] ⚠️ DISAMBIG | T+${elapsed}ms | Omitiendo`);
                        return resolve({ texto: "", imagen: "", titulo: "" });
                    }
                    let extracto = page.extract || "";
                    let imagen = page.thumbnail && page.thumbnail.source ? page.thumbnail.source : "";
                    const titulo = page.title || keyword;
                    // Validar extracto útil
                    if (!extracto || extracto.length < 20) {
                        console.log(`[WIKI] ⚠️ Extracto vacío o muy corto | T+${elapsed}ms`);
                        return resolve({ texto: "", imagen: "", titulo });
                    }
                    // Limitar extracto a 800 caracteres
                    if (extracto.length > 800) {
                        extracto = extracto.substring(0, 800) + "...";
                    }
                    // Validar imagen suficientemente grande (más seguro)
                    if (page.thumbnail && (page.thumbnail.width || 0) < 200) {
                        imagen = "";
                    }
                    console.log(`[WIKI] ✅ OK | T+${elapsed}ms | ${extracto.length} chars`);
                    resolve({ texto: extracto, imagen, titulo });
                } catch (e) {
                    console.log(`[WIKI] ❌ ERR_PARSE | T+${elapsed}ms | ${e.message}`);
                    resolve({ texto: "", imagen: "", titulo: "" });
                }
            });
        });
        req.on('timeout', () => {
            console.log(`[WIKI] ❌ ERR_TIMEOUT | T+${Date.now() - startTime}ms | Límite: 3200ms`);
            req.destroy();
            resolve({ texto: "", imagen: "", titulo: "" });
        });
        req.on('error', (e) => {
            console.log(`[WIKI] ❌ ERR_NET | T+${Date.now() - startTime}ms | ${e.message}`);
            resolve({ texto: "", imagen: "", titulo: "" });
        });
    });
}

module.exports = { consultarWikipedia };
