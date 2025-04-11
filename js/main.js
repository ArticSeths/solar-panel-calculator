// Obtener elementos del DOM
const locationEl = document.getElementById('location');
const tiltEl = document.getElementById('tilt');
const orientationEl = document.getElementById('orientation');
const optimalTiltEl = document.getElementById('optimal-tilt');
const optimalOrientationEl = document.getElementById('optimal-orientation');
const alignmentStatusEl = document.getElementById('alignment-status');
const targetCircle = document.getElementById('target-circle');
const currentCircle = document.getElementById('current-circle');
const arrowLeft = document.getElementById('arrow-left');
const arrowRight = document.getElementById('arrow-right');
const arrowUp = document.getElementById('arrow-up');
const arrowDown = document.getElementById('arrow-down');

// Variables globales
let latitude, longitude, optimalOrientation, optimalTilt;

// Inicializar Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 320, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const canvasContainer = document.getElementById('canvas-container');
renderer.setSize(canvasContainer.offsetWidth, 320);
canvasContainer.appendChild(renderer.domElement);

// Crear una placa solar más realista (rectángulo azul oscuro)
const geometry = new THREE.BoxGeometry(2, 1, 0.1);
const material = new THREE.MeshStandardMaterial({ color: 0x1e3a8a });
const panel = new THREE.Mesh(geometry, material);
scene.add(panel);

// Añadir una flecha que apunte a la orientación óptima
const arrowGeometry = new THREE.ConeGeometry(0.1, 0.5, 32);
const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
arrow.position.set(0, 0.6, 0);
arrow.rotation.x = Math.PI / 2;
scene.add(arrow);

// Añadir luz para el modelo
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

camera.position.z = 3;

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Detectar si es un dispositivo iOS
function isIOS() {
    const userAgent = navigator.userAgent || navigator.platform || '';
    return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && 'ontouchstart' in window);
}

// Solicitar permiso para sensores
function requestDeviceOrientationPermission() {
    if (isIOS() && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    document.getElementById('sensor-button').style.display = 'none';
                } else {
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
    const alpha = event.alpha; // Orientación (0-360°)
    const beta = event.beta;   // Inclinación (-90 a 90°)

    if (alpha === null || beta === null) return;

    orientationEl.textContent = `${alpha.toFixed(1)}°`;
    tiltEl.textContent = `${beta.toFixed(1)}°`;

    // Rotar el panel en 3D
    panel.rotation.x = THREE.MathUtils.degToRad(beta);
    panel.rotation.z = THREE.MathUtils.degToRad(-alpha);

    // Actualizar indicador de alineación
    updateAlignmentIndicator(alpha, beta);
}

// Actualizar indicador de alineación
function updateAlignmentIndicator(alpha, beta) {
    if (!optimalOrientation || !optimalTilt) return;

    // Calcular diferencias
    const orientationDiff = Math.abs((alpha - optimalOrientation + 540) % 360 - 180);
    const tiltDiff = Math.abs(beta - optimalTilt);

    // Mover círculos en el indicador
    const indicatorWidth = document.getElementById('alignment-indicator').offsetWidth;
    const indicatorHeight = document.getElementById('alignment-indicator').offsetHeight;
    const x = (orientationDiff / 180) * (indicatorWidth / 2); // Normalizar a la mitad del ancho
    const y = (tiltDiff / 90) * (indicatorHeight / 2);        // Normalizar a la mitad del alto

    currentCircle.style.left = `${indicatorWidth / 2 + x}px`;
    currentCircle.style.top = `${indicatorHeight / 2 + y}px`;
    targetCircle.style.left = `${indicatorWidth / 2}px`;
    targetCircle.style.top = `${indicatorHeight / 2}px`;

    // Mostrar flechas direccionales
    arrowLeft.classList.toggle('hidden', alpha >= optimalOrientation - 5);
    arrowRight.classList.toggle('hidden', alpha <= optimalOrientation + 5);
    arrowUp.classList.toggle('hidden', beta >= optimalTilt - 5);
    arrowDown.classList.toggle('hidden', beta <= optimalTilt + 5);

    arrowLeft.style.left = `${indicatorWidth / 4}px`;
    arrowRight.style.left = `${3 * indicatorWidth / 4}px`;
    arrowUp.style.top = `${indicatorHeight / 4}px`;
    arrowDown.style.top = `${3 * indicatorHeight / 4}px`;

    // Verificar si está alineado (margen de ±5°)
    const isAligned = orientationDiff <= 5 && tiltDiff <= 5;

    // Actualizar color del panel
    material.color.setHSL(isAligned ? 0.33 : 0, 1, 0.5); // Verde si alineado, rojo si no

    // Actualizar estado de alineación
    alignmentStatusEl.textContent = isAligned ? '¡Posición correcta!' : 'Ajusta la orientación e inclinación';
    alignmentStatusEl.className = `font-bold text-center mt-2 ${isAligned ? 'text-green-600' : 'text-red-600'}`;

    // Vibrar si está alineado (si la API está disponible)
    if (isAligned && 'vibrate' in navigator) {
        navigator.vibrate(200);
    }
}

// Obtener ubicación
navigator.geolocation.getCurrentPosition(
    (position) => {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        locationEl.textContent = `Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`;

        // Calcular valores óptimos
        optimalOrientation = latitude >= 0 ? 180 : 0;
        optimalTilt = Math.abs(latitude);

        optimalOrientationEl.textContent = `${optimalOrientation}° (${latitude >= 0 ? 'Sur' : 'Norte'})`;
        optimalTiltEl.textContent = `${optimalTilt.toFixed(1)}°`;
    },
    (error) => {
        locationEl.textContent = 'No se pudo obtener la ubicación';
        console.error(error);
    }
);

// Configurar botón para iOS
if (isIOS()) {
    const button = document.createElement('button');
    button.id = 'sensor-button';
    button.textContent = 'Activar sensores';
    button.className = 'block mx-auto mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg';
    document.getElementById('container').prepend(button);
    button.addEventListener('click', requestDeviceOrientationPermission);
} else {
    window.addEventListener('deviceorientation', handleOrientation);
}

// Ajustar tamaño del canvas
window.addEventListener('resize', () => {
    const width = canvasContainer.offsetWidth;
    const height = 320;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});