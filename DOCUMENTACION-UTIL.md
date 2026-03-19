# 📚 Documentación Útil del Proyecto

## Scripts Útiles (en `scripts/`)

### 1. `deploy-completo.ps1` ⭐ PRINCIPAL
**Uso**: Deploy completo (público + modo secreto)
```powershell
.\scripts\deploy-completo.ps1
```
- Fase 1: Git push → GitHub Actions despliega código público
- Espera 45s para que GitHub Actions termine
- Fase 2: AWS CLI descarga código actual y agrega modo secreto
- Preserva node_modules correctamente (sin romper symlinks)

**IMPORTANTE**: Este es el ÚNICO script recomendado para deploy con modo secreto.
Los scripts anteriores (`deploy-secreto.ps1`, `deploy-interactivo.ps1`) fueron eliminados
porque `Compress-Archive` de PowerShell rompe los symlinks de node_modules.

### 2. `configure-lambda-env.ps1`
**Uso**: Sincronizar variables de entorno
```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

### 3. `setup-aws-complete.ps1`
**Uso**: Setup inicial AWS (solo una vez)
```powershell
.\scripts\setup-aws-complete.ps1
```

### 4. `README-DEPLOY.md`
Documentación completa de los scripts de deploy

---

## Flujo de Deploy Recomendado

### Para código público solamente:
```bash
git add .
git commit -m "feat: descripción del cambio"
git push origin main
```
GitHub Actions se encarga automáticamente del deploy a Lambda.

### Para código público + modo secreto:
```powershell
.\scripts\deploy-completo.ps1
```
Este script hace todo: commit, push, espera, y agrega modo secreto.

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
- Todos los archivos `PROBLEMA-*.md`
- Todos los archivos `DEPLOY-*.md`
- Todos los archivos `RESUMEN-*.md`

---

**Última actualización**: 2026-03-19
