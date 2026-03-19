# Análisis de Scripts en `scripts/`

## Scripts a ELIMINAR ❌

### 1. `deploy-modo-secreto-seguro.ps1` ❌
**Razón**: Usa `Compress-Archive` que rompe symlinks de node_modules.
- Tiene advertencias pero sigue siendo peligroso
- Puede dejar Lambda rota
- Ya documentado en `PROBLEMA-SCRIPTS-POWERSHELL.md`

### 2. `update-modo-secreto.ps1` ❌
**Razón**: Usa `Compress-Archive` que rompe symlinks.
- Mismo problema que el anterior
- Modifica index.js en memoria pero luego rompe el ZIP
- No es confiable

### 3. `README-DEPLOY.md` ❌
**Razón**: Documentación DESACTUALIZADA.
- Recomienda `deploy-completo.ps1` que ya no existe
- La información correcta está en `DOCUMENTACION-UTIL.md`
- Puede confundir al usuario

---

## Scripts a MANTENER ✅

### 1. `configure-lambda-env.ps1` ✅
**Razón**: ÚTIL - Sincroniza variables de entorno.
- Lee `.env` local
- Actualiza variables en Lambda vía AWS CLI
- NO toca código ni node_modules
- Funciona correctamente

**Uso**:
```powershell
.\scripts\configure-lambda-env.ps1 -FunctionName "AlexaProfesorUniversal"
```

### 2. `setup-aws-complete.ps1` ✅
**Razón**: ÚTIL - Setup inicial de infraestructura.
- Configura variables de entorno
- Crea carpeta S3 para audio premium
- Configura permisos IAM
- Solo se ejecuta UNA VEZ al inicio
- NO toca código ni node_modules

**Uso**:
```powershell
.\scripts\setup-aws-complete.ps1 -FunctionName "AlexaProfesorUniversal"
```

---

## Políticas IAM (JSON) - MANTENER ✅

### 1. `bedrock-policy.json` ✅
**Razón**: Política IAM para Claude (Bedrock).
- Necesaria para dar permisos a Lambda
- Documentación de infraestructura

### 2. `s3-audio-premium-policy.json` ✅
**Razón**: Política IAM para audio de ElevenLabs.
- Necesaria para subir audio a S3
- Documentación de infraestructura

### 3. `s3-logos-policy.json` ✅
**Razón**: Política IAM para logos públicos.
- Necesaria para acceso a imágenes
- Documentación de infraestructura

---

## Resumen de Acciones

### ELIMINAR (3 archivos):
1. `scripts/deploy-modo-secreto-seguro.ps1`
2. `scripts/update-modo-secreto.ps1`
3. `scripts/README-DEPLOY.md`

### MANTENER (5 archivos):
1. `scripts/configure-lambda-env.ps1` ✅
2. `scripts/setup-aws-complete.ps1` ✅
3. `scripts/bedrock-policy.json` ✅
4. `scripts/s3-audio-premium-policy.json` ✅
5. `scripts/s3-logos-policy.json` ✅

---

## Flujo de Deploy Recomendado

### Para código público:
```bash
git add .
git commit -m "feat: cambios"
git push origin main
```
✅ GitHub Actions despliega automáticamente

### Para modo secreto:
**Opción 1: Consola AWS (RECOMENDADO)**
1. `git push` y espera 45s
2. Descarga código de Lambda
3. Agrega archivos del modo secreto manualmente
4. Comprime con 7-Zip/WinRAR (NO PowerShell)
5. Sube por consola AWS

**Opción 2: AWS CLI manual**
- Actualizar archivos específicos sin recomprimir
- Requiere implementación diferente (no disponible actualmente)

---

**Fecha**: 2026-03-19
