/**
 * @module imagenesExtra
 * @description Imágenes científicas gratuitas: NASA Images API + Wikimedia Commons.
 * Ambas fuentes corren en paralelo. Sin API key requerida.
 */
const https = require('https');

const SPACE_KEYWORDS = /\b(sun|moon|earth|mars|jupiter|saturn|venus|mercury|uranus|neptune|pluto|galaxy|nebula|asteroid|comet|star|solar|nasa|space|cosmos|universe|milky way|black hole|supernova|planet|orbit|telescope|hubble|apollo|rocket|satellite|iss|astronaut)\b/i;

function httpsGet(url, timeoutMs) {
    return new Promise((resolve) => {
        const req = https.get(url, { timeout: timeoutMs, headers: { 'User-Agent': 'AlexaSkill-ProfesorUniversal/1.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode !== 200) { resolve(null); return; }
                try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
    });
}

const NASA_EXCLUDE = /\b(diagram|illustration|graphic|chart|logo|artwork|animation|render|model|map|infographic|poster|drawing|sketch|icon)\b/i;

async function buscarNASA(keyword, maxResults = 15) {
    const q = encodeURIComponent(keyword);
    const json = await httpsGet(
        `https://images-api.nasa.gov/search?q=${q}&media_type=image&page_size=100`,
        4000
    );
    if (!json || !json.collection || !Array.isArray(json.collection.items)) return [];

    return json.collection.items
        .filter(item => {
            if (!item.links || !item.links[0] || !item.links[0].href) return false;
            const data = item.data && item.data[0];
            if (!data) return false;
            const titulo = data.title || '';
            const desc = data.description || '';
            return !NASA_EXCLUDE.test(titulo) && !NASA_EXCLUDE.test(desc);
        })
        .slice(0, maxResults)
        .map(item => ({
            titulo: (item.data[0].title) || keyword,
            url: item.links[0].href,
            width: 800,
            height: 450,
            fuente: 'NASA'
        }));
}

async function buscarWikimedia(keyword, maxResults = 5) {
    // Para comparaciones "A vs B", buscar solo el primer término
    const keywordClean = keyword.replace(/\s+(vs|versus|contra|and|y)\s+.*/i, '').trim();
    // Palabras clave para filtrar relevancia en el título del archivo
    const keywordWords = keywordClean.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const q = encodeURIComponent(keywordClean);
    const json = await httpsGet(
        `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrsort=relevance&prop=imageinfo&iiprop=url|size|mime|timestamp&iiurlwidth=800&format=json&gsrlimit=40`,
        3000
    );
    if (!json || !json.query || !json.query.pages) return [];

    return Object.values(json.query.pages)
        .filter(p => {
            if (!p.imageinfo || !p.imageinfo[0]) return false;
            const ii = p.imageinfo[0];
            const mime = ii.mime || '';
            if (!mime.startsWith('image/')) return false;
            if (mime === 'image/svg+xml') return false;
            const w = ii.thumbwidth || ii.width || 0;
            const h = ii.thumbheight || ii.height || 0;
            if (w < 200 || h < 100) return false;
            // Filtrar por relevancia: el título del archivo debe contener al menos una palabra del keyword
            const fileTitle = (p.title || '').toLowerCase().replace(/^file:/i, '');
            const isRelevant = keywordWords.length === 0 || keywordWords.some(w => fileTitle.includes(w));
            return isRelevant;
        })
        .slice(0, maxResults)
        .map(p => {
            const ii = p.imageinfo[0];
            return {
                titulo: (p.title || keyword).replace(/^File:/i, '').replace(/\.[^.]+$/, ''),
                url: ii.thumburl || ii.url,
                width: ii.thumbwidth || ii.width || 800,
                height: ii.thumbheight || ii.height || 400,
                fuente: 'Wikimedia'
            };
        });
}

async function buscarImagenesExtra(keyword, maxTotal = 30) {
    if (!keyword || keyword.length < 2) return [];
    const t0 = Date.now();

    const esEspacial = SPACE_KEYWORDS.test(keyword);
    const perFuente = esEspacial ? Math.ceil(maxTotal * 0.6) : maxTotal;

    const [wikimedia, nasa] = await Promise.all([
        buscarWikimedia(keyword, perFuente),
        esEspacial ? buscarNASA(keyword, perFuente) : Promise.resolve([])
    ]);

    const combinadas = esEspacial ? [...nasa, ...wikimedia] : wikimedia;

    console.log(`[IMG-EXTRA] keyword="${keyword}" | nasa=${nasa.length} | wikimedia=${wikimedia.length} | total=${combinadas.length} | esEspacial=${esEspacial} | T+${Date.now() - t0}ms`);
    return combinadas.slice(0, maxTotal);
}

module.exports = { buscarImagenesExtra };
