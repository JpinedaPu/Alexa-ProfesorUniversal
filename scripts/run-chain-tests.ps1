param([string]$FunctionName="AlexaProfesorUniversal",[string]$Region="us-east-1",[string]$Chain="",[switch]$SkipLogs)
$ErrorActionPreference="Continue"
[System.Console]::OutputEncoding=[System.Text.Encoding]::UTF8
$env:PYTHONUTF8=1
$TESTS_DIR="$PSScriptRoot\..\test-events"
$LOG_DIR="$PSScriptRoot\..\test-events\results"
if(-not(Test-Path $LOG_DIR)){New-Item -ItemType Directory -Path $LOG_DIR|Out-Null}
$TIMESTAMP=Get-Date -Format "yyyyMMdd-HHmmss"
$REPORT="$LOG_DIR\chain-report-$TIMESTAMP.txt"
function Write-Header($m){Write-Host "`n$('='*70)" -ForegroundColor Cyan;Write-Host "  $m" -ForegroundColor Cyan;Write-Host $('='*70) -ForegroundColor Cyan}
function Write-OK($m){Write-Host "  [OK]   $m" -ForegroundColor Green}
function Write-FAIL($m){Write-Host "  [FAIL] $m" -ForegroundColor Red}
function Write-INFO($m){Write-Host "  [INFO] $m" -ForegroundColor Yellow}
function Write-TURN($m){Write-Host "  [TURN] $m" -ForegroundColor Magenta}
function Write-ATTR($m){Write-Host "  [ATTR] $m" -ForegroundColor DarkCyan}
function Log($m){Add-Content -Path $REPORT -Value $m -Encoding UTF8}
$c1=@{nombre="presidentes";descripcion="Cadena: presidente EEUU -> el de Mexico -> cuantos anos tiene";turnos=@(@{archivo="chain-01-presidente-eeuu.json";esperado=@("Trump","Donald","presidente","Estados Unidos")},@{archivo="chain-02-el-de-mexico.json";esperado=@("Mexico","Sheinbaum","Claudia","presidenta","presidente")},@{archivo="chain-03-cuantos-anos.json";esperado=@("anos","edad","nacio","born","tiene")})}
$c2=@{nombre="matematica";descripcion="Cadena: derivada -> integral -> limite -> ecuacion";turnos=@(@{archivo="math-01-derivada.json";esperado=@("derivada","3x","cuadrado","dos")},@{archivo="math-02-integral.json";esperado=@("integral","cuadrado","5x","constante")},@{archivo="math-03-limite.json";esperado=@("limite","cero","infinito","tiende")},@{archivo="math-04-ecuacion.json";esperado=@("x","dos","tres","solucion","raices","ecuacion")})}
$c3=@{nombre="cientifica";descripcion="Cadena: astronomia -> biologia";turnos=@(@{archivo="science-01-astronomia.json";esperado=@("Jupiter","lunas","95","satelites")},@{archivo="science-02-biologia.json";esperado=@("fotosintesis","clorofila","luz","plantas","glucosa")})}
$c4=@{nombre="cache";descripcion="Cache S3: misma pregunta dos veces";turnos=@(@{archivo="normal-01-general.json";esperado=@("Napoleon","Bonaparte","Francia","historia")},@{archivo="cache-01-segunda-vez.json";esperado=@("Napoleon","Bonaparte","Francia","historia")})}
$CHAINS=@($c1,$c2,$c3,$c4)
if($Chain){$CHAINS=$CHAINS|Where-Object{$_.nombre -match $Chain}}
Write-Header "PROFESOR UNIVERSAL IA - CHAIN TEST SUITE [$TIMESTAMP]"
Write-INFO "Funcion: $FunctionName | Cadenas: $($CHAINS.Count)"
Log "=== CHAIN TEST SUITE $TIMESTAMP ==="
$totalOK=0;$totalFail=0;$globalStart=Get-Date
foreach($chain in $CHAINS){
  Write-Header "CADENA: $($chain.nombre.ToUpper()) | $($chain.descripcion)"
  Log "`n=== CADENA: $($chain.nombre) ==="
  $sessionAttributes=@{};$turnoNum=0;$chainOK=$true;$tiempos=@()
  foreach($turno in $chain.turnos){
    $turnoNum++
    $archivoPath="$TESTS_DIR\$($turno.archivo)"
    if(-not(Test-Path $archivoPath)){Write-FAIL "Archivo no encontrado: $($turno.archivo)";Log "FAIL: $($turno.archivo)";$chainOK=$false;continue}
    $payloadObj=Get-Content $archivoPath -Raw -Encoding UTF8|ConvertFrom-Json
    if($sessionAttributes.Count -gt 0){$payloadObj.session.attributes=$sessionAttributes;$payloadObj.session.new=$false}
    $tmpFile="$LOG_DIR\tmp-turn-$turnoNum.json"
    $payloadObj|ConvertTo-Json -Depth 20|Set-Content $tmpFile -Encoding UTF8
    $slotVal=$payloadObj.request.intent.slots.question.value
    $attribKeys=if($sessionAttributes.Count -gt 0){($sessionAttributes.Keys -join ", ")}else{"(sesion nueva)"}
    Write-TURN "Turno ${turnoNum}/$($chain.turnos.Count): '$slotVal'"
    Write-ATTR "Atributos entrada: $attribKeys"
    Log "--- Turno ${turnoNum}: '$slotVal' | Atribs: $attribKeys"
    $outFile="$LOG_DIR\out-chain-$($chain.nombre)-t${turnoNum}.json"
    $t0=Get-Date
    aws lambda invoke --function-name $FunctionName --region $Region --payload "fileb://$tmpFile" --cli-binary-format raw-in-base64-out $outFile 2>&1|Out-Null
    $ms=[int]((Get-Date)-$t0).TotalMilliseconds
    $tiempos+=$ms
    Write-INFO "Lambda: ${ms}ms"
    Log "Lambda: ${ms}ms"
    if(-not(Test-Path $outFile)){Write-FAIL "Sin respuesta";Log "FAIL: sin respuesta";$chainOK=$false;continue}
    $resp=Get-Content $outFile -Raw -Encoding UTF8|ConvertFrom-Json
    $speech=($resp.response.outputSpeech.ssml -replace "<[^>]+>","" -replace "\s+"," ").Trim()
    $hasAPL=$null -ne ($resp.response.directives|Where-Object{$_.type -match "APL"})
    Write-OK "Speech: $($speech.Substring(0,[Math]::Min(130,$speech.Length)))..."
    Write-INFO "APL: $hasAPL"
    Log "Speech: $speech"
    $speechLow=$speech.ToLower()
    $encontradas=@();$faltantes=@()
    foreach($palabra in $turno.esperado){
      if($speechLow -match [regex]::Escape($palabra.ToLower())){$encontradas+=$palabra}else{$faltantes+=$palabra}
    }
    if($faltantes.Count -eq 0){Write-OK "Contenido OK: [$($encontradas -join ', ')]";Log "OK: $($encontradas -join ',')"}
    elseif($encontradas.Count -gt 0){Write-INFO "PARCIAL: OK=[$($encontradas -join ',')] FALTA=[$($faltantes -join ',')]";Log "PARCIAL: $($encontradas -join ',') FALTA:$($faltantes -join ',')"}
    else{Write-FAIL "FALLO contenido: FALTA=[$($faltantes -join ',')]";Log "FAIL: $($faltantes -join ',')";$chainOK=$false}
    if($resp.sessionAttributes){
      $sessionAttributes=$resp.sessionAttributes
      $outKeys=($resp.sessionAttributes.PSObject.Properties.Name) -join ", "
      Write-ATTR "Atributos salida: $outKeys"
      $ls=$resp.sessionAttributes.lastSubject;$lk=$resp.sessionAttributes.lastKeyword;$lq=$resp.sessionAttributes.lastQuestion
      $hl=if($resp.sessionAttributes.history){$resp.sessionAttributes.history.Count}else{0}
      if($ls){Write-ATTR "lastSubject  : '$ls'";Log "lastSubject: $ls"}
      if($lk){Write-ATTR "lastKeyword  : '$lk'";Log "lastKeyword: $lk"}
      if($lq){Write-ATTR "lastQuestion : '$lq'";Log "lastQuestion: $lq"}
      Write-ATTR "history      : $hl mensajes";Log "history: $hl mensajes"
    }
    Log ""
  }
  $avgMs=if($tiempos.Count -gt 0){[int](($tiempos|Measure-Object -Average).Average)}else{0}
  $maxMs=if($tiempos.Count -gt 0){($tiempos|Measure-Object -Maximum).Maximum}else{0}
  if($chainOK){Write-OK "Cadena '$($chain.nombre)' COMPLETA | avg=${avgMs}ms max=${maxMs}ms";Log "CADENA OK: avg=${avgMs}ms max=${maxMs}ms";$totalOK++}
  else{Write-FAIL "Cadena '$($chain.nombre)' con FALLOS | avg=${avgMs}ms";Log "CADENA FAIL: avg=${avgMs}ms";$totalFail++}
  if($chain.nombre -eq "cache" -and $tiempos.Count -ge 2){
    $t1=$tiempos[0];$t2=$tiempos[1];$diff=$t1-$t2
    if($diff -gt 500){Write-OK "Cache efectiva: t1=${t1}ms t2=${t2}ms ahorro=${diff}ms";Log "Cache efectiva: ${diff}ms"}
    else{Write-INFO "Cache marginal: t1=${t1}ms t2=${t2}ms diff=${diff}ms";Log "Cache marginal: ${diff}ms"}
  }
}
$totalMs=[int]((Get-Date)-$globalStart).TotalMilliseconds
Write-Header "RESUMEN FINAL"
Write-OK "Cadenas OK  : $totalOK"
if($totalFail -gt 0){Write-FAIL "Cadenas FAIL: $totalFail"}else{Write-INFO "Cadenas FAIL: 0"}
Write-INFO "Tiempo total: ${totalMs}ms"
Write-INFO "Reporte: $REPORT"
Log "`n=== RESUMEN: OK=$totalOK FAIL=$totalFail TOTAL_MS=${totalMs} ==="
