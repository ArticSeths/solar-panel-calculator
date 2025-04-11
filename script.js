// --- Elementos del DOM ---
const latDisplay = document.getElementById('latitude');
const lonDisplay = document.getElementById('longitude');
const currentAzimuthDisplay = document.getElementById('current-azimuth');
const currentTiltDisplay = document.getElementById('current-tilt');
const optimalAzimuthDisplay = document.getElementById('optimal-azimuth');
const optimalTiltDisplay = document.getElementById('optimal-tilt');
const adjustmentInfo = document.getElementById('adjustment-info');
const statusDiv = document.getElementById('status');
const errorDiv = document.getElementById('error-message');
const startButton = document.getElementById('startOrientationButton'); // Referencia al botón

// --- Variables de estado ---
let currentLatitude = null;
let currentLongitude = null;
let currentAzimuth = null;
let currentTilt = null;
let optimalAzimuth = null;
let optimalTilt = null;
let orientationListenerActive = false;

// --- Constantes ---
const AZIMUTH_THRESHOLD = 5; // Grados de tolerancia para el azimut
const TILT_THRESHOLD = 3;    // Grados de tolerancia para la inclinación

// --- Funciones ---

/** Muestra mensajes de error al usuario */
function showError(message) {
    console.error(message);
    errorDiv.textContent = `Error: ${message}`;
    errorDiv.style.display = 'block';
    // No cambiar adjustmentInfo aquí para no sobrescribir instrucciones previas si el error es temporal
}

/** Actualiza el estado inicial o mensajes */
function updateStatus(message) {
    // Busca el primer párrafo dentro de statusDiv para actualizarlo, o añade uno si no existe
    let statusP = statusDiv.querySelector('p');
    if (statusP) {
        statusP.innerHTML = message; // Usar innerHTML por si pasamos negritas u otros tags
    } else {
        statusDiv.innerHTML = `<p>${message}</p>`; // Reemplaza si no hay <p>
    }
}

/** Obtiene la ubicación del usuario */
function requestLocation() {
    updateStatus("Solicitando permiso de ubicación...");
    adjustmentInfo.textContent = "Esperando ubicación..."; // Estado inicial de instrucciones
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(locationSuccess, locationError, {
            enableHighAccuracy: true,
            timeout: 20000, // 20 segundos de tiempo límite
            maximumAge: 60000 // Permitir caché de 1 minuto
        });
    } else {
        showError("La Geolocalización no está disponible en este navegador.");
        startButton.disabled = true; // Mantener botón deshabilitado
    }
}

/** Callback si la ubicación se obtiene con éxito */
function locationSuccess(position) {
    errorDiv.style.display = 'none'; // Ocultar errores previos si la ubicación funciona
    currentLatitude = position.coords.latitude;
    currentLongitude = position.coords.longitude;

    latDisplay.textContent = currentLatitude.toFixed(4);
    lonDisplay.textContent = currentLongitude.toFixed(4);

    updateStatus("Ubicación obtenida ✅. Ahora haz clic en 'Iniciar Lectura de Orientación'.");
    calculateOptimalOrientation();

    // Habilitar el botón para que el usuario inicie la lectura de orientación
    startButton.disabled = false;
    startButton.textContent = "Iniciar Lectura de Orientación"; // Asegurar texto inicial
}

/** Callback si hay error al obtener la ubicación */
function locationError(error) {
    let message = "";
    switch (error.code) {
        case error.PERMISSION_DENIED:
            message = "Permiso de ubicación denegado. La aplicación no puede funcionar sin ubicación.";
            break;
        case error.POSITION_UNAVAILABLE:
            message = "Información de ubicación no disponible. Intenta de nuevo o revisa la señal GPS.";
            break;
        case error.TIMEOUT:
            message = "Se agotó el tiempo de espera para obtener la ubicación. Revisa tu conexión/GPS.";
            break;
        default:
            message = `Ocurrió un error desconocido al obtener la ubicación (Código: ${error.code}).`;
            break;
    }
    showError(message);
    startButton.disabled = true; // Asegurarse de que el botón esté deshabilitado
    adjustmentInfo.textContent = "Error al obtener ubicación.";
}

/** Calcula la orientación óptima fija anual */
function calculateOptimalOrientation() {
    if (currentLatitude === null) return;

    // Azimut: 180° (Sur) en H.Norte (lat >= 0), 0° (Norte) en H.Sur (lat < 0)
    optimalAzimuth = (currentLatitude >= 0) ? 180 : 0;
    // Inclinación: Aproximadamente el valor absoluto de la latitud
    optimalTilt = Math.abs(currentLatitude);

    optimalAzimuthDisplay.textContent = optimalAzimuth.toFixed(1);
    optimalTiltDisplay.textContent = optimalTilt.toFixed(1);

    // Actualizar instrucciones ahora que tenemos la óptima, aunque aún falte la actual
    updateInstructions();
}

