# 🎫 Sistema Verificador de Tickets QR - The Terrace

Sistema completo para verificar tickets con códigos QR usando Google Sheets como base de datos, desplegado en Vercel.

## ✨ Características

- 📱 **Escáner QR** con cámara del móvil
- ✅ **Verificación instantánea** contra Google Sheets
- 🔒 **Prevención de doble uso** - marca tickets como usados
- 📊 **Estadísticas en tiempo real** - tickets verificados/rechazados
- 🎨 **Interfaz moderna** y fácil de usar para porteros
- 🌐 **100% gratis** - Vercel + Google Sheets API
- ⚡ **Rápido** - Respuesta en menos de 2 segundos

## 📋 Requisitos Previos

1. Cuenta de Google (Gmail)
2. Cuenta de Vercel (gratis) - https://vercel.com
3. Cuenta de GitHub (gratis) - https://github.com

## 🚀 Instalación Paso a Paso

### Paso 1: Preparar Google Sheets

1. **Abre tu Google Sheet** con los datos de tickets
2. **Agrega dos columnas nuevas** al final (después de `qr_code_compra`):
   - Columna T: `ticket_usado` 
   - Columna U: `fecha_uso`
3. **Haz la hoja pública**:
   - Click en "Compartir" (botón superior derecho)
   - Click en "Cambiar a cualquiera con el enlace"
   - Asegúrate que diga "Lector" (no Editor)
   - Copia el enlace
4. **Obtén el SPREADSHEET_ID**:
   - De la URL: `https://docs.google.com/spreadsheets/d/AQUI_ESTA_EL_ID/edit`
   - Copia solo la parte entre `/d/` y `/edit`

### Paso 2: Crear Google API Key

1. Ve a https://console.cloud.google.com/
2. Click en "Seleccionar proyecto" → "Nuevo proyecto"
3. Dale un nombre (ej: "Verificador-Tickets") → "Crear"
4. Espera 10 segundos y selecciona el proyecto creado
5. En el menú lateral, ve a **"APIs y servicios"** → **"Biblioteca"**
6. Busca **"Google Sheets API"** → Click en ella → **"Habilitar"**
7. Ve a **"Credenciales"** (menú lateral)
8. Click en **"Crear credenciales"** → **"Clave de API"**
9. **¡IMPORTANTE!** Click en "Restringir clave":
   - Nombre: "API Key Verificador"
   - **Restricciones de aplicación**:
     * Selecciona "Referentes HTTP (sitios web)"
     * Agrega: `*.vercel.app/*`
   - **Restricciones de API**:
     * Selecciona "Restringir clave"
     * Marca solo "Google Sheets API"
   - Click "Guardar"
10. **Copia tu API Key** (la necesitarás en Vercel)

### Paso 3: Subir el Código a GitHub

1. Ve a https://github.com y crea una cuenta (si no tienes)
2. Click en **"New"** (botón verde) para crear un repositorio
3. Nombre: `verificador-tickets-qr`
4. Selecciona **"Public"**
5. NO marques ningún checkbox
6. Click **"Create repository"**
7. **Sube los archivos**:
   - Opción A: Arrastra todos los archivos del proyecto a la página
   - Opción B: Usa GitHub Desktop o Git CLI

   **Archivos que debes subir:**
   ```
   - index.html
   - package.json
   - vercel.json
   - .gitignore
   - api/verify-ticket.js
   - README.md
   ```

### Paso 4: Desplegar en Vercel

1. Ve a https://vercel.com
2. Click en **"Sign Up"** y elige "Continue with GitHub"
3. Autoriza a Vercel para acceder a tu GitHub
4. Click en **"New Project"**
5. **Importa tu repositorio**:
   - Busca `verificador-tickets-qr`
   - Click en "Import"
