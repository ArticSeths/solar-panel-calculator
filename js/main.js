// Obtener elementos del DOM
const locationEl = document.getElementById('location');
const tiltEl = document.getElementById('tilt');
const orientationEl = document.getElementById('orientation');
const optimalTiltEl = document.getElementById('optimal-tilt');
const optimalOrientationEl = document.getElementById('optimal-orientation');

// Variables globales
let latitude, longitude;

// Inicializar Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 400, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const canvasContainer = document.getElementById('canvas-container');
renderer.setSize(canvasContainer.offsetWidth, 400);
canvasContainer.appendChild(renderer.domElement);

// Crear un plano que represente la placa solar
const geometry = new THREE.PlaneGeometry(2, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
const panel = new THREE.Mesh(geometry, material);
scene.add(panel);
camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Detectar si es un dispositivo iOS
function isIOS() {
    const userAgent = navigator.userAgent || navigator.platform || '';
    return /iPad|iPhone|iPod/.test(userAgent) || /Macintosh/.test(userAgent) && 'ontouchstart' in window;
}

// Solicitar permiso para sensores
function requestDeviceOrientationPermission() {
    if (isIOS() && typeof DeviceOrientationEvent.requestPermission === 'function') {
        console.log('Solicitando permiso para sensores');
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    console.log('Permiso concedido, registrando evento de orientación');
                    window.addEventListener('deviceorientation', handleOrientation);
                } else {
                    console.log('Permiso denegado');
                    orientationEl.textContent = 'Permiso denegado para sensores';
                    tiltEl.textContent = 'No disponible';
                }
            })
            .catch(error => {
                console.error('Error solicitando permiso:', error);
                orientationEl.textContent = 'Error al acceder a sensores';
            });
    }
}

// Manejar datos de orientación
function handleOrientation(event) {
    const alpha = event.alpha; // Orientación respecto al norte (0-360°)
    const beta = event.beta;   // Inclinación vertical (-90 a 90°)

    orientationEl.textContent = alpha !== null ? `${alpha.toFixed(1)}°` : 'No disponible';
    tiltEl.textContent = beta !== null ? `${beta.toFixed(1)}°` : 'No disponible';

    if (alpha !== null && beta !== null) {
        panel.rotation.x = THREE.MathUtils.degToRad(beta);
        panel.rotation.z = THREE.MathUtils.degToRad(-alpha);
    }
}

// Crear y añadir el botón para sensores
function setupSensorButton() {
    if (isIOS() && typeof DeviceOrientationEvent.requestPermission === 'function') {
        console.log('Dispositivo iOS detectado, añadiendo botón para sensores');
        const button = document.createElement('button');
        button.id = 'sensor-button';
        button.textContent = 'Activar sensores';
        button.style.margin = '10px';
        button.style.padding = '10px 20px';
        button.style.fontSize = '16px';
        button.style.backgroundColor = '#007bff';
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.style.display = 'block';

        const container = document.getElementById('container');
        if (container) {
            container.prepend(button);
            console.log('Botón añadido al contenedor');
        } else {
            console.warn('Contenedor #container no encontrado, añadiendo al body');
            document.body.prepend(button);
        }

        button.addEventListener('click', requestDeviceOrientationPermission);
    } else {
        console.log('No es iOS o no requiere permiso, registrando evento de orientación directamente');
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

// Solicitar geolocalización
function requestGeolocation() {
    if ('geolocation' in navigator) {
        console.log('Solicitando geolocalización');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Geolocalización obtenida:', position.coords);
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
                locationEl.textContent = `Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`;

                const now = new Date();
                const sunPosition = SunCalc.getPosition(now, latitude, longitude);
                const optimalOrientation = latitude >= 0 ? 180 : 0;
                const optimalTilt = Math.abs(latitude);

                optimalOrientationEl.textContent = `${optimalOrientation}° (${latitude >= 0 ? 'Sur' : 'Norte'})`;
                optimalTiltEl.textContent = `${optimalTilt.toFixed(1)}°`;
            },
            (error) => {
                console.error('Error de geolocalización:', error.code, error.message);
                let errorMessage = 'No se pudo obtener la ubicación. ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Por favor, permite el acceso a la ubicación en los ajustes.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'La ubicación no está disponible. Asegúrate de que los servicios de ubicación están activados.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Tiempo de espera agotado. Intenta de nuevo.';
                        break;
                    default:
                        errorMessage += 'Error desconocido.';
                }
                locationEl.textContent = errorMessage;
                retryGeoButton.style.display = 'block'; // Mostrar botón de reintento
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        console.error('Geolocalización no soportada por el navegador');
        locationEl.textContent = 'Geolocalización no soportada por este navegador.';
    }
}

// Botón para reintentar geolocalización
const retryGeoButton = document.createElement('button');
retryGeoButton.textContent = 'Reintentar ubicación';
retryGeoButton.style.margin = '10px';
retryGeoButton.style.padding = '10px 20px';
retryGeoButton.style.fontSize = '16px';
retryGeoButton.style.backgroundColor = '#28a745';
retryGeoButton.style.color = '#fff';
retryGeoButton.style.border = 'none';
retryGeoButton.style.borderRadius = '5px';
retryGeoButton.style.display = 'none';
document.getElementById('container').append(retryGeoButton);

retryGeoButton.addEventListener('click', () => {
    console.log('Reintentando geolocalización');
    requestGeolocation();
});

// Ejecutar al cargar
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, configurando botón y geolocalización');
    setupSensorButton();
    requestGeolocation();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM ya está listo, configurando botón y geolocalización');
    setupSensorButton();
    requestGeolocation();
}

// Ajustar tamaño del canvas
window.addEventListener('resize', () => {
    const width = canvasContainer.offsetWidth;
    const height = Math.min(400, window.innerHeight - 100);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});