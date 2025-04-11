// Obtener elementos del DOM
const locationEl = document.getElementById('location');
const tiltEl = document.getElementById('tilt');
const orientationEl = document.getElementById('orientation');
const optimalTiltEl = document.getElementById('optimal-tilt');
const optimalOrientationEl = document.getElementById('optimal-orientation');

// Variables globales
let latitude, longitude;

// Inicializar Three.js (sin cambios)
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

// Detectar si es iOS
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Solicitar permiso para sensores en iOS
function requestDeviceOrientationPermission() {
    if (isIOS() && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                } else {
                    orientationEl.textContent = 'Permiso denegado para sensores';
                    tiltEl.textContent = 'No disponible';
                }
            })
            .catch(error => {
                console.error('Error solicitando permiso:', error);
                orientationEl.textContent = 'Error al acceder a sensores';
            });
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
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

// Añadir botón para iOS
document.addEventListener('DOMContentLoaded', () => {
    if (isIOS()) {
        const button = document.createElement('button');
        button.textContent = 'Activar sensores';
        button.style.margin = '10px';
        button.style.padding = '10px 20px';
        button.style.fontSize = '16px';
        document.getElementById('container').prepend(button);
        button.addEventListener('click', requestDeviceOrientationPermission);
    } else {
        requestDeviceOrientationPermission();
    }
});

// Obtener ubicación (sin cambios)
navigator.geolocation.getCurrentPosition(
    (position) => {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        locationEl.textContent = `Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`;

        const now = new Date();
        const sunPosition = SunCalc.getPosition(now, latitude, longitude);
        const optimalOrientation = latitude >= 0 ? 180 : 0;
        const optimalTilt = Math.abs(latitude);

        optimalOrientationEl.textContent = `${optimalOrientation}° (Sur)`;
        optimalTiltEl.textContent = `${optimalTilt.toFixed(1)}°`;
    },
    (error) => {
        locationEl.textContent = 'No se pudo obtener la ubicación';
        console.error(error);
    }
);

// Ajustar tamaño del canvas (sin cambios)
window.addEventListener('resize', () => {
    const width = canvasContainer.offsetWidth;
    renderer.setSize(width, 400);
    camera.aspect = width / 400;
    camera.updateProjectionMatrix();
});