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

// Posicionar la cámara
camera.position.z = 5;

// Animación del renderizado
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Obtener ubicación
navigator.geolocation.getCurrentPosition(
    (position) => {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        locationEl.textContent = `Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`;

        // Calcular posición del sol con SunCalc
        const now = new Date();
        const sunPosition = SunCalc.getPosition(now, latitude, longitude);
        const sunAzimuth = (sunPosition.azimuth * 180) / Math.PI; // Convertir a grados
        const sunAltitude = (sunPosition.altitude * 180) / Math.PI;

        // Orientación óptima: hacia el sur (180° en el hemisferio norte)
        const optimalOrientation = latitude >= 0 ? 180 : 0;
        // Inclinación óptima: aproximada a la latitud
        const optimalTilt = Math.abs(latitude);

        optimalOrientationEl.textContent = `${optimalOrientation}° (Sur)`;
        optimalTiltEl.textContent = `${optimalTilt.toFixed(1)}°`;
    },
    (error) => {
        locationEl.textContent = 'No se pudo obtener la ubicación';
        console.error(error);
    }
);

// Acceder al giroscopio
window.addEventListener('deviceorientation', (event) => {
    const alpha = event.alpha; // Orientación respecto al norte (0-360°)
    const beta = event.beta;   // Inclinación vertical (-90 a 90°)

    // Actualizar información en pantalla
    orientationEl.textContent = alpha ? `${alpha.toFixed(1)}°` : 'No disponible';
    tiltEl.textContent = beta ? `${beta.toFixed(1)}°` : 'No disponible';

    // Rotar el panel en 3D según la orientación del dispositivo
    if (alpha !== null && beta !== null) {
        panel.rotation.x = THREE.MathUtils.degToRad(beta);
        panel.rotation.z = THREE.MathUtils.degToRad(-alpha);
    }
});

// Ajustar el tamaño del canvas al redimensionar
window.addEventListener('resize', () => {
    const width = canvasContainer.offsetWidth;
    renderer.setSize(width, 400);
    camera.aspect = width / 400;
    camera.updateProjectionMatrix();
});