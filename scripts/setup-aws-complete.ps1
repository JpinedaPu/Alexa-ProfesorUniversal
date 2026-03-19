# ============================================================================
# Script PowerShell para configurar AWS completo para Modo Secreto
# ============================================================================
# Uso: .\setup-aws-complete.ps1 -FunctionName "AlexaProfesorUniversal"

param(
    [Parameter(Mandatory=$true)]
    [string]$FunctionName,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$BucketName = "alexa-profesor-universal-cache-us-east-1"
)

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Cyan "============================================"
Write-ColorOutput Cyan "  Setup AWS - Modo Secreto 7 Artes Liberales"
Write-ColorOutput Cyan "============================================"
Write-ColorOutput Yellow "`nFunción Lambda: $FunctionName"
Write-ColorOutput Yellow "Región: $Region"
Write-ColorOutput Yellow "Bucket S3: $BucketName`n"

# ============================================================================
# PASO 1: Verificar AWS CLI
# ============================================================================
Write-ColorOutput Yellow "[1/5] Verificando AWS CLI..."
try {
    $awsVersion = aws --version 2>&1
    Write-ColorOutput Green "✓ AWS CLI instalado: $awsVersion"
} catch {
    Write-ColorOutput Red "✗ AWS CLI no está instalado"
    Write-ColorOutput Yellow "Instala AWS CLI desde: https://aws.amazon.com/cli/"
    exit 1
}

# ============================================================================
# PASO 2: Configurar Variables de Entorno en Lambda
# ============================================================================
Write-ColorOutput Yellow "`n[2/5] Configurando variables de entorno en Lambda..."

$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) "lambda\.env"
if (-not (Test-Path $envFile)) {
    Write-ColorOutput Red "✗ Archivo .env no encontrado en $envFile"
    exit 1
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.+)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

# Verificar variables críticas
$requiredVars = @("OPENAI_API_KEY", "WOLFRAM_APP_ID", "GEMINI_API_KEY", "ELEVENLABS_API_KEY")
$missingVars = @()

foreach ($var in $requiredVars) {
    if (-not $envVars.ContainsKey($var) -or [string]::IsNullOrWhiteSpace($envVars[$var])) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-ColorOutput Red "✗ Faltan variables en .env:"
    $missingVars | ForEach-Object { Write-ColorOutput Red "  - $_" }
    exit 1
}

$envJson = @{
    Variables = @{
        OPENAI_API_KEY = $envVars["OPENAI_API_KEY"]
        WOLFRAM_APP_ID = $envVars["WOLFRAM_APP_ID"]
        GEMINI_API_KEY = $envVars["GEMINI_API_KEY"]
        ELEVENLABS_API_KEY = $envVars["ELEVENLABS_API_KEY"]
        NODE_ENV = "production"
    }
} | ConvertTo-Json -Compress

try {
    aws lambda update-function-configuration `
        --function-name $FunctionName `
        --environment $envJson `
        --region $Region | Out-Null
    
    Write-ColorOutput Green "✓ Variables de entorno configuradas"
} catch {
    Write-ColorOutput Red "✗ Error: $_"
    exit 1
}

# ============================================================================
# PASO 3: Crear carpeta audio/premium en S3
# ============================================================================
Write-ColorOutput Yellow "`n[3/5] Creando carpeta audio/premium en S3..."

try {
    # Crear un archivo vacío para inicializar la carpeta
    $tempFile = [System.IO.Path]::GetTempFileName()
    "" | Out-File -FilePath $tempFile -Encoding ASCII
    
    aws s3 cp $tempFile "s3://$BucketName/audio/premium/.keep" --region $Region | Out-Null
    Remove-Item $tempFile
    
    Write-ColorOutput Green "✓ Carpeta audio/premium creada"
} catch {
    Write-ColorOutput Yellow "⚠ Carpeta ya existe o error menor (continuando...)"
}

# ============================================================================
# PASO 4: Obtener ARN del rol Lambda
# ============================================================================
Write-ColorOutput Yellow "`n[4/5] Obteniendo rol IAM de Lambda..."

try {
    $lambdaConfig = aws lambda get-function-configuration `
        --function-name $FunctionName `
        --region $Region | ConvertFrom-Json
    
    $roleArn = $lambdaConfig.Role
    $roleName = $roleArn.Split('/')[-1]
    
    Write-ColorOutput Green "✓ Rol Lambda: $roleName"
} catch {
    Write-ColorOutput Red "✗ Error al obtener configuración de Lambda"
    exit 1
}

# ============================================================================
# PASO 5: Agregar permisos S3 al rol Lambda
# ============================================================================
Write-ColorOutput Yellow "`n[5/5] Configurando permisos S3 para audio premium..."

$policyDocument = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAudioPremiumUpload",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::$BucketName/audio/premium/*"
    }
  ]
}
"@

$policyName = "AlexaProfesorUniversal-AudioPremium-Policy"

try {
    # Intentar crear la política inline
    $policyFile = [System.IO.Path]::GetTempFileName()
    $policyDocument | Out-File -FilePath $policyFile -Encoding ASCII
    
    aws iam put-role-policy `
        --role-name $roleName `
        --policy-name $policyName `
        --policy-document "file://$policyFile" | Out-Null
    
    Remove-Item $policyFile
    
    Write-ColorOutput Green "✓ Permisos S3 configurados"
} catch {
    Write-ColorOutput Red "✗ Error: $_"
    Write-ColorOutput Yellow "⚠ Puedes configurar los permisos manualmente en la consola AWS"
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================
Write-ColorOutput Cyan "`n============================================"
Write-ColorOutput Cyan "  Configuracion AWS Completada"
Write-ColorOutput Cyan "============================================"
Write-ColorOutput Green "`nVariables de entorno configuradas en Lambda"
Write-ColorOutput Green "Carpeta audio/premium creada en S3"
Write-ColorOutput Green "Permisos IAM configurados"

Write-ColorOutput Yellow "`nProximos pasos:"
Write-ColorOutput White "  1. Espera a que GitHub Actions termine el deploy"
Write-ColorOutput White "  2. Prueba: Alexa pregunta a profesor universal Boaz que es la retorica"
Write-ColorOutput White "  3. Verifica logs en CloudWatch si hay errores"

Write-ColorOutput Cyan "`nModo Secreto activado con palabra: Boaz"
Write-ColorOutput Cyan "============================================"
