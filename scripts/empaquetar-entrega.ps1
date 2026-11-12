# HumWorld - arma el entregable comprimido del proyecto (PDF §9, "Entregables").
#
# Uso, desde la raíz del repositorio en PowerShell:
#   .\scripts\empaquetar-entrega.ps1
#   .\scripts\empaquetar-entrega.ps1 -Nombre EQUIPO3_HUMWORLD -Rama main
#
# Empaqueta con "git archive" solo los archivos versionados de la rama indicada:
# así no entran node_modules, .venv, builds, ni el archivo .env con las claves.
# Antes de empaquetar comprueba que estén los contenidos que pide el PDF.
param(
    [string]$Nombre = "EQUIPO3_HUMWORLD",
    [string]$Rama = "main"
)

$ErrorActionPreference = "Stop"

# Contenidos que exige el PDF §9 (y dónde están en este repositorio).
$requeridos = [ordered]@{
    "Código fuente (backend)"           = "src/app"
    "Código fuente (frontend)"          = "frontend/src"
    "Documentación en /docs"            = "docs"
    "Ficheros de contexto (IA)"         = "docs/IA"
    "Instrucciones de Copilot (IA)"     = ".github/copilot-instructions.md"
    "Documentación OpenSpec"            = "openspec"
    "Contratos OpenAPI"                 = "docs/Contratos"
    "Configuración Docker"              = "docker-compose.yml"
    "Imagen Docker"                     = "Dockerfile"
    "CI/CD (GitHub Actions)"            = ".github/workflows/ci.yml"
    "Instrucciones de despliegue"       = "README.md"
}

git rev-parse --verify $Rama 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { throw "No existe la rama '$Rama'. Ejecuta primero: git fetch origin" }

$archivos = git ls-tree -r --name-only $Rama
$faltan = @()
foreach ($item in $requeridos.GetEnumerator()) {
    $ruta = $item.Value
    $existe = $archivos | Where-Object { $_ -eq $ruta -or $_.StartsWith("$ruta/") } | Select-Object -First 1
    if ($existe) { Write-Host "  OK  $($item.Key): $ruta" }
    else { Write-Host "  FALTA  $($item.Key): $ruta" -ForegroundColor Red; $faltan += $ruta }
}
if ($faltan.Count -gt 0) { throw "Faltan contenidos obligatorios; no se genera el archivo." }

# Nunca debe ir un .env con claves (solo el .env.example).
$secretos = $archivos | Where-Object { $_ -match '(^|/)\.env$' }
if ($secretos) { throw "Hay un archivo .env versionado: $secretos. Quítalo del repositorio antes de entregar." }

$salida = "$Nombre.tgz"
git archive --format=tar.gz --prefix="$Nombre/" -o $salida $Rama
$commit = git rev-parse --short $Rama
$tamano = [math]::Round((Get-Item $salida).Length / 1MB, 2)
Write-Host ""
Write-Host "Listo: $salida ($tamano MB), rama $Rama, commit $commit." -ForegroundColor Green
Write-Host "Súbelo a Canvas y recuerda dar acceso al profesor al repositorio de GitHub."
