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
    adjustmentInfo.textContent = 'No se pueden dar instrucciones debido a un error.';
}

/** Actualiza el estado inicial o mensajes */
function updateStatus(message) {
    statusDiv.innerHTML = `<p>${message}</p>`; // Reemplaza contenido de status
}

/** Obtiene la ubicación del usuario */
function requestLocation() {
    updateStatus("Solicitando permiso de ubicación...");
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(locationSuccess, locationError, {
            enableHighAccuracy: true,
            timeout: 15000, // 15 segundos de tiempo límite
            maximumAge: 0 // No usar caché
        });
    } else {
        showError("La Geolocalización no está disponible en este navegador.");
    }
}

/** Callback si la ubicación se obtiene con éxito */
function locationSuccess(position) {
    currentLatitude = position.coords.latitude;
    currentLongitude = position.coords.longitude;

    latDisplay.textContent = currentLatitude.toFixed(4);
    lonDisplay.textContent = currentLongitude.toFixed(4);

    updateStatus("Ubicación obtenida. Coloca el móvil sobre la placa y asegúrate de dar permiso de movimiento si se solicita.");
    calculateOptimalOrientation();
    startOrientationListener(); // Iniciar escucha de orientación DESPUÉS de obtener ubicación
}

/** Callback si hay error al obtener la ubicación */
function locationError(error) {
    let message = "";
    switch (error.code) {
        case error.PERMISSION_DENIED:
            message = "Permiso de ubicación denegado. La aplicación no puede funcionar sin ubicación.";
            break;
        case error.POSITION_UNAVAILABLE:
            message = "Información de ubicación no disponible.";
            break;
        case error.TIMEOUT:
            message = "Se agotó el tiempo de espera para obtener la ubicación.";
            break;
        default:
            message = `Ocurrió un error desconocido al obtener la ubicación (Código: ${error.code}).`;
            break;
    }
    showError(message);
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

    // Una vez calculado, podemos intentar mostrar instrucciones iniciales
    updateInstructions();
}

/** Inicia el listener para la orientación del dispositivo */
function startOrientationListener() {
    // Evitar añadir múltiples listeners
    if (orientationListenerActive) return; 

    if ('DeviceOrientationEvent' in window) {
        // Comprobar si se necesita permiso explícito (navegadores modernos como iOS Safari)
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation, true);
                        orientationListenerActive = true;
                        updateStatus("Permiso de movimiento otorgado. Mueve el móvil para obtener lecturas.");
                    } else {
                        showError("Permiso de movimiento denegado. No se puede leer la orientación.");
                    }
                })
                .catch(error => {
                     showError("Error al solicitar permiso de movimiento: " + error);
                });
        } else {
            // Para navegadores que no requieren permiso explícito (o ya fue dado)
            window.addEventListener('deviceorientation', handleOrientation, true);
            orientationListenerActive = true;
            updateStatus("Escuchando orientación del dispositivo..."); // Actualizar estado
        }
    } else {
        showError("La API DeviceOrientationEvent no está disponible en este navegador.");
    }
}

/** Maneja los eventos de orientación del dispositivo */
function handleOrientation(event) {
    // alpha: Azimut (0-360, 0=Norte Magnético)
    // beta: Inclinación adelante-atrás (-180 a 180)
    // gamma: Inclinación izquierda-derecha (-90 a 90)

    if (event.alpha === null || event.beta === null || event.gamma === null) {
        // A veces los primeros eventos pueden ser null
        updateStatus("Esperando datos de orientación válidos...");
        return;
    }
    
    // --- Interpretación ---
    // Azimut: event.alpha. Usamos el norte magnético como aproximación inicial.
    // Para mayor precisión se necesitaría declinación magnética.
    currentAzimuth = event.alpha;

    // Inclinación (Tilt): Usamos event.beta.
    // ASUNCIÓN: Móvil plano sobre la placa, borde superior del móvil apuntando
    // hacia el borde superior de la placa.
    // Limitamos a 0-90 grados, ya que la placa no se inclina "hacia atrás".
    currentTilt = Math.max(0, Math.min(90, event.beta));
    
    // --- Actualizar UI ---
    currentAzimuthDisplay.textContent = currentAzimuth.toFixed(1);
    currentTiltDisplay.textContent = currentTilt.toFixed(1);

    // Actualizar las instrucciones de ajuste
    updateInstructions();
}

/** Calcula y muestra las instrucciones de ajuste */
function updateInstructions() {
    if (optimalAzimuth === null || optimalTilt === null) {
        adjustmentInfo.textContent = "Calculando orientación óptima...";
        return;
    }
    if (currentAzimuth === null || currentTilt === null) {
        adjustmentInfo.textContent = "Esperando lectura de orientación del móvil...";
        return;
    }

    // --- Calcular diferencias ---
    let azimuthDiff = optimalAzimuth - currentAzimuth;
    // Normalizar diferencia de azimut a un rango de -180 a +180 grados
    while (azimuthDiff <= -180) azimuthDiff += 360;
    while (azimuthDiff > 180) azimuthDiff -= 360;

    let tiltDiff = optimalTilt - currentTilt;

    // --- Generar mensajes ---
    let instructions = [];

    // Instrucción de Azimut
    if (Math.abs(azimuthDiff) > AZIMUTH_THRESHOLD) {
        const direction = azimuthDiff > 0 ? 'la DERECHA (sentido horario)' : 'la IZQUIERDA (sentido antihorario)';
        instructions.push(`Girar ${Math.abs(azimuthDiff).toFixed(0)}° hacia ${direction}`);
    } else {
        instructions.push("✅ Dirección (Azimut) correcta.");
    }

    // Instrucción de Inclinación
    if (Math.abs(tiltDiff) > TILT_THRESHOLD) {
        const direction = tiltDiff > 0 ? 'ARRIBA' : 'ABAJO';
        instructions.push(`Inclinar ${Math.abs(tiltDiff).toFixed(0)}° hacia ${direction}`);
    } else {
        instructions.push("✅ Inclinación (Tilt) correcta.");
    }

    // --- Mostrar instrucciones ---
    adjustmentInfo.innerHTML = instructions.join('<br>'); // Usar <br> para saltos de línea
}


// --- Inicialización ---
window.onload = () => {
    // Ocultar error al inicio
    errorDiv.style.display = 'none';
    // Solicitar ubicación al cargar la página
    requestLocation();
};