#!/bin/bash
# ============================================
# Script para ejecutar seed de base de datos
# Compatible con Mac, Linux y Windows (Git Bash)
# ============================================

echo "🌱 POBLANDO BASE DE DATOS MONGODB"
echo "=================================="
echo ""

# Detectar el directorio actual
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📂 Directorio del proyecto: $PROJECT_ROOT"
echo ""

# Verificar que existe el archivo seed.js
if [ ! -f "$PROJECT_ROOT/scripts/seed.js" ]; then
  echo "❌ Error: No se encontró scripts/seed.js"
  exit 1
fi

# Verificar que existe la red de Docker
echo "🔍 Verificando red de Docker..."
if ! docker network ls | grep -q "tallerproyectos2_default"; then
  echo "⚠️  Red 'tallerproyectos2_default' no encontrada. Creándola..."
  docker network create tallerproyectos2_default
fi

# Verificar que MongoDB está corriendo
echo "🔍 Verificando MongoDB..."
if ! docker ps | grep -q "mongo"; then
  echo "❌ Error: MongoDB no está corriendo"
  echo "   Ejecuta primero: docker-compose -f docker-compose.db-only.yml up -d"
  exit 1
fi

echo "✅ MongoDB está corriendo"
echo ""

# Opción 1: Si el backend está corriendo, usar ese contenedor
if docker ps | grep -q "critico-backend"; then
  echo "🎯 Usando contenedor del backend existente..."
  docker exec -it critico-backend npm run db:structure
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Base de datos poblada exitosamente"
  else
    echo ""
    echo "❌ Error al poblar base de datos"
    exit 1
  fi
else
  # Opción 2: Crear contenedor temporal
  echo "🎯 Creando contenedor temporal de Node.js..."
  
  docker run --rm -it \
    --network tallerproyectos2_default \
    -v "$PROJECT_ROOT:/app" \
    -w /app \
    -e MONGO_URI="mongodb://root:root@mongo:27017/critico?authSource=admin" \
    node:20-alpine \
    sh -c "npm install --production && node scripts/seed.js"
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Base de datos poblada exitosamente"
  else
    echo ""
    echo "❌ Error al poblar base de datos"
    exit 1
  fi
fi

echo ""
echo "🌐 Puedes verificar en: http://localhost:8081 (admin/admin)"
