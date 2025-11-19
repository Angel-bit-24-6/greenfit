# Configuración de Red - GreenFit

Este documento explica cómo cambiar fácilmente las IPs del proyecto cuando cambies de red.

## 📁 Archivos de Configuración

### Backend
- **Archivo**: `backend/.env`
- **Variables a modificar**:
  ```env
  API_BASE_URL=http://TU_NUEVA_IP:3002
  FRONTEND_URL=http://TU_NUEVA_IP:8081
  ```

### Frontend
- **Archivo principal**: `frontend/config/network.json`
- **Configuración**:
  ```json
  {
    "development": {
      "API_BASE_URL": "http://TU_NUEVA_IP:3002/api",
      "BACKEND_URL": "http://TU_NUEVA_IP:3002",
      "FRONTEND_URL": "http://TU_NUEVA_IP:8081"
    }
  }
  ```

## 🔄 Proceso de Cambio de IP

### 1. Para cambiar a una nueva IP (ejemplo: 192.168.1.100):

**Backend** (`backend/.env`):
```env
API_BASE_URL=http://192.168.1.100:3002
FRONTEND_URL=http://192.168.1.100:8081
```

**Frontend** (`frontend/config/network.json`):
```json
{
  "development": {
    "API_BASE_URL": "http://192.168.1.100:3002/api",
    "BACKEND_URL": "http://192.168.1.100:3002",
    "FRONTEND_URL": "http://192.168.1.100:8081"
  }
}
```

### 2. Para volver a localhost:

Cambia el ambiente en el frontend a `"localhost"` o modifica la configuración `"development"` con:
```json
{
  "development": {
    "API_BASE_URL": "http://localhost:3002/api",
    "BACKEND_URL": "http://localhost:3002",
    "FRONTEND_URL": "http://localhost:8081"
  }
}
```

## 📝 Cambios Realizados

### Archivos Creados:
1. `frontend/config/network.json` - Configuración centralizada de URLs
2. `frontend/hooks/useNetworkConfig.ts` - Hook para manejar configuración de red

### Archivos Modificados:
1. `frontend/config/app.json` - Actualizado para usar configuración dinámica
2. `frontend/hooks/useConfig.ts` - Integra configuración de red
3. `frontend/stores/cartStore.ts` - URLs hardcodeadas reemplazadas
4. `frontend/utils/catalogHelpers.ts` - URL hardcodeada reemplazada

### URLs Actuales:
- Backend: `http://10.34.222.118:3002`
- Frontend: `http://10.34.222.118:8081`
- API Base: `http://10.34.222.118:3002/api`

## ✅ Verificación

Antes de ejecutar la aplicación, verifica que:
1. Las IPs en `backend/.env` coincidan con tu red actual
2. Las IPs en `frontend/config/network.json` coincidan con tu red actual
3. Los puertos (3002 para backend, 8081 para frontend) estén disponibles

## 🔧 Comandos Útiles

Para encontrar tu IP actual:
```bash
# Windows
ipconfig | findstr IPv4

# Linux/Mac
ifconfig | grep inet
```

## 📚 Notas Técnicas

- El frontend usa automáticamente la configuración de `network.json`
- No hay URLs hardcodeadas en el código - todo se maneja centralizadamente
- Los cambios se aplican automáticamente al reiniciar la aplicación
- El backend sigue usando `.env` como es estándar en Node.js