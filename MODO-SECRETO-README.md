# 🔐 Modo Secreto - 7 Artes Liberales

**IMPORTANTE:** Este modo es PRIVADO y NO se sube a GitHub.

## ✅ Archivos protegidos en .gitignore

- `lambda/services/elevenlabs.js`
- `lambda/handlers/SecretRouteIntentHandler.js`
- `lambda/handlers/artesLiberalesRoutes.js`
- `skill-package/interactionModels/custom/es-ES-artes-liberales.json`
- `docs/7-ARTES-LIBERALES.md`
- `scripts/activar-modo-secreto.js`
- `lambda/index.js.backup`

## 🚀 Activación

### Paso 1: Activar localmente

```bash
node scripts/activar-modo-secreto.js on
```

Esto modifica `lambda/index.js` para incluir los handlers secretos.

### Paso 2: Desplegar MANUALMENTE a Lambda

**NO usar GitHub Actions** - Desplegar directamente:

```bash
cd lambda
zip -r ../lambda_deploy.zip .
aws lambda update-function-code \
  --function-name AlexaProfesorUniversal \
  --zip-file fileb://../lambda_deploy.zip \
  --region us-east-1
```

### Paso 3: Configurar variable de entorno

En AWS Lambda Console:

```
ELEVENLABS_API_KEY = tu_api_key_aqui
```

### Paso 4: Agregar intents en Alexa Developer Console

Copiar el contenido de `skill-package/interactionModels/custom/es-ES-artes-liberales.json` 
y pegarlo en el JSON Editor de Alexa Developer Console.

## 🔓 Desactivación

Antes de hacer commit a GitHub:

```bash
node scripts/activar-modo-secreto.js off
```

Esto restaura `lambda/index.js` al estado original.

## 📖 Uso

Ver documentación completa en: `docs/7-ARTES-LIBERALES.md`

**Palabra secreta:** "Boaz"

```
"Alexa, pregunta a profesor universal Boaz"
"Alexa, pregunta a profesor universal Boaz qué es un silogismo"
```

## ⚠️ NUNCA hacer:

- ❌ Commit con modo secreto activado
- ❌ Push a GitHub con archivos del modo secreto
- ❌ Usar GitHub Actions para desplegar con modo secreto
- ❌ Compartir ELEVENLABS_API_KEY

## ✅ Workflow seguro:

1. `git pull` (asegurar que tienes la última versión)
2. `node scripts/activar-modo-secreto.js on`
3. Desarrollar/probar localmente
4. Desplegar manualmente a Lambda
5. `node scripts/activar-modo-secreto.js off`
6. `git add .`
7. `git commit -m "feat: mejoras generales"`
8. `git push origin main`