/** Inicia el listener para la orientación del dispositivo (llamada por el botón) */
function startOrientationListener() {
    // Deshabilitar botón temporalmente y dar feedback
    startButton.disabled = true;
    startButton.textContent = "Iniciando...";

    // Prevenir múltiples listeners
    if (orientationListenerActive) {
        startButton.textContent = "Lectura Ya Iniciada";
        // Podríamos habilitarlo de nuevo si queremos permitir reiniciar,
        // pero por ahora lo dejamos como "ya iniciado".
        // startButton.disabled = false;
        return;
    }

    if ('DeviceOrientationEvent' in window) {
        // Verificar si se necesita permiso explícito (iOS >= 13, etc.)
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation, true);
                        orientationListenerActive = true;
                        updateStatus("Permiso de movimiento otorgado ✅. Mueve el móvil para obtener lecturas.");
                        startButton.textContent = "Lectura de Orientación Activa";
                         errorDiv.style.display = 'none'; // Ocultar errores previos
                        // No deshabilitar permanentemente para posible reinicio futuro
                    } else {
                        showError("Permiso de movimiento denegado. No se puede leer la orientación.");
                        startButton.textContent = "Permiso Denegado";
                        startButton.disabled = false; // Permitir intentar de nuevo
                    }
                })
                .catch(error => {
                     showError("Error al solicitar permiso de movimiento: " + error);
                     startButton.textContent = "Error al Solicitar Permiso";
                     startButton.disabled = false; // Permitir reintentar
                });
        } else {
            // Navegadores/Casos donde no se requiere permiso explícito (o ya fue otorgado)
            window.addEventListener('deviceorientation', handleOrientation, true);
            orientationListenerActive = true;
            updateStatus("Escuchando orientación del dispositivo... Mueve el móvil.");
            startButton.textContent = "Lectura de Orientación Activa";
             errorDiv.style.display = 'none'; // Ocultar errores previos
        }
    } else {
        showError("La API DeviceOrientationEvent no está disponible en este navegador.");
        startButton.textContent = "Orientación No Soportada";
        // El botón ya está deshabilitado, lo dejamos así.
    }
}

/** Maneja los eventos de orientación del dispositivo */
function handleOrientation(event) {
    // Ignorar si alpha es null (puede pasar al inicio o si hay interferencia)
    if (event.alpha === null || event.beta === null || event.gamma === null) {
        console.warn("Evento de orientación con valores null recibido.");
        // Podríamos mostrar un mensaje temporal o simplemente esperar al siguiente evento
        // updateStatus("Esperando datos de orientación válidos...");
        return;
    }

    // --- Interpretación ---
    currentAzimuth = event.alpha; // Azimut (Norte Magnético = 0-360)
    // Tilt (Inclinación): Usamos beta, limitado a 0-90 grados.
    // ASUNCIÓN: Móvil plano, pantalla arriba, borde superior apunta hacia arriba de la placa.
    currentTilt = event.beta;
    // Corregir si beta da valores negativos o > 90 (depende de la orientación inicial del móvil)
    if (currentTilt < -90) { currentTilt += 180;} // Ajuste común si el móvil está boca abajo
    currentTilt = Math.max(0, Math.min(90, currentTilt)); // Forzar rango 0-90

    // --- Actualizar UI ---
    currentAzimuthDisplay.textContent = currentAzimuth.toFixed(1);
    currentTiltDisplay.textContent = currentTilt.toFixed(1);

    // Actualizar las instrucciones de ajuste
    updateInstructions();
}

/** Calcula y muestra las instrucciones de ajuste */
function updateInstructions() {
    let infoText = "";

    if (optimalAzimuth === null || optimalTilt === null) {
        infoText = "Esperando ubicación para calcular orientación óptima...";
    } else if (currentAzimuth === null || currentTilt === null) {
        // Si ya tenemos la óptima pero no la actual
        infoText = "Haz clic en 'Iniciar Lectura' y mueve el móvil para obtener la orientación actual.";
    } else {
        // Tenemos todos los datos, calcular diferencias
        let azimuthDiff = optimalAzimuth - currentAzimuth;
        while (azimuthDiff <= -180) azimuthDiff += 360;
        while (azimuthDiff > 180) azimuthDiff -= 360;

        let tiltDiff = optimalTilt - currentTilt;

        let instructions = [];

        // Instrucción de Azimut
        if (Math.abs(azimuthDiff) > AZIMUTH_THRESHOLD) {
            const direction = azimuthDiff > 0 ? '➡️ Derecha (horario)' : '⬅️ Izquierda (antihorario)';
            instructions.push(`Girar ${Math.abs(azimuthDiff).toFixed(0)}° ${direction}`);
        } else {
            instructions.push("✅ Dirección (Azimut) correcta.");
        }

        // Instrucción de Inclinación
        if (Math.abs(tiltDiff) > TILT_THRESHOLD) {
            const direction = tiltDiff > 0 ? '⬆️ ARRIBA' : '⬇️ ABAJO';
            instructions.push(`Inclinar ${Math.abs(tiltDiff).toFixed(0)}° ${direction}`);
        } else {
            instructions.push("✅ Inclinación (Tilt) correcta.");
        }
        infoText = instructions.join('<br>'); // Unir con saltos de línea HTML
    }

    adjustmentInfo.innerHTML = infoText; // Usar innerHTML para que <br> funcione
}


// --- Inicialización ---
window.onload = () => {
    errorDiv.style.display = 'none'; // Ocultar div de error al inicio

    // Añadir listener al botón para que llame a startOrientationListener al hacer clic
    startButton.addEventListener('click', startOrientationListener);

    // Solicitar ubicación automáticamente al cargar la página
    requestLocation();
};