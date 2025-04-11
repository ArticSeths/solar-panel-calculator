// Variables globales
let scene, camera, renderer, panel, currentSphere, targetSphere, orientationText, tiltText, optimalText, statusText;
let latitude, longitude, optimalOrientation, optimalTilt;
let isAligned = false;

// Inicializar Three.js
function initThreeJS() {
    console.log('Inicializando Three.js');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas').appendChild(renderer.domElement);

    // Fondo de la escena
    scene.background = new THREE.Color(0x1a1a1a);

    // Añadir luz
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // Modelo de la placa solar
    const panelGeometry = new THREE.BoxGeometry(2, 1, 0.1);
    const panelMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(0, 0, 0);
    scene.add(panel);

    // Flecha en la placa
    const arrowGeometry = new THREE.ConeGeometry(0.1, 0.5, 32);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.set(0, 0.6, 0);
    arrow.rotation.x = Math.PI / 2;
    panel.add(arrow);

    // Indicadores de alineación (esferas)
    const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    currentSphere = new THREE.Mesh(sphereGeometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    targetSphere = new THREE.Mesh(sphereGeometry, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    currentSphere.position.set(2, 1, 0);
    targetSphere.position.set(0, 0, 0);
    scene.add(currentSphere);
    scene.add(targetSphere);

    // Flechas direccionales
    const arrowShape = new THREE.Shape()
        .moveTo(0, 0.2)
        .lineTo(-0.2, -0.2)
        .lineTo(0.2, -0.2)
        .lineTo(0, 0.2);
    const extrudeSettings = { depth: 0.1, bevelEnabled: false };
    const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, extrudeSettings);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x007bff });

    const leftArrow = new THREE.Mesh(arrowGeo, arrowMat);
    leftArrow.position.set(-2, 0, 0);
    leftArrow.rotation.z = Math.PI / 2;
    scene.add(leftArrow);

    const rightArrow = new THREE.Mesh(arrowGeo, arrowMat);
    rightArrow.position.set(2, 0, 0);
    rightArrow.rotation.z = -Math.PI / 2;
    scene.add(rightArrow);

    const upArrow = new THREE.Mesh(arrowGeo, arrowMat);
    upArrow.position.set(0, 1.5, 0);
    scene.add(upArrow);

    const downArrow = new THREE.Mesh(arrowGeo, arrowMat);
    downArrow.position.set(0, -1.5, 0);
    downArrow.rotation.z = Math.PI;
    scene.add(downArrow);

    // Texto en 3D (usando sprites por simplicidad)
    function createTextSprite(message, parameters) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = 'Bold 40px Arial';
        const metrics = context.measureText(message);
        canvas.width = metrics.width;
        canvas.height = 50;
        context.font = 'Bold 40px Arial';
        context.fillStyle = parameters.color || 'white';
        context.fillText(message, 0, 40);
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(canvas.width / 50, 1, 1);
        return sprite;
    }

    orientationText = createTextSprite('Orientación: 0°', { color: 'white' });
    orientationText.position.set(-3, 2, 0);
    scene.add(orientationText);

    tiltText = createTextSprite('Inclinación: 0°', { color: 'white' });
    tiltText.position.set(-3, 1.5, 0);
    scene.add(tiltText);

    optimalText = createTextSprite('Óptimo: Calculando...', { color: 'white' });
    optimalText.position.set(-3, 1, 0);
    scene.add(optimalText);

    statusText = createTextSprite('Ajusta la posición', { color: 'red' });
    statusText.position.set(-3, -2, 0);
    scene.add(statusText);

    camera.position.z = 5;

    animate();
}

// Animación
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Detectar si es un dispositivo iOS
function isIOS() {
    const userAgent = navigator.userAgent || navigator.platform || '';
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && 'ontouchstart' in window);
    console.log('isIOS:', isIOSDevice, 'UserAgent:', userAgent);
    return isIOSDevice;
}

// Solicitar permiso para sensores
function requestDeviceOrientationPermission() {
    console.log('Solicitando permiso para DeviceOrientation');
    if (isIOS() && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                console.log('Estado del permiso:', permissionState);
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    document.getElementById('sensor-button').style.display = 'none';
                } else {
                    updateText(statusText, 'Permiso denegado', 'red');
                }
            })
            .catch(error => {
                console.error('Error solicitando permiso:', error);
                updateText(statusText, 'Error al acceder a sensores', 'red');
            });
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

