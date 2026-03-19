# 📚 Documentación Útil del Proyecto

## Scripts Útiles (en `scripts/`)

### Scripts Funcionales ✅

#### 1. `configure-lambda-env.ps1`
**Uso**: Sincronizar variables de entorno desde `.env` local a Lambda
```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```
- Lee archivo `.env` local
- Actualiza variables en Lambda vía AWS CLI
- NO toca código ni node_modules
- Seguro y confiable

#### 2. `setup-aws-complete.ps1`
**Uso**: Setup inicial de infraestructura AWS (solo una vez)
```powershell
.\scripts\setup-aws-complete.ps1 -FunctionName "AlexaProfesorUniversal"
```
- Configura variables de entorno
- Crea carpeta S3 para audio premium
- Configura permisos IAM
- Solo se ejecuta al inicio del proyecto

---

### Políticas IAM (JSON)

- `bedrock-policy.json` - Permisos para Claude (Bedrock)
- `s3-audio-premium-policy.json` - Permisos para audio de ElevenLabs
- `s3-logos-policy.json` - Permisos para logos públicos

---

## Flujo de Deploy RECOMENDADO

### Para código público:
```bash
git add .
git commit -m "feat: descripción"
git push origin main
```
✅ GitHub Actions se encarga automáticamente del deploy a Lambda.

### Para modo secreto:
**Opción 1: Consola AWS (RECOMENDADO)**
1. Ejecuta `git push` y espera 45 segundos
2. Descarga el código de Lambda desde la consola AWS
3. Agrega los 3 archivos del modo secreto manualmente
4. Actualiza `index.js` manualmente
5. Comprime con 7-Zip o WinRAR (NO PowerShell)
6. Sube el ZIP por consola AWS

**⚠️ IMPORTANTE**: NO usar scripts de PowerShell para deploy de código.
Ver `PROBLEMA-SCRIPTS-POWERSHELL.md` para detalles.

---

## Políticas IAM (en `scripts/`)

- `bedrock-policy.json` - Permisos para Claude (Bedrock)
- `s3-audio-premium-policy.json` - Permisos para audio de ElevenLabs
- `s3-logos-policy.json` - Permisos para logos públicos

---

## Documentación Oficial

- `README.md` - Documentación principal del proyecto
- `CODE_OF_CONDUCT.md` - Código de conducta
- `CONTRIBUTING.md` - Guía de contribución
- `SECURITY.md` - Política de seguridad
- `LICENSE` - Licencia MIT

---

## Documentación Técnica

- `docs/RUTAS-IMPLEMENTADAS.md` - Documentación completa de todas las rutas
- `PROBLEMA-SCRIPTS-POWERSHELL.md` - Problema con Compress-Archive y symlinks
- `LIMPIEZA-PROYECTO-ANALISIS.md` - Análisis de limpieza del proyecto

---

## Archivos Protegidos (.gitignore)

### Modo Secreto
- `lambda/handlers/SecretRouteIntentHandler.js`
- `lambda/handlers/artesLiberalesRoutes.js`
- `lambda/services/elevenlabs.js`

### Documentación Temporal
- Todos los archivos `*-ANALISIS.md` (excepto `LIMPIEZA-PROYECTO-ANALISIS.md`)
- Todos los archivos `LIMPIEZA-*.md`
- Todos los archivos `PROBLEMA-*.md` (excepto `PROBLEMA-SCRIPTS-POWERSHELL.md`)
- Todos los archivos `DEPLOY-*.md`
- Todos los archivos `RESUMEN-*.md`

---

**Última actualización**: 2026-03-19

