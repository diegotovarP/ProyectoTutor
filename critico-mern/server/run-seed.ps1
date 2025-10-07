# ============================================
# Script PowerShell para poblar base de datos
# Para Windows
# ============================================

Write-Host "🌱 POBLANDO BASE DE DATOS MONGODB" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""

# Obtener directorio actual
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "📂 Directorio del proyecto: $ProjectRoot" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe seed.js
if (-not (Test-Path "$ProjectRoot\scripts\seed.js")) {
    Write-Host "❌ Error: No se encontró scripts\seed.js" -ForegroundColor Red
    exit 1
}

# Verificar red de Docker
Write-Host "🔍 Verificando red de Docker..." -ForegroundColor Yellow
$networkExists = docker network ls | Select-String "tallerproyectos2_default"
if (-not $networkExists) {
    Write-Host "⚠️  Red 'tallerproyectos2_default' no encontrada. Creándola..." -ForegroundColor Yellow
    docker network create tallerproyectos2_default
}

# Verificar MongoDB
Write-Host "🔍 Verificando MongoDB..." -ForegroundColor Yellow
$mongoRunning = docker ps | Select-String "mongo"
if (-not $mongoRunning) {
    Write-Host "❌ Error: MongoDB no está corriendo" -ForegroundColor Red
    Write-Host "   Ejecuta primero: docker-compose -f docker-compose.db-only.yml up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ MongoDB está corriendo" -ForegroundColor Green
Write-Host ""

# Verificar si el backend está corriendo
$backendRunning = docker ps | Select-String "critico-backend"

if ($backendRunning) {
    # Opción 1: Usar contenedor del backend
    Write-Host "🎯 Usando contenedor del backend existente..." -ForegroundColor Cyan
    docker exec -it critico-backend npm run db:structure
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Base de datos poblada exitosamente" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Error al poblar base de datos" -ForegroundColor Red
        exit 1
    }
} else {
    # Opción 2: Crear contenedor temporal
    Write-Host "🎯 Creando contenedor temporal de Node.js..." -ForegroundColor Cyan
    
    docker run --rm -it `
        --network tallerproyectos2_default `
        -v "${ProjectRoot}:/app" `
        -w /app `
        -e MONGO_URI="mongodb://root:root@mongo:27017/critico?authSource=admin" `
        node:20-alpine `
        sh -c "npm install --production && node scripts/seed.js"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Base de datos poblada exitosamente" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Error al poblar base de datos" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🌐 Puedes verificar en: http://localhost:8081 (admin/admin)" -ForegroundColor Cyan
