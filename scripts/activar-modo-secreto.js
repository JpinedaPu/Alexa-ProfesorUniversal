#!/usr/bin/env node
/**
 * activar-modo-secreto.js
 * 
 * Script LOCAL para activar/desactivar el modo de las 7 Artes Liberales.
 * NO SE SUBE A GITHUB - Solo para uso local.
 * 
 * Uso:
 *   node scripts/activar-modo-secreto.js on   → Activa el modo secreto
 *   node scripts/activar-modo-secreto.js off  → Desactiva el modo secreto
 */

const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '../lambda/index.js');
const BACKUP_PATH = path.join(__dirname, '../lambda/index.js.backup');

const IMPORT_SECRETO = `const { SecretRouteIntentHandler, ExplorarArteIntentHandler } = require('./handlers/SecretRouteIntentHandler');`;

const HANDLERS_SECRETO = `        SecretRouteIntentHandler,
        ExplorarArteIntentHandler,`;

function activarModoSecreto() {
  console.log('🔐 Activando modo secreto de las 7 Artes Liberales...');
  
  // Backup del index.js original
  const contenido = fs.readFileSync(INDEX_PATH, 'utf8');
  fs.writeFileSync(BACKUP_PATH, contenido, 'utf8');
  
  // Agregar import
  let nuevoContenido = contenido.replace(
    /const { RepeatLastQuestionIntentHandler } = require\('\.\/handlers\/RepeatLastQuestionIntentHandler'\);/,
    `const { RepeatLastQuestionIntentHandler } = require('./handlers/RepeatLastQuestionIntentHandler');\n${IMPORT_SECRETO}`
  );
  
  // Agregar handlers
  nuevoContenido = nuevoContenido.replace(
    /NavigateHomeIntentHandler,\n/,
    `NavigateHomeIntentHandler,\n${HANDLERS_SECRETO}\n`
  );
  
  fs.writeFileSync(INDEX_PATH, nuevoContenido, 'utf8');
  
  console.log('✅ Modo secreto ACTIVADO');
  console.log('📝 Backup guardado en: lambda/index.js.backup');
  console.log('⚠️  IMPORTANTE: NO hacer commit de estos cambios');
  console.log('');
  console.log('Para desplegar:');
  console.log('  1. Subir manualmente a Lambda (no usar GitHub Actions)');
  console.log('  2. Configurar ELEVENLABS_API_KEY en variables de entorno');
  console.log('  3. Agregar intents en Alexa Developer Console manualmente');
}

function desactivarModoSecreto() {
  console.log('🔓 Desactivando modo secreto...');
  
  if (!fs.existsSync(BACKUP_PATH)) {
    console.error('❌ No se encontró backup. Restaura manualmente desde Git.');
    process.exit(1);
  }
  
  const backup = fs.readFileSync(BACKUP_PATH, 'utf8');
  fs.writeFileSync(INDEX_PATH, backup, 'utf8');
  fs.unlinkSync(BACKUP_PATH);
  
  console.log('✅ Modo secreto DESACTIVADO');
  console.log('✅ index.js restaurado al estado original');
  console.log('✅ Ahora puedes hacer commit sin exponer el modo secreto');
}

// Main
const comando = process.argv[2];

if (comando === 'on') {
  activarModoSecreto();
} else if (comando === 'off') {
  desactivarModoSecreto();
} else {
  console.log('Uso:');
  console.log('  node scripts/activar-modo-secreto.js on   → Activa el modo secreto');
  console.log('  node scripts/activar-modo-secreto.js off  → Desactiva el modo secreto');
  process.exit(1);
}
