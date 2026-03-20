param(
    [string]$SkillId = "amzn1.ask.skill.91893f76-ab13-4ee2-ad95-d803f3434ee5",
    [string]$Profile = "root",
    [string]$Chain = ""
)
$ErrorActionPreference = "Continue"
[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONUTF8 = 1

$TESTS_DIR = "$PSScriptRoot\..\test-events"
$LOG_DIR   = "$PSScriptRoot\..\test-events\results"
if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR | Out-Null }
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$REPORT    = "$LOG_DIR\chain-report-$TIMESTAMP.txt"

function Write-Header($m) { Write-Host "`n$('='*70)" -ForegroundColor Cyan; Write-Host "  $m" -ForegroundColor Cyan; Write-Host $('='*70) -ForegroundColor Cyan }
function Write-OK($m)     { Write-Host "  [OK]   $m" -ForegroundColor Green }
function Write-FAIL($m)   { Write-Host "  [FAIL] $m" -ForegroundColor Red }
function Write-INFO($m)   { Write-Host "  [INFO] $m" -ForegroundColor Yellow }
function Write-TURN($m)   { Write-Host "  [TURN] $m" -ForegroundColor Magenta }
function Write-ATTR($m)   { Write-Host "  [ATTR] $m" -ForegroundColor DarkCyan }
function Log($m)          { Add-Content -Path $REPORT -Value $m -Encoding UTF8 }

$CHAINS = Get-Content "$PSScriptRoot\chain-definitions.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$CHAINS = @($CHAINS)
if ($Chain) { $CHAINS = @($CHAINS | Where-Object { $_.nombre -match $Chain }) }

Write-Header "CHAIN TEST SUITE [$TIMESTAMP] via ask smapi invoke-skill"
Write-INFO "Skill: $SkillId | Cadenas: $($CHAINS.Count)"
Log "=== CHAIN TEST SUITE $TIMESTAMP ==="

$totalOK = 0; $totalFail = 0; $globalStart = Get-Date