// Manejar datos de orientación
function handleOrientation(event) {
    const alpha = event.alpha; // Orientación (0-360°)
    const beta = event.beta;   // Inclinación (-90 a 90°)
    console.log('Orientación:', { alpha, beta });

    if (alpha === null || beta === null) {
        console.warn('Datos de orientación no disponibles');
        return;
    }

    // Actualizar texto
    updateText(orientationText, `Orientación: ${alpha.toFixed(1)}°`);
    updateText(tiltText, `Inclinación: ${beta.toFixed(1)}°`);

    // Rotar el panel
    panel.rotation.x = THREE.MathUtils.degToRad(beta);
    panel.rotation.z = THREE.MathUtils.degToRad(-alpha);

    // Actualizar indicador de alineación
    updateAlignmentIndicator(alpha, beta);
}

// Actualizar texto en sprites
function updateText(sprite, message, color = 'white') {
    const canvas = sprite.material.map.image;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = 'Bold 40px Arial';
    const metrics = context.measureText(message);
    canvas.width = metrics.width;
    canvas.height = 50;
    context.font = 'Bold 40px Arial';
    context.fillStyle = color;
    context.fillText(message, 0, 40);
    sprite.material.map.needsUpdate = true;
    sprite.scale.set(canvas.width / 50, 1, 1);
}

// Actualizar indicador de alineación
function updateAlignmentIndicator(alpha, beta) {
    if (!optimalOrientation || !optimalTilt) return;

    const orientationDiff = Math.abs((alpha - optimalOrientation + 540) % 360 - 180);
    const tiltDiff = Math.abs(beta - optimalTilt);

    // Mover esfera actual
    const maxX = 2; // Máxima distancia horizontal
    const maxY = 1.5; // Máxima distancia vertical
    const x = (orientationDiff / 180) * maxX;
    const y = (tiltDiff / 90) * maxY;
    currentSphere.position.set(x, y, 0);

    // Verificar alineación
    isAligned = orientationDiff <= 5 && tiltDiff <= 5;
    panel.material.color.set(isAligned ? 0x00ff00 : 0xff0000);
    updateText(statusText, isAligned ? '¡Posición correcta!' : 'Ajusta la posición', isAligned ? 'green' : 'red');

    // Vibrar si está alineado
    if (isAligned && 'vibrate' in navigator && !wasAlignedLastFrame) {
        navigator.vibrate(200);
    }
    wasAlignedLastFrame = isAligned;

    // Mostrar/ocultar flechas
    scene.children.forEach(child => {
        if (child === leftArrow) child.visible = alpha > optimalOrientation + 5;
        if (child === rightArrow) child.visible = alpha < optimalOrientation - 5;
        if (child === upArrow) child.visible = beta > optimalTilt + 5;
        if (child === downArrow) child.visible = beta < optimalTilt - 5;
    });
}

// Obtener ubicación
if ('geolocation' in navigator) {
    console.log('Solicitando geolocalización');
    navigator.geolocation.getCurrentPosition(
        (position) => {
            console.log('Geolocalización obtenida:', position.coords);
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
            optimalOrientation = latitude >= 0 ? 180 : 0;
            optimalTilt = Math.abs(latitude);
            updateText(optimalText, `Óptimo: ${optimalOrientation}° / ${optimalTilt.toFixed(1)}°`);
        },
        (error) => {
            console.error('Error de geolocalización:', error.message);
            updateText(statusText, 'No se pudo obtener la ubicación', 'red');
        }
    );
} else {
    console.error('Geolocalización no soportada');
    updateText(statusText, 'Geolocalización no soportada', 'red');
}

// Configurar botón para iOS
let wasAlignedLastFrame = false;
const leftArrow = scene ? scene.children.find(c => c.position.x === -2) : null;
const rightArrow = scene ? scene.children.find(c => c.position.x === 2) : null;
const upArrow = scene ? scene.children.find(c => c.position.y === 1.5) : null;
const downArrow = scene ? scene.children.find(c => c.position.y === -1.5) : null;

if (isIOS()) {
    console.log('Dispositivo iOS detectado, añadiendo botón');
    const button = document.createElement('button');
    button.id = 'sensor-button';
    button.textContent = 'Activar sensores';
    document.body.appendChild(button);
    button.addEventListener('click', requestDeviceOrientationPermission);
} else {
    console.log('No es iOS, registrando evento de orientación');
    window.addEventListener('deviceorientation', handleOrientation);
}

// Ajustar tamaño del canvas
window.addEventListener('resize', () => {
    if (renderer && camera) {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
});

// Iniciar
try {
    initThreeJS();
} catch (error) {
    console.error('Error al iniciar la aplicación:', error);
}