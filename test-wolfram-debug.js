/**
 * Test de debugging para Wolfram Alpha
 * Investiga por qué "square root of 144" tarda tanto
 */
const https = require('https');

// Leer .env manualmente
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, 'lambda', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim();
        }
    });
}

const WOLFRAM_APP_ID = process.env.WOLFRAM_APP_ID;

async function testWolfram(keyword, scantimeout = 2, podtimeout = 2) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const q = encodeURIComponent(keyword);
        
        // URL con parámetros actuales
        const url = `https://api.wolframalpha.com/v2/query?appid=${WOLFRAM_APP_ID}&input=${q}&output=json&format=image,plaintext&mag=2&width=800&units=metric&scantimeout=${scantimeout}&podtimeout=${podtimeout}&formattimeout=1.5&parsetimeout=1.5`;
        
        console.log(`\n[TEST] Consultando: "${keyword}"`);
        console.log(`[TEST] Timeouts: scan=${scantimeout}s, pod=${podtimeout}s`);
        console.log(`[TEST] URL: ${url.substring(0, 150)}...`);
        
        const req = https.get(url, { timeout: 10000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const elapsed = Date.now() - startTime;
                console.log(`[TEST] ✅ Respuesta recibida en ${elapsed}ms`);
                console.log(`[TEST] Status: ${res.statusCode}`);
                console.log(`[TEST] Content-Length: ${data.length} bytes`);
                
                try {
                    const json = JSON.parse(data);
                    
                    if (!json.queryresult) {
                        console.log('[TEST] ❌ No hay queryresult');
                        return resolve({ elapsed, error: 'No queryresult' });
                    }
                    
                    const qr = json.queryresult;
                    console.log(`[TEST] Success: ${qr.success}`);
                    console.log(`[TEST] Error: ${qr.error}`);
                    console.log(`[TEST] Numpods: ${qr.numpods}`);
                    console.log(`[TEST] Datatypes: ${qr.datatypes}`);
                    console.log(`[TEST] Timing: ${qr.timing}s`);
                    
                    if (qr.pods && Array.isArray(qr.pods)) {
                        console.log(`\n[TEST] === PODS (${qr.pods.length}) ===`);
                        qr.pods.forEach((pod, i) => {
                            console.log(`\n[POD ${i+1}] ${pod.title}`);
                            console.log(`  - ID: ${pod.id}`);
                            console.log(`  - Primary: ${pod.primary}`);
                            console.log(`  - Subpods: ${pod.subpods?.length || 0}`);
                            console.log(`  - Scanner: ${pod.scanner}`);
                            
                            if (pod.subpods) {
                                pod.subpods.forEach((sub, j) => {
                                    console.log(`    [Subpod ${j+1}]`);
                                    console.log(`      - Plaintext: ${sub.plaintext?.substring(0, 80) || 'N/A'}`);
                                    console.log(`      - Image: ${sub.img?.src ? 'YES' : 'NO'} (${sub.img?.width}x${sub.img?.height})`);
                                });
                            }
                            
                            if (pod.states) {
                                console.log(`  - States: ${pod.states.length}`);
                                pod.states.forEach(state => {
                                    console.log(`    * ${state.name} (input: ${state.input})`);
                                });
                            }
                        });
                    }
                    
                    resolve({ 
                        elapsed, 
                        success: qr.success, 
                        numpods: qr.numpods,
                        timing: qr.timing,
                        pods: qr.pods?.map(p => ({
                            title: p.title,
                            id: p.id,
                            scanner: p.scanner,
                            subpods: p.subpods?.length || 0
                        }))
                    });
                    
                } catch (e) {
                    console.log(`[TEST] ❌ Error parsing: ${e.message}`);
                    resolve({ elapsed, error: e.message });
                }
            });
        });
        
        req.on('timeout', () => {
            console.log(`[TEST] ❌ TIMEOUT después de ${Date.now() - startTime}ms`);
            req.destroy();
            resolve({ elapsed: Date.now() - startTime, error: 'TIMEOUT' });
        });
        
        req.on('error', (e) => {
            console.log(`[TEST] ❌ ERROR: ${e.message}`);
            resolve({ elapsed: Date.now() - startTime, error: e.message });
        });
    });
}

async function runTests() {
    console.log('='.repeat(80));
    console.log('WOLFRAM ALPHA DEBUG TEST');
    console.log('='.repeat(80));
    
    // Test 1: Consulta simple con timeouts actuales
    const test1 = await testWolfram('square root of 144', 2, 2);
    console.log(`\n[RESULTADO 1] Elapsed: ${test1.elapsed}ms, Success: ${test1.success}`);
    
    // Test 2: Consulta simple con timeouts reducidos
    console.log('\n' + '='.repeat(80));
    const test2 = await testWolfram('square root of 144', 1, 1);
    console.log(`\n[RESULTADO 2] Elapsed: ${test2.elapsed}ms, Success: ${test2.success}`);
    
    // Test 3: Consulta simple con timeouts mínimos
    console.log('\n' + '='.repeat(80));
    const test3 = await testWolfram('square root of 144', 0.5, 0.5);
    console.log(`\n[RESULTADO 3] Elapsed: ${test3.elapsed}ms, Success: ${test3.success}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('TESTS COMPLETADOS');
    console.log('='.repeat(80));
}

runTests().catch(console.error);
