import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Black background for better extraction
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    preserveDrawingBuffer: true // Important for capturing the image
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cursor parameters
const radius = 1;
const upperHeight = 2;
const lowerHeight = 1;
const segments = 32;
const tiltAngle = Math.PI / 10; // 15 degrees tilt to the left

// Define missing variables needed for capture functionality
let animating = false;
let currentFrame = 0;
const totalFrames = 36;

// Add environment map for reflections on the metal material
const cubeTextureLoader = new THREE.CubeTextureLoader();
const envMap = cubeTextureLoader.load([
    'https://threejs.org/examples/textures/cube/pisa/px.png',
    'https://threejs.org/examples/textures/cube/pisa/nx.png',
    'https://threejs.org/examples/textures/cube/pisa/py.png',
    'https://threejs.org/examples/textures/cube/pisa/ny.png',
    'https://threejs.org/examples/textures/cube/pisa/pz.png',
    'https://threejs.org/examples/textures/cube/pisa/nz.png'
]);
scene.environment = envMap;

// Create upper cone with red stainless steel material
const upperConeGeometry = new THREE.ConeGeometry(radius, upperHeight, segments);
const redSteelMaterial = new THREE.MeshStandardMaterial({
    color: 0xcc1414,         // Bright red color
    metalness: 0.9,          // High metalness for steel look
    roughness: 0.2,          // Low roughness for polished appearance
    envMap: envMap,          // Environment map for reflections
    envMapIntensity: 1.0     // Reflection intensity
});
const upperCone = new THREE.Mesh(upperConeGeometry, redSteelMaterial);
// Position upper cone so its base is at y=0
upperCone.position.y = upperHeight / 2;

// Create lower cone (inverted) with same material
const lowerConeGeometry = new THREE.ConeGeometry(radius, lowerHeight, segments);
const lowerCone = new THREE.Mesh(lowerConeGeometry, redSteelMaterial);
lowerCone.rotation.x = Math.PI; // Rotate 180 degrees to invert
// Position lower cone so its base is at y=0
lowerCone.position.y = -lowerHeight / 2;

// Create a group to hold both cones
const cursor = new THREE.Group();
cursor.add(upperCone);
cursor.add(lowerCone);

// Create an outer container for the cursor to handle rotation correctly
const cursorContainer = new THREE.Group();
cursorContainer.add(cursor);
const scale = 1;
cursorContainer.scale.set(scale, scale, scale);
scene.add(cursorContainer);

// Tilt the cursor to the left (around Z-axis)
cursor.rotation.z = tiltAngle;

// Add lights (simplified lighting setup)
// Main directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
directionalLight.position.set(3.5, 5, 2);
scene.add(directionalLight);

// Secondary directional light from opposite side for better reflections
const secondaryLight = new THREE.DirectionalLight(0xffffff, 2);
secondaryLight.position.set(3.5, -2, 2); // Changed light angle to illuminate bottom cone better
scene.add(secondaryLight);

// Ambient light for overall illumination
const ambientLight = new THREE.AmbientLight(0x404040, 12);
scene.add(ambientLight);

// Position camera
camera.position.z = 6;
camera.position.y = 1.5;
camera.lookAt(0, 0, 0);

// Setup for cursor capture
// Create a separate renderer for capturing with transparent background
const captureRenderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    preserveDrawingBuffer: true
});
captureRenderer.setSize(32, 32); // Standard cursor size
captureRenderer.setClearColor(0x000000, 0); // Transparent background
captureRenderer.domElement.style.display = 'none'; // Hide this renderer
document.body.appendChild(captureRenderer.domElement);

// Create a scene specifically for cursor capture with transparent background
const captureScene = new THREE.Scene();
captureScene.background = null; // Transparent background

// Clone the cursor for the capture scene
const captureCursorContainer = cursorContainer.clone();
captureScene.add(captureCursorContainer);

// Add the same lights to the capture scene
const captureDirLight = directionalLight.clone();
captureScene.add(captureDirLight);
const captureSecLight = secondaryLight.clone();
captureScene.add(captureSecLight);
const captureAmbLight = ambientLight.clone();
captureScene.add(captureAmbLight);

// Orthographic camera for cursor capture (no perspective distortion)
const captureCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 100);
captureCamera.position.z = 6;
captureCamera.position.y = 1.5;
captureCamera.lookAt(0, 0, 0);

// Creates an X11 cursor file (.xcur) from the current view
function captureCursor() {
    // Render the scene to the hidden capture renderer
    captureRenderer.render(captureScene, captureCamera);
    
    // Get image data from capture canvas
    const imageDataURL = captureRenderer.domElement.toDataURL("image/png");

    // Create a download link for the PNG image
    const link = document.createElement("a");
    link.href = imageDataURL;
    link.download = `cursor_${currentFrame.toString().padStart(2, '0')}.png`; // Set filename
    link.click(); // Trigger download

    // Output instructions for GNOME cursor conversion
    if (currentFrame === 0) {
        console.log("To create a GNOME cursor from these images, follow these steps:");
        console.log("1. Install xcursorgen: sudo apt-get install xcursorgen");
        console.log("2. Create a config file named red_cursor.config with the content:");
        console.log("   24 0 0 cursor_00.png 10");
        console.log("3. Run: xcursorgen red_cursor.config red_cursor");
        console.log("4. Copy the resulting file to ~/.icons/default/cursors/");
        console.log("5. Update your cursor theme in GNOME Settings");
    }
}

// Function to capture multiple cursor frames for animation
function captureMultipleFrames() {
    if (animating) return;

    animating = true;
    currentFrame = 0;

    // Reset cursor rotation to initial state
    cursor.rotation.y = 0;
    captureCursorContainer.children[0].rotation.y = 0;

    captureFrame();
}

// Capture a single frame and schedule the next one
function captureFrame() {
    if (currentFrame >= totalFrames) {
        animating = false;
        console.log("Finished capturing all frames!");
        return;
    }

    // Rotate cursor by an appropriate amount for each frame
    const rotationAmount = (currentFrame / totalFrames) * Math.PI * 2;
    captureCursorContainer.children[0].rotation.y = rotationAmount;

    // Capture the current frame
    captureCursor();

    // Wait a moment before capturing the next frame to ensure the download dialog doesn't overlap
    setTimeout(() => {
        currentFrame++;
        captureFrame();
    }, 300);
}

// Animation loop - no rotation now
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Add keyboard shortcuts
document.addEventListener("keydown", (event) => {
    if (event.key === "s") { // Press 'S' to save current frame
        captureCursor();
    } else if (event.key === "a") { // Press 'A' to capture animation frames
        captureMultipleFrames();
    }
});

// Instructions in UI
const instructions = document.createElement("div");
instructions.style.position = "absolute";
instructions.style.top = "10px";
instructions.style.left = "10px";
instructions.style.color = "black";
instructions.style.fontFamily = "Arial, sans-serif";
instructions.style.padding = "10px";
instructions.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
instructions.style.borderRadius = "5px";
instructions.innerHTML = `
    <h3>Cursor Capture Tool</h3>
    <p>Press <b>S</b> to capture current frame</p>
    <p>Press <b>A</b> to capture 36 frames for animation</p>
`;
document.body.appendChild(instructions);

animate();