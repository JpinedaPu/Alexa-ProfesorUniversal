# ⚠️ PROBLEMA CRÍTICO: Scripts de PowerShell y Symlinks

## El Problema

**TODOS los scripts de PowerShell que usan `Compress-Archive` ROMPEN los symlinks de node_modules.**

Esto causa errores fatales en Lambda:
```
Error: Cannot find module 'ask-sdk-core'
Error: Cannot find module '/var/tslib.js'
```

## Scripts Afectados

1. ❌ `deploy-secreto.ps1` - Eliminado
2. ❌ `deploy-secreto-FIXED.ps1` - Eliminado
3. ❌ `deploy-secreto-FINAL.ps1` - Eliminado
4. ❌ `update-modo-secreto.ps1` - Eliminado
5. ❌ `deploy-interactivo.ps1` - Eliminado
6. ⚠️ `deploy-completo.ps1` - **TIENE EL MISMO PROBLEMA** (usa Compress-Archive)
7. ⚠️ `deploy-modo-secreto-seguro.ps1` - **TIENE EL MISMO PROBLEMA** (usa Compress-Archive)

## ¿Por Qué Falla?

`Compress-Archive` de PowerShell:
- NO preserva symlinks de node_modules
- Convierte symlinks en archivos vacíos o rutas rotas
- Lambda no puede encontrar los módulos requeridos
- El código queda completamente roto

## Solución Correcta

### Opción 1: Solo GitHub Actions (RECOMENDADO)
```bash
# Para código público
git add .
git commit -m "feat: cambios"
git push origin main
```

GitHub Actions:
- ✅ Usa `npm install` oficial
- ✅ Preserva symlinks correctamente
- ✅ Siempre funciona
- ✅ Se activa automáticamente con cambios en `lambda/**`

### Opción 2: Subida Manual por Consola AWS
1. Descarga el código actual de Lambda
2. Agrega los 3 archivos del modo secreto manualmente
3. Actualiza `index.js` manualmente
4. Comprime con 7-Zip o WinRAR (NO con PowerShell)
5. Sube el ZIP por consola AWS

### Opción 3: AWS CLI con Archivos Individuales
```powershell
# Subir solo archivos específicos (sin recomprimir todo)
# NOTA: Esto requiere una implementación diferente
# Lambda no soporta actualización de archivos individuales directamente
```

## Historial de Intentos Fallidos

### Intento 1: `deploy-secreto.ps1`
- Solo subió 3 archivos del modo secreto
- ELIMINÓ todo el código base
- Code Size: 7,163 bytes
- Lambda completamente rota

### Intento 2: `deploy-secreto-FIXED.ps1`
- Falló con rutas largas de Windows (>260 caracteres)
- No completó la compresión

### Intento 3: `deploy-secreto-FINAL.ps1`
- Compress-Archive rompió symlinks
- Error: `Cannot find module '/var/tslib.js'`
- Code Size: 2,640,432 bytes pero no funcional

### Intento 4: `update-modo-secreto.ps1`
- Descargó código actual
- Agregó modo secreto
- Compress-Archive rompió symlinks
- Lambda sin código funcional

### Restauración
Se usó GitHub Actions (cambio mínimo en `lambda/index.js`) para restaurar código funcional.

## Recomendación Final

**NO USAR scripts de PowerShell para deploy de Lambda.**

Usar exclusivamente:
1. **GitHub Actions** para código público
2. **Consola AWS manual** para modo secreto (si es necesario)

Los scripts `deploy-completo.ps1` y `deploy-modo-secreto-seguro.ps1` están en `.gitignore` 
porque aunque tienen advertencias, SIGUEN USANDO `Compress-Archive` y pueden romper Lambda.

## Alternativa Futura

Considerar:
- Usar WSL (Windows Subsystem for Linux) con `zip` nativo
- Usar Docker para crear el ZIP
- Usar herramientas de terceros como 7-Zip desde PowerShell
- Crear un script en Python que use `zipfile` con preservación de symlinks

---

**Fecha**: 2026-03-19  
**Estado**: Scripts de PowerShell NO RECOMENDADOS para deploy de Lambda
