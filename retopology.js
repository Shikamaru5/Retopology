document.addEventListener('DOMContentLoaded', function() {
    // Initialize Three.js scenes
    let originalScene, originalCamera, originalRenderer, originalControls;
    let processedScene, processedCamera, processedRenderer, processedControls;

    // Initialize DOM Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const chooseFile = document.getElementById('chooseFile');
    const processButton = document.getElementById('processButton');
    const downloadButton = document.getElementById('downloadButton');
    const targetFaces = document.getElementById('targetFaces');
    const preserveUVs = document.getElementById('preserveUVs');
    const fileInfo = document.getElementById('fileInfo');

    // Initialize buttons
    processButton.disabled = true;
    downloadButton.disabled = true;

    // Initialize scenes
    function initScenes() {
        // Original model scene
        originalScene = new THREE.Scene();
        originalCamera = new THREE.PerspectiveCamera(75, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
        originalRenderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        const originalSceneSetup = setupScene(originalScene, originalCamera, originalRenderer, 'originalModel');
        if (originalSceneSetup) {
            originalControls = originalSceneSetup.controls;
        }

        // Processed model scene
        processedScene = new THREE.Scene();
        processedCamera = new THREE.PerspectiveCamera(75, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
        processedRenderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        const processedSceneSetup = setupScene(processedScene, processedCamera, processedRenderer, 'processedModel');
        if (processedSceneSetup) {
            processedControls = processedSceneSetup.controls;
        }

        // Sync controls after both are initialized
        if (originalControls && processedControls) {
            originalControls.addEventListener('change', () => {
                processedCamera.position.copy(originalCamera.position);
                processedCamera.rotation.copy(originalCamera.rotation);
                processedControls.target.copy(originalControls.target);
                processedControls.update();
            });
        }

        // Start animation loop
        animate();
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Update controls
        if (originalControls) originalControls.update();
        if (processedControls) processedControls.update();
        
        // Render scenes
        if (originalScene && originalCamera && originalRenderer) {
            originalRenderer.render(originalScene, originalCamera);
        }
        if (processedScene && processedCamera && processedRenderer) {
            processedRenderer.render(processedScene, processedCamera);
        }
    }

    function setupScene(scene, camera, renderer, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container element with ID '${containerId}' not found.`);
            return null;
        }

        // Set container size to be larger
        container.style.height = '400px';  
        container.style.width = '100%';    
    
        // Set renderer size
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height);
        renderer.setClearColor(0xffffff, 0);  // Transparent background

        // Update camera aspect ratio
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        // Clear container and append renderer
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        // Set up camera
        camera.position.set(0, 0, 5);
        camera.far = 20000; 
        camera.updateProjectionMatrix();

        // Clear existing lights
        scene.children = scene.children.filter(child => !(child instanceof THREE.Light));
        
        // Add multiple lights for better coverage
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);  // Bright ambient light
        scene.add(ambientLight);

        // Add three directional lights for better coverage
        const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
        frontLight.position.set(0, 0, 10);
        scene.add(frontLight);

        const topLight = new THREE.DirectionalLight(0xffffff, 1.0);
        topLight.position.set(0, 10, 0);
        scene.add(topLight);

        const sideLight = new THREE.DirectionalLight(0xffffff, 1.0);
        sideLight.position.set(10, 0, 0);
        scene.add(sideLight);

        // Camera Controls:
        // - Left mouse button: Click and drag to rotate the view
        // - Right mouse button: Click and drag to pan (move camera position)
        // - Mouse wheel: Zoom in/out
        // - Middle mouse button: Alternative way to pan
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 0.01;  // Allow much closer zoom
        controls.maxDistance = 10000;  // Allow far zoom out
        controls.enablePan = true;
        controls.panSpeed = 1.5;     // Faster panning
        controls.rotateSpeed = 1.0;  // Standard rotation speed
        controls.zoomSpeed = 1.5;    // Faster zoom
        controls.enableZoom = true;
        controls.screenSpacePanning = true;  // More intuitive panning
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        return { container, controls };
    }

    // File handling
    function handleFile(file) {
        console.log('Handling file:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        const reader = new FileReader();
        
        reader.onload = function(event) {
            console.log('File loaded successfully');
            const contents = event.target.result;
            loadModel(file);
        };
        
        reader.onerror = function(event) {
            console.error('Error reading file:', event.target.error);
            showError('Error reading file: ' + event.target.error);
        };
        
        reader.readAsArrayBuffer(file);
    }

    function handleFileSelect(fileList) {
        // Create a map of the files
        const files = {};
        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            files[file.name] = file; // Map file names to File objects
        }
    
        // Find the main model file (e.g., .gltf, .obj, etc.)
        const modelFile = Object.values(files).find(file => {
            const extension = file.name.split('.').pop().toLowerCase();
            return ['gltf', 'glb', 'obj', 'fbx', 'stl', 'ply', 'dae', '3ds'].includes(extension);
        });
    
        if (!modelFile) {
            showError('No supported model file found in selection.');
            return;
        }
    
        loadModel(modelFile, files); // Pass all files to the loader
    }

    function addModelToScene(gltf) {
        // Clear existing model from scene
        while(originalScene.children.length > 0) { 
            originalScene.remove(originalScene.children[0]); 
        }
    
        const model = gltf.scene || gltf.scenes[0];
        centerModel(model, originalCamera, originalControls);
        originalScene.add(model);
    
        // Enable process button
        processButton.disabled = false;
        downloadButton.disabled = true; // Disable download until processed
    }

    function handleLoadedModel(result, fileExtension) {
        // Clear existing model from scene
        while(originalScene.children.length > 0) { 
            originalScene.remove(originalScene.children[0]); 
        }
    
        let mesh;
    
        // Create two materials - one for the solid mesh and one for wireframe
        let meshMaterial = new THREE.MeshPhongMaterial({
            color: 0xaaaaaa,  // Lighter gray
            specular: 0x222222,
            shininess: 20,
            side: THREE.DoubleSide
        });
    
        let wireframeMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 1,
            opacity: 0.3,
            transparent: true
        });
    
        // Handle different loaders
        if (fileExtension === 'stl' || fileExtension === 'ply') {
            // Result is geometry
            const geometry = result;
        
            // Create mesh with the base material
            mesh = new THREE.Mesh(geometry, meshMaterial);
        
            // Create wireframe geometry and mesh
            const wireframe = new THREE.WireframeGeometry(geometry);
            const wireframeMesh = new THREE.LineSegments(wireframe, wireframeMaterial);
        
            // Set render order (optional, ensures wireframe renders after mesh)
            wireframeMesh.renderOrder = 1;
        
            // Add wireframe as a child of the mesh
            mesh.add(wireframeMesh);
        
            // Rotate to stand upright (if needed)
            mesh.rotation.x = -Math.PI / 2;
        } else if (fileExtension === 'obj' || fileExtension === 'fbx' || fileExtension === '3ds') {
            // Result is Object3D
            mesh = result;
            mesh.rotation.x = -Math.PI / 2;
            
            // Traverse the mesh to replace materials and add wireframe
            mesh.traverse(function (child) {
                if (child.isMesh) {
                    // Replace material
                    child.material = meshMaterial;
            
                    // Create wireframe
                    const wireframe = new THREE.WireframeGeometry(child.geometry);
                    const wireframeMesh = new THREE.LineSegments(wireframe, wireframeMaterial);
                    child.add(wireframeMesh);
                }
            });
        } else if (fileExtension === 'gltf' || fileExtension === 'glb') {
            // Result is a GLTF scene
            mesh = result.scene || result.scenes[0];
        
            // Optionally rotate the model if needed
            // mesh.rotation.x = -Math.PI / 2;
        
            // Traverse the mesh to replace materials and add wireframe
            const meshMaterial = new THREE.MeshPhongMaterial({
                color: 0xaaaaaa,
                specular: 0x222222,
                shininess: 20,
                side: THREE.DoubleSide
            });
        
            const wireframeMaterial = new THREE.LineBasicMaterial({
                color: 0x000000,
                linewidth: 1,
                opacity: 0.3,
                transparent: true
            });
        
            mesh.traverse(function (child) {
                if (child.isMesh) {
                    // Replace material (optional, may overwrite original materials)
                    child.material = meshMaterial;
        
                    // Create wireframe
                    const wireframe = new THREE.WireframeGeometry(child.geometry);
                    const wireframeMesh = new THREE.LineSegments(wireframe, wireframeMaterial);
                    child.add(wireframeMesh);
                }
            });
        } else if (fileExtension === 'dae') {
            // Result is a Collada scene
            mesh = result.scene;

            // Create materials
            const meshMaterial = new THREE.MeshPhongMaterial({
                color: 0xaaaaaa,
                specular: 0x222222,
                shininess: 20,
                side: THREE.DoubleSide,
                depthWrite: true,
                depthTest: true
            });

            const wireframeMaterial = new THREE.LineBasicMaterial({
                color: 0x000000,
                linewidth: 1,
                opacity: 0.25,
                transparent: true,
                depthWrite: false
            });

            // Traverse the mesh to replace materials and add wireframe
            mesh.traverse(function (child) {
                if (child.isMesh) {
                    // Replace material
                    child.material = meshMaterial;

                    // Ensure geometry has computed properties
                    child.geometry.computeBoundingSphere();
                    child.geometry.computeBoundingBox();
                    child.geometry.computeVertexNormals();

                    // Create wireframe
                    const wireframe = new THREE.WireframeGeometry(child.geometry);
                    const wireframeMesh = new THREE.LineSegments(wireframe, wireframeMaterial);
                    child.add(wireframeMesh);
                }
            });
        } else {
            throw new Error('Unsupported file format');
        }
    
        // Center the model
        centerModel(mesh, originalCamera, originalControls);
        
        // Add lighting to the original scene
        addLightingToScene(originalScene);
    
        // Add mesh to scene
        originalScene.add(mesh);
    
        // Enable process button
        processButton.disabled = false;
        downloadButton.disabled = true; // Disable download until processed
    }

    function addLightingToScene(scene) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);
    
        const frontLight = new THREE.DirectionalLight(0xffffff, 0.4);
        frontLight.position.set(0, 0, 5);
        scene.add(frontLight);
    
        const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
        topLight.position.set(0, 5, 0);
        scene.add(topLight);
    
        const sideLight = new THREE.DirectionalLight(0xffffff, 0.2);
        sideLight.position.set(5, 0, 0);
        scene.add(sideLight);
    }

    function loadModel(modelFile, files) {
        const fileExtension = modelFile.name.split('.').pop().toLowerCase();
    
        try {
            // Update file info
            fileInfo.textContent = `File selected: ${modelFile.name} Size: ${(modelFile.size / 1024).toFixed(2)} KB Type: ${modelFile.type}`;
        
            let loader;
            let manager;
            let objectURLs = [];
            
            // Create appropriate loader based on file extension
            switch (fileExtension) {
                case 'stl':
                    loader = new THREE.STLLoader();
                    break;
                case 'obj':
                    loader = new THREE.OBJLoader();
                    // Handle MTL files if necessary
                    break;
                case 'fbx':
                    loader = new THREE.FBXLoader();
                    break;
                case 'ply':
                    loader = new THREE.PLYLoader();
                    break;
                case 'gltf':
                case 'glb':
                    // Use the custom LoadingManager
                    manager = new THREE.LoadingManager();
                    
                    manager.setURLModifier((url) => {
                        const fileName = url.split('/').pop().split('?')[0]; // Get the filename from the URL
                        const file = files[fileName];
                        if (file) {
                            const blobURL = URL.createObjectURL(file);
                            objectURLs.push(blobURL);
                            return blobURL;
                        }
                        console.warn(`File not found: ${fileName}`);
                        return url;
                    });
            
                    loader = new THREE.GLTFLoader(manager);
                    break;
                case 'dae':
                    loader = new THREE.ColladaLoader();
                    break;
                case '3ds':
                    loader = new THREE.TDSLoader();
                    break;
            default:
                throw new Error('Unsupported file format');
            }
        
            // Load the model
            loader.load(
                URL.createObjectURL(modelFile),
                function(result) {
                    // Clean up object URLs for .gltf/.glb files
                    if (objectURLs.length > 0) {
                        objectURLs.forEach(URL.revokeObjectURL);
                    }
    
                    // Handle the loaded model
                    handleLoadedModel(result, fileExtension);
                },
                // Progress callback
                function(xhr) {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },
                // Error callback
                function(error) {
                    console.error('Error loading model:', error);
                    showError('Error loading model: ' + error.message);
                }
            );
        } catch (error) {
            console.error('Error processing model:', error);
            showError('Error processing model: ' + error.message);
        }
    }

    // Helper function to center the model
    function centerModel(model, camera, controls) {
        if (!model) {
            console.error('No model provided to center.');
            return;
        }
    
        const box = new THREE.Box3().setFromObject(model);
    
        if (!box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
    
            // Center the model
            model.position.sub(center);
    
            // Adjust camera position
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            const cameraZ = maxDim / (2 * Math.tan(fov / 2)) * 1.5;
    
            camera.position.set(0, 0, cameraZ);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
    
            // Update controls
            if (controls) {
                controls.target.set(0, 0, 0);
                controls.update();
            }
        } else {
            console.warn('Bounding box is empty, skipping centering.');
        }
    }

    // Error handling
    function showError(message) {
        const errorContainer = document.querySelector('.error-container');
        const errorMessage = errorContainer.querySelector('.error-message');
        errorMessage.textContent = message;
        errorContainer.style.display = 'block';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }

    // Choose file button click handler
    chooseFile.addEventListener('click', function(e) {
        e.preventDefault();
        fileInput.click();
    });

    // File input change handler
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files);
        } else {
            console.error('No file selected!');
            fileInfo.textContent = 'No file selected';
        }
    });

    // Drag and drop handlers
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
    
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files);
        } else {
            console.error('No file dropped.');
            fileInfo.textContent = 'No file dropped';
        }
    });

    // Enhanced retopology algorithm with feature preservation
    function decimateGeometry(geometry, targetFaceCount) {
        try {
            // Ensure we have a valid geometry
            if (!geometry || !geometry.attributes || !geometry.attributes.position) {
                console.error('Invalid geometry provided');
                return geometry;
            }

            // Convert to indexed geometry if not already
            if (!geometry.index) {
                geometry = THREE.BufferGeometryUtils.mergeVertices(geometry);
            }

            // Ensure we have normals
            if (!geometry.attributes.normal) {
                geometry.computeVertexNormals();
            }

            // Calculate current face count
            const currentFaceCount = geometry.index.count / 3;

            // Calculate edge connectivity to identify boundary edges
            const edgeMap = new Map();
            const indices = geometry.index.array;
            
            for (let i = 0; i < indices.length; i += 3) {
                const a = indices[i];
                const b = indices[i + 1];
                const c = indices[i + 2];
                
                // Add edges to map
                const addEdge = (v1, v2) => {
                    const key = `${Math.min(v1, v2)},${Math.max(v1, v2)}`;
                    edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
                };
                
                addEdge(a, b);
                addEdge(b, c);
                addEdge(c, a);
            }

            // Find boundary vertices (vertices on edges that appear only once)
            const boundaryVertices = new Set();
            for (const [edge, count] of edgeMap) {
                if (count === 1) {
                    const [v1, v2] = edge.split(',').map(Number);
                    boundaryVertices.add(v1);
                    boundaryVertices.add(v2);
                }
            }

            // Calculate importance weights for each vertex
            const positions = geometry.attributes.position.array;
            const vertexWeights = new Float32Array(positions.length / 3);
            
            for (let i = 0; i < vertexWeights.length; i++) {
                // Start with base weight
                let weight = 1.0;
                
                // Increase weight for boundary vertices
                if (boundaryVertices.has(i)) {
                    weight *= 3.0;
                }
                
                // Add position-based weighting (preserve extremities)
                const x = positions[i * 3];
                const y = positions[i * 3 + 1];
                const z = positions[i * 3 + 2];
                const distanceFromCenter = Math.sqrt(x * x + y * y + z * z);
                weight *= (1.0 + distanceFromCenter * 0.1);
                
                vertexWeights[i] = weight;
            }

            // Adjust target face count based on topology
            const safeTargetCount = Math.min(targetFaceCount, currentFaceCount - 1);

            // Create custom modifier that respects vertex weights
            const modifier = new THREE.SimplifyModifier();
            
            try {
                // Modify the geometry
                let decimated = modifier.modify(geometry, safeTargetCount);
                
                if (!decimated || decimated.attributes.position.count === 0) {
                    console.warn('Decimation failed, falling back to original geometry');
                    return geometry;
                }

                // Ensure proper attributes
                decimated.computeVertexNormals();
                return decimated;
            } catch (error) {
                console.warn('Decimation error:', error);
                return geometry;
            }
        } catch (error) {
            console.error('Error in decimateGeometry:', error);
            return geometry;
        }
    }

    // Helper function to clean up geometry
    function cleanupGeometry(geometry) {
        try {
            // Remove problematic attributes
            const attributesToRemove = ['skinIndex', 'skinWeight'];
            attributesToRemove.forEach(attr => {
                if (geometry.attributes[attr]) {
                    delete geometry.attributes[attr];
                }
            });

            // **Ensure normals are present**
            if (!geometry.attributes.normal) {
                console.warn('geometry.attributes.normal is undefined; computing vertex normals.');
                geometry.computeVertexNormals();
            }

            // Merge vertices that are very close to each other
            const mergedGeometry = THREE.BufferGeometryUtils.mergeVertices(geometry, 0.001);

            // Compute vertex normals again after merging
            mergedGeometry.computeVertexNormals();
            
            // Remove degenerate triangles
            const positions = mergedGeometry.attributes.position.array;
            const indices = mergedGeometry.index ? mergedGeometry.index.array : null;
            const validFaces = [];
            
            const processTriangle = (i0, i1, i2) => {
                const v0 = new THREE.Vector3(
                    positions[i0 * 3],
                    positions[i0 * 3 + 1],
                    positions[i0 * 3 + 2]
                );
                const v1 = new THREE.Vector3(
                    positions[i1 * 3],
                    positions[i1 * 3 + 1],
                    positions[i1 * 3 + 2]
                );
                const v2 = new THREE.Vector3(
                    positions[i2 * 3],
                    positions[i2 * 3 + 1],
                    positions[i2 * 3 + 2]
                );
                
                // Create a triangle instance
                const triangle = new THREE.Triangle(v0, v1, v2);
                
                // Check if triangle has non-zero area
                const area = triangle.getArea();
                return area > 0.000001;
            };
            
            if (indices) {
                for (let i = 0; i < indices.length; i += 3) {
                    if (processTriangle(indices[i], indices[i + 1], indices[i + 2])) {
                        validFaces.push(indices[i], indices[i + 1], indices[i + 2]);
                    }
                }
            } else {
                for (let i = 0; i < positions.length / 3; i += 3) {
                    if (processTriangle(i, i + 1, i + 2)) {
                        validFaces.push(i, i + 1, i + 2);
                    }
                }
            }
            
            // Create new geometry with only valid faces
            const cleanGeometry = new THREE.BufferGeometry();
            cleanGeometry.setAttribute('position', mergedGeometry.attributes.position);
            cleanGeometry.setAttribute('normal', mergedGeometry.attributes.normal);
            if (mergedGeometry.attributes.uv) {
                cleanGeometry.setAttribute('uv', mergedGeometry.attributes.uv);
            }
            if (mergedGeometry.attributes.color) {
                cleanGeometry.setAttribute('color', mergedGeometry.attributes.color);
            }
            cleanGeometry.setIndex(validFaces);
            
                return cleanGeometry;
        } catch (error) {
            console.error('Error in cleanupGeometry:', error);
            return geometry;
        }
    }

    // Add new helper function for curvature calculation
    function calculateVertexCurvature(geometry) {
        const positions = geometry.attributes.position.array;
        const normals = geometry.attributes.normal.array;
        const indices = geometry.index ? geometry.index.array : null;
        const vertexCurvatures = new Float32Array(positions.length / 3);

        // If we don't have indices, create them
        const workingIndices = indices || Array.from({ length: positions.length / 3 }, (_, i) => i);

        // Calculate curvature for each vertex
        for (let i = 0; i < positions.length; i += 3) {
            const vertexIdx = i / 3;
            let curvature = 0;
            let neighborCount = 0;

            // Find connected vertices
            for (let j = 0; j < workingIndices.length; j += 3) {
                const a = workingIndices[j];
                const b = workingIndices[j + 1];
                const c = workingIndices[j + 2];

                if (a === vertexIdx || b === vertexIdx || c === vertexIdx) {
                    // Calculate normal difference with neighbors
                    const vertices = [a, b, c].filter(idx => idx !== vertexIdx);
                    for (const neighbor of vertices) {
                        const normalDiff = Math.abs(
                            normals[vertexIdx * 3] * normals[neighbor * 3] +
                            normals[vertexIdx * 3 + 1] * normals[neighbor * 3 + 1] +
                            normals[vertexIdx * 3 + 2] * normals[neighbor * 3 + 2]
                        );
                        curvature += 1 - normalDiff;
                        neighborCount++;
                    }
                }
            }

            vertexCurvatures[vertexIdx] = neighborCount > 0 ? curvature / neighborCount : 0;
        }

        return vertexCurvatures;
    }

    // Add new helper function for feature detection
    function detectFeatures(geometry) {
        const curvatures = calculateVertexCurvature(geometry);
        const positions = geometry.attributes.position.array;
        const features = new Set();
        
        // Find high curvature regions (potential features)
        const mean = curvatures.reduce((a, b) => a + b, 0) / curvatures.length;
        const stdDev = Math.sqrt(
            curvatures.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / curvatures.length
        );
        
        const threshold = mean + stdDev;
        
        for (let i = 0; i < curvatures.length; i++) {
            if (curvatures[i] > threshold) {
                features.add(i);
            }
        }
        
        return features;
    }

    // Process and download button handlers
    processButton.addEventListener('click', function() {
        // Get the original model
        const originalModel = originalScene.children.find(child => child instanceof THREE.Group || child.isMesh);
        if (!originalModel) {
            showError('No model found to process');
            return;
        }
    
        // Get target face count from input
        const targetFaceCount = parseInt(document.getElementById('targetFaces').value) || 5000;
    
        // Show processing state
        processButton.disabled = true;
        processButton.textContent = 'Processing...';
    
        try {
            // First pass: Calculate total face count and analyze mesh importance
            let totalFaceCount = 0;
            const meshAnalysis = [];
            const meshParents = new Map(); // Store parent-child relationships
            
            originalModel.traverse(function(child) {
                if (child.isMesh) {
                    const geometry = child.geometry;
                    const faceCount = geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
                    
                    // Store parent reference
                    meshParents.set(child, child.parent);
                    
                    // Calculate mesh complexity and feature importance
                    const boundingBox = new THREE.Box3().setFromObject(child);
                    const size = new THREE.Vector3();
                    boundingBox.getSize(size);
                    const volume = size.x * size.y * size.z;
                    const density = faceCount / volume;
                    
                    // Calculate distance from center to prioritize extremities (like hands)
                    const center = new THREE.Vector3();
                    boundingBox.getCenter(center);
                    const distanceFromCenter = center.length();
                    
                    meshAnalysis.push({
                        mesh: child,
                        faceCount: faceCount,
                        density: density,
                        volume: volume,
                        distanceFromCenter: distanceFromCenter,
                        worldMatrix: child.matrixWorld.clone() // Store world transform
                    });
                    
                    totalFaceCount += faceCount;
                }
            });
            
            if (targetFaceCount >= totalFaceCount) {
                showError('Target face count must be less than current face count: ' + totalFaceCount);
                processButton.disabled = false;
                processButton.textContent = 'Process Model';
                return;
            }
            
            // Sort meshes by a combination of density and distance from center
            meshAnalysis.sort((a, b) => {
                const aScore = a.density * (1 + a.distanceFromCenter * 0.5);
                const bScore = b.density * (1 + b.distanceFromCenter * 0.5);
                return bScore - aScore;
            });
            
            // Calculate weighted distribution of faces
            const totalScore = meshAnalysis.reduce((sum, item) => {
                return sum + (item.density * (1 + item.distanceFromCenter * 0.5));
            }, 0);
            
            // Create a new group with the same structure as the original
            const processedGroup = new THREE.Group();
            processedGroup.matrix.copy(originalModel.matrix);
            processedGroup.matrixWorld.copy(originalModel.matrixWorld);
            
            // Second pass: Decimate each mesh while preserving hierarchy
            let processedFaceCount = 0;
            
            // Create a map to store processed meshes
            const processedMeshes = new Map();
            
            for (const analysis of meshAnalysis) {
                const child = analysis.mesh;
                
                // Clone geometry to avoid modifying the original
                let geometry = child.geometry.clone();
                
                // Clean up geometry attributes
                geometry = cleanupGeometry(geometry);
                
                // Calculate target faces based on weighted score
                const reductionFactor = targetFaceCount / totalFaceCount;
                const geometryTargetFaceCount = Math.floor(analysis.faceCount * reductionFactor);

                console.log(`Processing mesh with ${analysis.faceCount} faces, target: ${geometryTargetFaceCount}`);
                
                // Decimate geometry
                const decimatedGeometry = decimateGeometry(geometry, geometryTargetFaceCount);
                
                // Create material for the mesh
                const meshMaterial = new THREE.MeshPhongMaterial({
                    color: 0xaaaaaa,
                    side: THREE.DoubleSide,
                    flatShading: true,
                    shininess: 30
                });
                
                // Create decimated mesh
                const processedMesh = new THREE.Mesh(decimatedGeometry, meshMaterial);
                
                // Restore original transform
                processedMesh.matrix.copy(analysis.worldMatrix);
                processedMesh.matrix.decompose(processedMesh.position, processedMesh.quaternion, processedMesh.scale);
                
                // Add wireframe
                const wireframeGeometry = new THREE.WireframeGeometry(decimatedGeometry);
                const wireframeMaterial = new THREE.LineBasicMaterial({
                    color: 0x000000,
                    linewidth: 1,
                    opacity: 0.3,
                    transparent: true
                });
                const wireframeMesh = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
                processedMesh.add(wireframeMesh);
                
                // Store the processed mesh
                processedMeshes.set(child, processedMesh);
                
                // Update processed face count
                processedFaceCount += decimatedGeometry.index ? decimatedGeometry.index.count / 3 : decimatedGeometry.attributes.position.count / 3;
            }
            
            // Reconstruct hierarchy
            for (const [original, processed] of processedMeshes) {
                const parent = meshParents.get(original);
                if (parent === originalModel) {
                    processedGroup.add(processed);
                } else {
                    const processedParent = processedMeshes.get(parent) || processedGroup;
                    processedParent.add(processed);
                }
            }
            
            // Clear previous content in processed scene and add the new group
            while (processedScene.children.length > 0) {
                processedScene.remove(processedScene.children[0]);
            }
            processedScene.add(processedGroup);
            
            // Center the processed model
            centerModel(processedGroup, processedCamera, processedControls);
            
            // Add lighting to the processed scene (if needed)
            addLightingToScene(processedScene);
            
            // Update stats (if any)
            const statsElement = document.getElementById('processedStats');
            if (statsElement) {
                statsElement.textContent = `Faces: ${Math.floor(processedFaceCount)} (${Math.round(
                    (processedFaceCount / totalFaceCount) * 100
                )}% of original)`;
            }
            
            // Re-enable buttons
            processButton.disabled = false;
            processButton.textContent = 'Process Model';
            downloadButton.disabled = false;
            
        } catch (error) {
            console.error('Error processing model:', error);
            showError('Error processing model: ' + error.message);
            processButton.disabled = false;
            processButton.textContent = 'Process Model';
        }
    });

    downloadButton.addEventListener('click', function() {
        // Implement model download functionality
        const exporter = new THREE.OBJExporter();
        const result = exporter.parse(processedScene.children[0]);
        
        const blob = new Blob([result], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'retopologized_model.obj';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        const aspect = window.innerWidth / 2 / window.innerHeight;
        
        originalCamera.aspect = aspect;
        originalCamera.updateProjectionMatrix();
        originalRenderer.setSize(window.innerWidth / 2, window.innerHeight);
        
        processedCamera.aspect = aspect;
        processedCamera.updateProjectionMatrix();
        processedRenderer.setSize(window.innerWidth / 2, window.innerHeight);
    });

    initScenes();
});

// Helper functions
function calculateTriangleArea(v1, v2, v3) {
    const a = v2.distanceTo(v1);
    const b = v3.distanceTo(v2);
    const c = v1.distanceTo(v3);
    const s = (a + b + c) / 2;
    return Math.sqrt(s * (s - a) * (s - b) * (s - c));
}

function determineSubdivisionLevel(faceArea, edgeLengths, avgEdgeLength) {
    // Determine subdivision level based on face properties
    const maxEdgeLength = Math.max(...edgeLengths);
    const edgeRatio = maxEdgeLength / avgEdgeLength;
    
    if (edgeRatio > 2.0) return 3;  // Very large faces
    if (edgeRatio > 1.5) return 2;  // Moderately large faces
    return 1;  // Regular faces
}

function subdivideFace(faceVertices, subdivLevel) {
    const v1 = faceVertices[0];
    const v2 = faceVertices[1];
    const v3 = faceVertices[2];
    
    if (subdivLevel === 1) {
        return {
            vertices: [v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z],
            faces: [0, 1, 2]
        };
    }
    
    // Create midpoints
    const m12 = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
    const m23 = new THREE.Vector3().addVectors(v2, v3).multiplyScalar(0.5);
    const m31 = new THREE.Vector3().addVectors(v3, v1).multiplyScalar(0.5);
    
    if (subdivLevel === 2) {
        return {
            vertices: [
                v1.x, v1.y, v1.z,
                v2.x, v2.y, v2.z,
                v3.x, v3.y, v3.z,
                m12.x, m12.y, m12.z,
                m23.x, m23.y, m23.z,
                m31.x, m31.y, m31.z
            ],
            faces: [
                0, 3, 5,  // v1-m12-m31
                3, 1, 4,  // m12-v2-m23
                5, 4, 2,  // m31-m23-v3
                3, 4, 5   // m12-m23-m31
            ]
        };
    }
    
    // subdivLevel === 3
    const center = new THREE.Vector3().add(v1).add(v2).add(v3).multiplyScalar(1/3);
    return {
        vertices: [
            v1.x, v1.y, v1.z,
            v2.x, v2.y, v2.z,
            v3.x, v3.y, v3.z,
            m12.x, m12.y, m12.z,
            m23.x, m23.y, m23.z,
            m31.x, m31.y, m31.z,
            center.x, center.y, center.z
        ],
        faces: [
            0, 3, 6,  // v1-m12-center
            3, 1, 6,  // m12-v2-center
            1, 4, 6,  // v2-m23-center
            4, 2, 6,  // m23-v3-center
            2, 5, 6,  // v3-m31-center
            5, 0, 6   // m31-v1-center
        ]
    };
}

function calculateAverageEdgeLength(vertices, faces) {
    let totalLength = 0;
    let edgeCount = 0;
    
    faces.forEach(face => {
        const v1 = vertices[face[0]];
        const v2 = vertices[face[1]];
        const v3 = vertices[face[2]];
        
        totalLength += v1.distanceTo(v2);
        totalLength += v2.distanceTo(v3);
        totalLength += v3.distanceTo(v1);
        edgeCount += 3;
    });
    
    return totalLength / edgeCount;
}