6. **Configurar variables de entorno**:
   - En la sección "Environment Variables", agrega:
   
   | Name | Value |
   |------|-------|
   | `SPREADSHEET_ID` | Tu ID del paso 1 |
   | `GOOGLE_API_KEY` | Tu API Key del paso 2 |
   | `SHEET_NAME` | `Hoja 1` (o el nombre de tu pestaña) |

7. Click en **"Deploy"**
8. Espera 1-2 minutos ⏰
9. ¡Listo! 🎉 Tu app estará en: `https://tu-proyecto.vercel.app`

## 📱 Cómo Usar

### Para el Portero:

1. **Abre la app** en el móvil: `https://tu-proyecto.vercel.app`
2. **Click en "Iniciar Escáner"** (primera vez pedirá permiso de cámara)
3. **Apunta la cámara al QR** del ticket
4. **Resultado instantáneo**:
   - ✅ Verde = Ticket válido (se marca como usado automáticamente)
   - ⚠️ Amarillo = Ticket ya fue usado antes
   - ❌ Rojo = Ticket inválido o no pagado

### Entrada Manual:

Si el QR no escanea bien:
1. Escribe el código manualmente en el campo de texto
2. Click en "Verificar Código Manual"

## 🔧 Configuración Avanzada

### Cambiar Nombre de Columnas

Si tus columnas están en otro orden, edita `api/verify-ticket.js`:

```javascript
const COLUMNS = {
    QR_CODE_COMPRA: 18,  // Cambia este número según tu sheet
    // ...
};
```

### Personalizar Diseño

Edita `index.html` para cambiar:
- Colores (busca `#667eea` y `#764ba2`)
- Textos
- Logo del evento

### Dominio Personalizado

1. En Vercel → Settings → Domains
2. Agrega tu dominio (ej: `tickets.tuevento.com`)
3. Sigue las instrucciones DNS
4. **Actualiza tu API Key** en Google Cloud Console:
   - Agrega tu dominio a "Referentes HTTP"

## 🐛 Solución de Problemas

### "Error de conexión"
- Verifica que las variables de entorno estén bien en Vercel
- Revisa que el SPREADSHEET_ID sea correcto

### "Ticket no encontrado"
- Asegúrate que el código QR esté en la columna correcta (columna S)
- Verifica que el Sheet esté público

### "Error al iniciar la cámara"
- La app debe usar HTTPS (Vercel lo da automáticamente)
- Da permiso de cámara en el navegador
- En iPhone: ve a Configuración → Safari → Cámara → Permitir

### La API dice "403 Forbidden"
- Tu API Key debe tener restricciones bien configuradas
- Verifica que hayas habilitado Google Sheets API
- Espera 5 minutos después de crear la API Key

## 📊 Estructura del Proyecto

```
qr-ticket-vercel/
├── index.html              # Frontend - Interfaz del escáner
├── api/
│   └── verify-ticket.js   # Backend - Lógica de verificación
├── package.json           # Dependencias
├── vercel.json           # Configuración de Vercel
├── .gitignore           # Archivos a ignorar
└── README.md            # Esta documentación
```

## 🔐 Seguridad

✅ **Buenas prácticas implementadas:**
- API Key con restricciones de dominio y API
- Variables de entorno en Vercel (no en código)
- Google Sheet en modo solo lectura para usuarios
- HTTPS obligatorio

## 💰 Costos

- **Vercel**: $0 (plan Hobby - suficiente para eventos)
- **Google Sheets API**: $0 (hasta 100 llamadas/minuto)
- **Total**: $0 💚

## 📈 Límites

- **Vercel Hobby**: 100 GB de ancho de banda/mes
- **Google Sheets API**: 60 requests/minuto/usuario
- Para eventos con más de 1000 personas simultáneas, considera Vercel Pro

## 🆘 Soporte

¿Problemas? Abre un issue en GitHub o contacta al desarrollador.

## 📝 Licencia

MIT - Úsalo libremente para tus eventos

---

**Hecho con ❤️ para The Terrace Press**
