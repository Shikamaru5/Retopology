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
        camera.far = 2000; 
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
        controls.minDistance = 0.5;  // Allow closer zoom
        controls.maxDistance = 100;  // Allow further zoom out
        controls.enablePan = true;
        controls.panSpeed = 1.0;     // Adjust pan speed
        controls.rotateSpeed = 1.0;  // Adjust rotation speed
        controls.zoomSpeed = 1.2;    // Slightly faster zoom
        controls.enableZoom = true;
        controls.screenSpacePanning = true;  // More intuitive panning

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

    function handleFileSelect(file) {
        if (!file) return;
        
        // Update the file info display
        fileInfo.textContent = `Selected: ${file.name}`;
        
        // Create URL for the file
        const url = URL.createObjectURL(file);
        loadModel(file);
    }

    function loadModel(file) {
        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        reader.onload = function(event) {
            const fileData = event.target.result;
            
            try {
                // Update file info
                const fileInfo = document.getElementById('fileInfo');
                if (fileInfo) {
                    fileInfo.textContent = `File selected: ${file.name} Size: ${(file.size / 1024).toFixed(2)} KB Type: ${file.type}`;
                }

                // Create appropriate loader based on file extension
                //should add .blend .usdz .gltf .dae .3DS .X and .glb
                let loader;
                switch (fileExtension) {
                    case 'stl':
                        loader = new THREE.STLLoader();
                        break;
                    case 'obj':
                        loader = new THREE.OBJLoader();
                        break;
                    case 'fbx':
                        loader = new THREE.FBXLoader();
                        break;
                    case 'ply':
                        loader = new THREE.PLYLoader();
                        break;
                    default:
                        throw new Error('Unsupported file format');
                }

                // Load the model
                loader.load(
                    URL.createObjectURL(file),
                    function(geometry) {
                        // Clear existing model if any
                        while(originalScene.children.length > 0) { 
                            originalScene.remove(originalScene.children[0]); 
                        }

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

                        let mesh;
                        if (geometry.isBufferGeometry) {
                            // Create the main mesh
                            mesh = new THREE.Mesh(geometry, meshMaterial);
                            
                            // Create wireframe mesh
                            const wireframe = new THREE.WireframeGeometry(geometry);
                            const wireframeMesh = new THREE.LineSegments(wireframe, wireframeMaterial);
                            
                            // Create a group to hold both meshes
                            const group = new THREE.Group();
                            group.add(mesh);
                            group.add(wireframeMesh);
                            
                            // Rotate to stand upright
                            group.rotation.x = -Math.PI / 2;
                            
                            mesh = group;
                        } else if (geometry.isObject3D) {
                            mesh = geometry;
                            mesh.rotation.x = -Math.PI / 2;
                        } else {
                            throw new Error('Invalid geometry format');
                        }

                        // Center the model
                        centerModel(mesh);
                        
                        // Lighting setup
                        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
                        originalScene.add(ambientLight);

                        const frontLight = new THREE.DirectionalLight(0xffffff, 0.4);
                        frontLight.position.set(0, 0, 5);
                        
                        const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
                        topLight.position.set(0, 5, 0);
                        
                        const sideLight = new THREE.DirectionalLight(0xffffff, 0.2);
                        sideLight.position.set(5, 0, 0);
                        
                        originalScene.add(frontLight);
                        originalScene.add(topLight);
                        originalScene.add(sideLight);
                        
                        originalScene.add(mesh);

                        // Enable process button
                        processButton.disabled = false;

                        // Update camera position
                        const boundingBox = new THREE.Box3().setFromObject(mesh);
                        const center = boundingBox.getCenter(new THREE.Vector3());
                        const size = boundingBox.getSize(new THREE.Vector3());
                        
                        const maxDim = Math.max(size.x, size.y, size.z);
                        const fov = originalCamera.fov * (Math.PI / 180);
                        const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2) / 2);
                        
                        originalCamera.position.set(center.x, center.y, center.z + cameraDistance);
                        originalCamera.lookAt(center);
                        originalControls.target.copy(center);
                        originalControls.update();
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
        };

        reader.onerror = function(error) {
            console.error('Error reading file:', error);
            showError('Error reading file: ' + error.message);
        };

        // Read the file
        reader.readAsArrayBuffer(file);
    }

    // Helper function to center the model
    function centerModel(model) {
        if (!model) {
            console.error('No model provided to center.');
            return;
        }

        const box = new THREE.Box3().setFromObject(model);
        console.log('Bounding box:', box);

        if (!box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            console.log('Model center:', center, 'Model size:', size);

            model.position.sub(center); // Center the model
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = originalCamera.fov * (Math.PI / 180);
            const cameraZ = Math.abs(maxDim / Math.tan(fov / 2)) * 1.5;
            originalCamera.position.z = cameraZ;
            originalCamera.updateProjectionMatrix();
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
            const file = e.target.files[0];
            console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
            handleFileSelect(file);
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
            console.log('Dropped file:', files[0].name);
            handleFileSelect(files[0]);
        } else {
            console.error('No file dropped.');
            fileInfo.textContent = 'No file dropped';
        }
    });

    // Enhanced retopology algorithm with feature preservation
    function decimateGeometry(geometry, targetFaceCount) {
        try {
            // Ensure we have a valid geometry to work with
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

            // Create modifier
            const modifier = new THREE.SimplifyModifier();

            // Calculate safe target count
            const currentCount = geometry.attributes.position.count / 3;
            const safeTargetCount = Math.max(targetFaceCount, Math.floor(currentCount * 0.1));
            console.log(`Decimating from ${currentCount} to ${safeTargetCount} faces`);

            try {
                // Perform initial decimation
                let decimated = modifier.modify(geometry, safeTargetCount);
                
                // Ensure we got a valid result
                if (!decimated || decimated.attributes.position.count === 0) {
                    console.warn('Decimation failed, falling back to original geometry');
                    return geometry;
                }

                // Compute new normals
                decimated.computeVertexNormals();

                // Optional: Clean up small triangles and improve edge flow
                decimated = cleanupGeometry(decimated);

                return decimated;
            } catch (modifierError) {
                console.error('Error during decimation:', modifierError);
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
            // Merge vertices that are very close to each other
            const mergedGeometry = THREE.BufferGeometryUtils.mergeVertices(geometry, 0.001);
            
            // Compute vertex normals
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
                
                // Check if triangle has non-zero area
                const area = THREE.Triangle.getArea(v0, v1, v2);
                return area > 0.000001;
            };
            
            if (indices) {
                for (let i = 0; i < indices.length; i += 3) {
                    if (processTriangle(indices[i], indices[i + 1], indices[i + 2])) {
                        validFaces.push(indices[i], indices[i + 1], indices[i + 2]);
                    }
                }
            } else {
                for (let i = 0; i < positions.length; i += 9) {
                    if (processTriangle(i/3, i/3 + 1, i/3 + 2)) {
                        validFaces.push(i/3, i/3 + 1, i/3 + 2);
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
            cleanGeometry.setIndex(validFaces);
            
            return cleanGeometry;
        } catch (error) {
            console.error('Error in cleanupGeometry:', error);
            return geometry;
        }
    }

    // Process and download button handlers
    processButton.addEventListener('click', function() {
        // Get the original mesh
        const originalMesh = originalScene.children.find(child => child instanceof THREE.Mesh || child instanceof THREE.Group);
        if (!originalMesh) {
            showError('No model found to process');
            return;
        }

        // Show processing state
        processButton.disabled = true;
        processButton.textContent = 'Processing...';

        try {
            // Get the geometry
            let geometry;
            if (originalMesh instanceof THREE.Group) {
                const firstMesh = originalMesh.children.find(child => child instanceof THREE.Mesh);
                if (!firstMesh) throw new Error('No mesh found in group');
                geometry = firstMesh.geometry.clone();
            } else {
                geometry = originalMesh.geometry.clone();
            }

            console.log('Original geometry:', {
                vertices: geometry.attributes.position.count,
                faces: geometry.attributes.position.count / 3,
                indexed: !!geometry.index
            });

            // Get target face count
            const targetFaceCount = parseInt(document.getElementById('targetFaces').value) || 5000;
            
            // Calculate current face count
            const currentFaces = geometry.attributes.position.count / 3;
            
            // Don't process if target faces is greater than current faces
            if (targetFaceCount >= currentFaces) {
                showError('Target face count must be less than current face count: ' + currentFaces);
                processButton.disabled = false;
                processButton.textContent = 'Process Model';
                return;
            }

            console.log('Processing mesh:', {
                currentFaces,
                targetFaceCount
            });

            // Decimate the geometry
            const decimatedGeometry = decimateGeometry(geometry, targetFaceCount);

            console.log('Final geometry:', {
                vertices: decimatedGeometry.attributes.position.count,
                faces: decimatedGeometry.attributes.position.count / 3,
                indexed: !!decimatedGeometry.index
            });

            // Create material
            const material = new THREE.MeshPhongMaterial({
                color: 0x808080,
                side: THREE.DoubleSide,
                flatShading: true,
                shininess: 30
            });

            // Create the processed mesh
            const processedMesh = new THREE.Mesh(decimatedGeometry, material);
            
            // Clear previous processed scene content
            while (processedScene.children.length > 0) {
                processedScene.remove(processedScene.children[0]);
            }

            // Copy transformation from original mesh
            processedMesh.position.copy(originalMesh.position);
            processedMesh.rotation.copy(originalMesh.rotation);
            processedMesh.scale.copy(originalMesh.scale);
            
            // Add to scene
            processedScene.add(processedMesh);

            // Update stats if the element exists
            const statsElement = document.getElementById('processedStats');
            if (statsElement) {
                const processedFaces = decimatedGeometry.attributes.position.count / 3;
                statsElement.textContent = `Faces: ${Math.floor(processedFaces)} (${Math.round((processedFaces/currentFaces) * 100)}% of original)`;
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
