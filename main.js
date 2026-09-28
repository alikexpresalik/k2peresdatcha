import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1117);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 4, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(8, 15, 10);
dirLight.castShadow = true;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x6366f1, 0.8);
fillLight.position.set(-10, -5, -10);
scene.add(fillLight);

const gridHelper = new THREE.GridHelper(20, 20, 0x3b82f6, 0x1f2937);
scene.add(gridHelper);

const cubeGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const cubeMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.1 });
const cube = new THREE.Mesh(cubeGeo, cubeMat);
cube.position.set(-4, 1, -2);
cube.castShadow = true;
scene.add(cube);

const torusGeo = new THREE.TorusGeometry(0.8, 0.25, 24, 64);
const torusMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.2, metalness: 0.1 });
const torus = new THREE.Mesh(torusGeo, torusMat);
torus.position.set(4, 1.5, -2);
torus.castShadow = true;
scene.add(torus);

function cleanModel(model, fallbackColor) {
    const toRemove = [];

    model.traverse((child) => {
        if (child.isMesh) {
            const name = child.name.toLowerCase();
            if (name.includes('plane') || name.includes('floor') || name.includes('ground') || name.includes('studio') || name.includes('backdrop') || name.includes('light') || name.includes('camera')) {
                toRemove.push(child);
                return;
            }

            if (child.geometry) {
                child.geometry.computeVertexNormals();
                child.geometry.computeBoundingBox();
                const box = child.geometry.boundingBox;
                const size = new THREE.Vector3();
                box.getSize(size);
                
                if (size.y < 0.05 && (size.x > 5 || size.z > 5)) {
                    toRemove.push(child);
                    return;
                }
            }

            child.castShadow = true;
            child.receiveShadow = true;

            child.material = new THREE.MeshStandardMaterial({
                color: fallbackColor,
                roughness: 0.4,
                metalness: 0.1,
                side: THREE.DoubleSide
            });
        }
    });

    toRemove.forEach((mesh) => {
        if (mesh.parent) {
            mesh.parent.remove(mesh);
        }
    });
}

function normalizeModel(model, targetSize, posX, posZ) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
        const scale = targetSize / maxDim;
        model.scale.set(scale, scale, scale);
    }

    const newBox = new THREE.Box3().setFromObject(model);
    model.position.set(posX, -newBox.min.y, posZ);
}

const objLoader = new OBJLoader();

objLoader.load('cnek.obj', (obj) => {
    const toRemove = [];
    let maxVerts = 0;

    obj.traverse((child) => {
        if (child.isMesh && child.geometry && child.geometry.attributes.position) {
            maxVerts = Math.max(maxVerts, child.geometry.attributes.position.count);
        }
    });

    obj.traverse((child) => {
        if (child.isMesh) {
            const name = child.name.toLowerCase();
            const count = child.geometry && child.geometry.attributes.position ? child.geometry.attributes.position.count : 0;
            if (name.includes('box') || name.includes('tent') || name.includes('roof') || name.includes('reflector') || name.includes('softbox') || (maxVerts > 0 && count < maxVerts * 0.25)) {
                toRemove.push(child);
            }
        }
    });

    toRemove.forEach((mesh) => {
        if (mesh.parent) {
            mesh.parent.remove(mesh);
        }
    });

    cleanModel(obj, 0x8b5cf6);
    normalizeModel(obj, 1.5, 0, 0);
    scene.add(obj);
});

objLoader.load('teamugobj.obj', (obj) => {
    cleanModel(obj, 0x10b981);
    normalizeModel(obj, 1.2, -2.5, 1.5);
    scene.add(obj);
});

const fbxLoader = new FBXLoader();
let watchModel = null;

fbxLoader.load('handwatch.fbx', (fbx) => {
    cleanModel(fbx, 0xf59e0b);
    normalizeModel(fbx, 1.5, 2.5, 1.5);
    watchModel = fbx;
    scene.add(fbx);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.012;

    torus.rotation.x += 0.015;
    torus.rotation.z += 0.01;

    if (watchModel) {
        watchModel.rotation.y += 0.01;
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();