foreach ($chain in $CHAINS) {
    Write-Header "CADENA: $($chain.nombre.ToUpper()) | $($chain.descripcion)"
    Log "`n=== CADENA: $($chain.nombre) ==="

    $sessionAttributes = $null
    $turnoNum = 0
    $chainOK  = $true
    $tiempos  = @()

    foreach ($turno in $chain.turnos) {
        $turnoNum++
        $archivoPath = "$TESTS_DIR\$($turno.archivo)"

        if (-not (Test-Path $archivoPath)) {
            Write-FAIL "Archivo no encontrado: $($turno.archivo)"
            $chainOK = $false; continue
        }

        # Inyectar sessionAttributes del turno anterior
        $payloadObj = Get-Content $archivoPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($sessionAttributes -ne $null) {
            $payloadObj.session.attributes = $sessionAttributes
            $payloadObj.session.new = $false
        }
        $tmpFile = "$LOG_DIR\tmp-chain-$($chain.nombre)-t${turnoNum}.json"
        $payloadObj | ConvertTo-Json -Depth 20 | Set-Content $tmpFile -Encoding UTF8

        $slotVal    = $payloadObj.request.intent.slots.question.value
        $attribKeys = if ($sessionAttributes -ne $null) { ($sessionAttributes.PSObject.Properties.Name) -join ", " } else { "(sesion nueva)" }

        Write-TURN "Turno ${turnoNum}/$($chain.turnos.Count): '$slotVal'"
        Write-ATTR "Atributos entrada: $attribKeys"
        Log "--- Turno ${turnoNum}: '$slotVal' | Atribs: $attribKeys"

        # Invocar via ASK CLI (sincrono, sin problemas de encoding)
        $outFile = "$LOG_DIR\out-chain-$($chain.nombre)-t${turnoNum}.json"
        $t0 = Get-Date

        ask smapi invoke-skill `
            --skill-id $SkillId `
            --endpoint-region NA `
            --skill-request-body "file:$tmpFile" `
            --profile $Profile `
            --full-response `
            2>&1 | Set-Content $outFile -Encoding UTF8

        $ms = [int]((Get-Date) - $t0).TotalMilliseconds
        $tiempos += $ms
        Write-INFO "Tiempo: ${ms}ms"
        Log "Tiempo: ${ms}ms"

        # Parsear respuesta
        $rawOut = Get-Content $outFile -Raw -Encoding UTF8
        try {
            # invoke-skill devuelve { statusCode, body, headers }
            $fullResp = $rawOut | ConvertFrom-Json
            $body = if ($fullResp.body) { $fullResp.body | ConvertFrom-Json } else { $fullResp }
            $skillResp = $body.response

            $speech = ($skillResp.outputSpeech.ssml -replace "<[^>]+>", "" -replace "\s+", " ").Trim()
            $hasAPL = $null -ne ($skillResp.directives | Where-Object { $_.type -match "APL" })
            $sessionOut = $body.sessionAttributes

            Write-OK "Speech: $($speech.Substring(0, [Math]::Min(130, $speech.Length)))..."
            Write-INFO "APL: $hasAPL | HTTP: $($fullResp.statusCode)"
            Log "Speech: $speech | APL: $hasAPL"

            # Verificar palabras esperadas
            $speechLow = $speech.ToLower()
            $encontradas = @(); $faltantes = @()
            foreach ($palabra in $turno.esperado) {
                if ($speechLow -match [regex]::Escape($palabra.ToLower())) { $encontradas += $palabra }
                else { $faltantes += $palabra }
            }

            if ($faltantes.Count -eq 0) {
                Write-OK "Contenido OK: [$($encontradas -join ', ')]"
                Log "OK: $($encontradas -join ',')"
            } elseif ($encontradas.Count -gt 0) {
                Write-INFO "PARCIAL: OK=[$($encontradas -join ',')] FALTA=[$($faltantes -join ',')]"
                Log "PARCIAL: $($encontradas -join ',') FALTA:$($faltantes -join ',')"
            } else {
                Write-FAIL "FALLO: ninguna palabra esperada. FALTA=[$($faltantes -join ',')]"
                Log "FAIL: $($faltantes -join ',')"; $chainOK = $false
            }

            # Propagar sessionAttributes al siguiente turno
            if ($sessionOut) {
                $sessionAttributes = $sessionOut
                $outKeys = ($sessionOut.PSObject.Properties.Name) -join ", "
                Write-ATTR "Atributos salida: $outKeys"
                $ls = $sessionOut.lastSubject; $lk = $sessionOut.lastKeyword; $lq = $sessionOut.lastQuestion
                $hl = if ($sessionOut.history) { $sessionOut.history.Count } else { 0 }
                if ($ls) { Write-ATTR "lastSubject  : '$ls'"; Log "lastSubject: $ls" }
                if ($lk) { Write-ATTR "lastKeyword  : '$lk'"; Log "lastKeyword: $lk" }
                if ($lq) { Write-ATTR "lastQuestion : '$lq'"; Log "lastQuestion: $lq" }
                Write-ATTR "history      : $hl mensajes"; Log "history: $hl mensajes"
            }
        } catch {
            Write-FAIL "Error parseando respuesta: $_"
            Write-INFO "Raw (primeros 200): $($rawOut.Substring(0, [Math]::Min(200, $rawOut.Length)))"
            Log "FAIL parse: $_"; $chainOK = $false
        }
        Log ""
    }

    $avgMs = if ($tiempos.Count -gt 0) { [int](($tiempos | Measure-Object -Average).Average) } else { 0 }
    $maxMs = if ($tiempos.Count -gt 0) { ($tiempos | Measure-Object -Maximum).Maximum } else { 0 }

    if ($chainOK) {
        Write-OK "Cadena '$($chain.nombre)' COMPLETA | avg=${avgMs}ms max=${maxMs}ms"
        Log "CADENA OK: avg=${avgMs}ms max=${maxMs}ms"; $totalOK++
    } else {
        Write-FAIL "Cadena '$($chain.nombre)' con FALLOS | avg=${avgMs}ms"
        Log "CADENA FAIL: avg=${avgMs}ms"; $totalFail++
    }

    if ($chain.nombre -eq "cache" -and $tiempos.Count -ge 2) {
        $t1 = $tiempos[0]; $t2 = $tiempos[1]; $diff = $t1 - $t2
        if ($diff -gt 500) { Write-OK "Cache efectiva: t1=${t1}ms t2=${t2}ms ahorro=${diff}ms"; Log "Cache efectiva: ${diff}ms" }
        else { Write-INFO "Cache marginal: t1=${t1}ms t2=${t2}ms diff=${diff}ms"; Log "Cache marginal: ${diff}ms" }
    }
}

$totalMs = [int]((Get-Date) - $globalStart).TotalMilliseconds
Write-Header "RESUMEN FINAL"
Write-OK "Cadenas OK  : $totalOK"
if ($totalFail -gt 0) { Write-FAIL "Cadenas FAIL: $totalFail" } else { Write-INFO "Cadenas FAIL: 0" }
Write-INFO "Tiempo total: ${totalMs}ms | Reporte: $REPORT"
Log "`n=== RESUMEN: OK=$totalOK FAIL=$totalFail TOTAL_MS=${totalMs} ==="
