# 📚 Documentación Útil del Proyecto

## Scripts Útiles (en `scripts/`)

### ⚠️ ADVERTENCIA CRÍTICA

**TODOS los scripts de PowerShell que usan `Compress-Archive` ROMPEN los symlinks de node_modules.**

Esto causa errores fatales en Lambda como:
- `Error: Cannot find module 'ask-sdk-core'`
- `Error: Cannot find module '/var/tslib.js'`

**Scripts afectados** (NO USAR):
- ❌ `deploy-completo.ps1` - Usa Compress-Archive
- ❌ `deploy-modo-secreto-seguro.ps1` - Usa Compress-Archive
- ❌ Todos los scripts anteriores eliminados

Ver `PROBLEMA-SCRIPTS-POWERSHELL.md` para detalles completos.

---

### Flujo de Deploy RECOMENDADO

#### Para código público:
```bash
git add .
git commit -m "feat: descripción"
git push origin main
```
✅ GitHub Actions se encarga automáticamente del deploy a Lambda.

#### Para modo secreto:
**Opción 1: Consola AWS (RECOMENDADO)**
1. Ejecuta `git push` y espera 45 segundos
2. Descarga el código de Lambda desde la consola AWS
3. Agrega los 3 archivos del modo secreto manualmente
4. Actualiza `index.js` manualmente
5. Comprime con 7-Zip o WinRAR (NO PowerShell)
6. Sube el ZIP por consola AWS

**Opción 2: Script con advertencia**
```powershell
.\scripts\deploy-modo-secreto-seguro.ps1
```
⚠️ Este script ADVIERTE que puede romper symlinks y pide confirmación.

---

### Scripts Útiles (que SÍ funcionan)

### 1. `configure-lambda-env.ps1`
**Uso**: Sincronizar variables de entorno
```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

### 2. `setup-aws-complete.ps1`
**Uso**: Setup inicial AWS (solo una vez)
```powershell
.\scripts\setup-aws-complete.ps1
```

### 3. `README-DEPLOY.md`
Documentación de scripts (DESACTUALIZADA - ver este archivo)

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

## Archivos Protegidos (.gitignore)

### Modo Secreto
- `lambda/handlers/SecretRouteIntentHandler.js`
- `lambda/handlers/artesLiberalesRoutes.js`
- `lambda/services/elevenlabs.js`
- `scripts/update-modo-secreto.ps1`
- `scripts/deploy-completo.ps1`

### Documentación Temporal
- Todos los archivos `*-ANALISIS.md`
- Todos los archivos `LIMPIEZA-*.md`
- Todos los archivos `PROBLEMA-*.md` (excepto `PROBLEMA-SCRIPTS-POWERSHELL.md` - útil)
- Todos los archivos `DEPLOY-*.md`
- Todos los archivos `RESUMEN-*.md`

---

**Última actualización**: 2026-03-19
