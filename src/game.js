
+const canvas = document.getElementById("gameCanvas");
+const engine = new BABYLON.Engine(canvas, true, { stencil: true });
+
+const reputationEl = document.getElementById("reputation");
+const sprayEnergyEl = document.getElementById("sprayEnergy");
+const nightModeEl = document.getElementById("nightMode");
+const eventLogEl = document.getElementById("eventLog");
+
+const state = {
+    reputation: 0,
+    sprayEnergy: 100,
+    sprayCooldown: 0,
+    sprayCombo: 0,
+    isNight: false,
+    logTimeout: null,
+};
+
+const inputMap = {
+    forward: false,
+    backward: false,
+    left: false,
+    right: false,
+    sprint: false,
+    interact: false,
+};
+
+const graffitiSurfaces = [];
+const vehicles = [];
+const sprayCans = [];
+const guards = [];
+
+const scene = createScene();
+engine.runRenderLoop(() => {
+    scene.render();
+});
+
+window.addEventListener("resize", () => {
+    engine.resize();
+});
+
+function createScene() {
+    const scene = new BABYLON.Scene(engine);
+    scene.collisionsEnabled = true;
+    scene.gravity = new BABYLON.Vector3(0, -9.81, 0);
+    scene.ambientColor = new BABYLON.Color3(0.08, 0.1, 0.16);
+    scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
+    scene.fogDensity = 0.0035;
+    scene.fogColor = new BABYLON.Color3(0.05, 0.06, 0.09);
+
+    const camera = new BABYLON.ArcRotateCamera(
+        "streetCam",
+        BABYLON.Tools.ToRadians(120),
+        BABYLON.Tools.ToRadians(60),
+        14,
+        BABYLON.Vector3.Zero(),
+        scene
+    );
+    camera.lowerRadiusLimit = 8;
+    camera.upperRadiusLimit = 28;
+    camera.lowerBetaLimit = BABYLON.Tools.ToRadians(15);
+    camera.upperBetaLimit = BABYLON.Tools.ToRadians(80);
+    camera.wheelDeltaPercentage = 0.02;
+    camera.panningSensibility = 0;
+    camera.attachControl(canvas, true);
+
+    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.1, 1, 0.1), scene);
+    hemi.intensity = 0.95;
+
+    const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.3, -1, 0.2), scene);
+    sun.position = new BABYLON.Vector3(40, 60, -20);
+    sun.intensity = 0.9;
+    sun.shadowMinZ = 1;
+    sun.shadowMaxZ = 200;
+
+    createSkybox(scene);
+    const ground = createGround(scene);
+    const player = createPlayer(scene);
+    camera.target = player.position;
+
+    createCity(scene);
+    createStreetProps(scene);
+    spawnSprayCans(scene);
+    spawnGuards(scene);
+    spawnVehicles(scene);
+
+    setupInput(scene);
+    setupGameLoop(scene, camera, player);
+
+    toggleNight(false, scene, hemi, sun);
+
+    return scene;
+}
+
+function createSkybox(scene) {
+    const skybox = BABYLON.MeshBuilder.CreateBox("sky", { size: 600 }, scene);
+    const material = new BABYLON.StandardMaterial("skyMat", scene);
+    material.backFaceCulling = false;
+    const texture = new BABYLON.DynamicTexture("skyTex", { width: 1024, height: 1024 }, scene, false);
+    const ctx = texture.getContext();
+    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
+    gradient.addColorStop(0, "#1a2a6c");
+    gradient.addColorStop(0.5, "#16213e");
+    gradient.addColorStop(1, "#05070e");
+    ctx.fillStyle = gradient;
+    ctx.fillRect(0, 0, 1024, 1024);
+    texture.update(false);
+    material.diffuseTexture = texture;
+    material.specularColor = BABYLON.Color3.Black();
+    material.disableLighting = true;
+    skybox.material = material;
+}
+
+function createGround(scene) {
+    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 240, height: 240 }, scene);
+    ground.checkCollisions = true;
+    const mat = new BABYLON.StandardMaterial("street", scene);
+    const texture = new BABYLON.DynamicTexture("streetTex", { width: 1024, height: 1024 }, scene, false);
+    const ctx = texture.getContext();
+    ctx.fillStyle = "#1b1b1e";
+    ctx.fillRect(0, 0, 1024, 1024);
+    ctx.lineWidth = 8;
+    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
+    for (let i = 64; i < 1024; i += 64) {
+        ctx.beginPath();
+        ctx.moveTo(0, i);
+        ctx.lineTo(1024, i);
+        ctx.stroke();
+        ctx.beginPath();
+        ctx.moveTo(i, 0);
+        ctx.lineTo(i, 1024);
+        ctx.stroke();
+    }
+    ctx.strokeStyle = "#f2f23a";
+    ctx.setLineDash([40, 40]);
+    ctx.lineWidth = 14;
+    ctx.beginPath();
+    ctx.moveTo(0, 512);
+    ctx.lineTo(1024, 512);
+    ctx.stroke();
+    ctx.beginPath();
+    ctx.moveTo(512, 0);
+    ctx.lineTo(512, 1024);
+    ctx.stroke();
+    texture.update(false);
+    mat.diffuseTexture = texture;
+    mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
+    ground.material = mat;
+    return ground;
+}
+
+function createPlayer(scene) {
+    const body = BABYLON.MeshBuilder.CreateCapsule("player", { height: 2, radius: 0.5 }, scene);
+    body.position = new BABYLON.Vector3(0, 1, 0);
+    body.checkCollisions = true;
+    body.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
+    body.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
+
+    const material = new BABYLON.StandardMaterial("playerMat", scene);
+    material.diffuseColor = new BABYLON.Color3(0.9, 0.24, 0.32);
+    material.emissiveColor = new BABYLON.Color3(0.3, 0.05, 0.08);
+    body.material = material;
+
+    const visor = BABYLON.MeshBuilder.CreateBox("visor", { width: 0.4, height: 0.25, depth: 0.1 }, scene);
+    visor.parent = body;
+    visor.position = new BABYLON.Vector3(0, 0.4, 0.55);
+    const visorMat = new BABYLON.StandardMaterial("visorMat", scene);
+    visorMat.diffuseColor = new BABYLON.Color3(0.1, 0.6, 0.9);
+    visorMat.emissiveColor = new BABYLON.Color3(0.05, 0.45, 0.75);
+    visor.material = visorMat;
+
+    return body;
+}
+
+function createCity(scene) {
+    const blockOffsets = [
+        new BABYLON.Vector3(0, 0, 0),
+        new BABYLON.Vector3(40, 0, 20),
+        new BABYLON.Vector3(-40, 0, -40),
+        new BABYLON.Vector3(60, 0, -60),
+        new BABYLON.Vector3(-80, 0, 60),
+    ];
+
+    blockOffsets.forEach((offset, i) => {
+        const baseHeight = 8 + (i % 3) * 4;
+        for (let x = -1; x <= 1; x++) {
+            for (let z = -1; z <= 1; z++) {
+                if (Math.abs(x) + Math.abs(z) === 0) {
+                    continue;
+                }
+                const height = baseHeight + Math.random() * 10;
+                const building = BABYLON.MeshBuilder.CreateBox(
+                    `building-${i}-${x}-${z}`,
+                    { width: 12, depth: 12, height },
+                    scene
+                );
+                building.position = offset.add(new BABYLON.Vector3(x * 14, height / 2, z * 14));
+                building.checkCollisions = true;
+                const mat = new BABYLON.StandardMaterial("buildingMat" + Math.random(), scene);
+                const colorShift = 0.2 + Math.random() * 0.35;
+                mat.diffuseColor = new BABYLON.Color3(colorShift, 0.12 + Math.random() * 0.2, 0.14 + Math.random() * 0.25);
+                mat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.05);
+                building.material = mat;
+
+                createGraffitiWall(scene, building);
+            }
+        }
+    });
+}
+
+function createGraffitiWall(scene, building) {
+    const halfWidth = 6.5;
+    const halfDepth = 6.5;
+    const surfaces = [
+        { normal: new BABYLON.Vector3(0, 0, 1), offset: new BABYLON.Vector3(0, 0, halfDepth) },
+        { normal: new BABYLON.Vector3(0, 0, -1), offset: new BABYLON.Vector3(0, 0, -halfDepth) },
+        { normal: new BABYLON.Vector3(1, 0, 0), offset: new BABYLON.Vector3(halfWidth, 0, 0) },
+        { normal: new BABYLON.Vector3(-1, 0, 0), offset: new BABYLON.Vector3(-halfWidth, 0, 0) },
+    ];
+
+    surfaces.forEach((surface, index) => {
+        const plane = BABYLON.MeshBuilder.CreatePlane(
+            `${building.name}-wall-${index}`,
+            { width: 10, height: 6 },
+            scene
+        );
+        plane.position = building.position.add(surface.offset).add(new BABYLON.Vector3(0, 4, 0));
+        plane.lookAt(plane.position.subtract(surface.normal));
+        plane.isPickable = true;
+        plane.checkCollisions = false;
+        plane.metadata = { graffitiSurface: true };
+
+        const mat = new BABYLON.StandardMaterial("wallMat" + Math.random(), scene);
+        const tone = 0.2 + Math.random() * 0.2;
+        mat.diffuseColor = new BABYLON.Color3(tone, tone * 0.6, tone * 0.4);
+        mat.specularColor = BABYLON.Color3.Black();
+        plane.material = mat;
+
+        graffitiSurfaces.push(plane);
+    });
+}
+
+function createStreetProps(scene) {
+    const lightMat = new BABYLON.StandardMaterial("lightMat", scene);
+    lightMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
+    lightMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
+
+    for (let i = 0; i < 18; i++) {
+        const pole = BABYLON.MeshBuilder.CreateCylinder(`lamp-${i}`, { height: 8, diameter: 0.4 }, scene);
+        pole.position = new BABYLON.Vector3(-90 + i * 10, 4, i % 2 === 0 ? 20 : -20);
+        pole.material = lightMat;
+        const lampHead = BABYLON.MeshBuilder.CreateSphere(`lamp-head-${i}`, { diameter: 1.1 }, scene);
+        lampHead.parent = pole;
+        lampHead.position.y = 4;
+        const lampMat = new BABYLON.StandardMaterial(`lampMat-${i}`, scene);
+        lampMat.emissiveColor = new BABYLON.Color3(0.9, 0.85, 0.6);
+        lampMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.45);
+        lampHead.material = lampMat;
+
+        const pointLight = new BABYLON.PointLight(`streetLight-${i}`, pole.position.add(new BABYLON.Vector3(0, 4, 0)), scene);
+        pointLight.intensity = 0.3;
+        pointLight.range = 18;
+    }
+
+    for (let i = 0; i < 6; i++) {
+        const board = BABYLON.MeshBuilder.CreatePlane(`board-${i}`, { width: 8, height: 4 }, scene);
+        board.position = new BABYLON.Vector3(-25 + i * 12, 4, -35);
+        board.rotation.y = Math.PI;
+        board.metadata = { graffitiSurface: true };
+        const tex = new BABYLON.DynamicTexture(`boardTex-${i}`, { width: 512, height: 256 }, scene, false);
+        const ctx = tex.getContext();
+        ctx.fillStyle = "#101018";
+        ctx.fillRect(0, 0, 512, 256);
+        ctx.font = "bold 80px 'Segoe UI'";
+        ctx.fillStyle = "#ff4d6d";
+        ctx.fillText("Block "+(i+1), 40, 120);
+        ctx.font = "bold 48px 'Segoe UI'";
+        ctx.fillStyle = "#69d1ff";
+        ctx.fillText("Respect", 60, 200);
+        tex.update(false);
+        const mat = new BABYLON.StandardMaterial(`boardMat-${i}`, scene);
+        mat.diffuseTexture = tex;
+        mat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.25);
+        mat.specularColor = BABYLON.Color3.Black();
+        board.material = mat;
+
+        graffitiSurfaces.push(board);
+    }
+}
+
+function spawnVehicles(scene) {
+    const palette = [
+        new BABYLON.Color3(0.82, 0.22, 0.32),
+        new BABYLON.Color3(0.12, 0.65, 0.85),
+        new BABYLON.Color3(0.95, 0.6, 0.12),
+    ];
+
+    const routes = [
+        {
+            start: new BABYLON.Vector3(-100, 0.45, 12),
+            end: new BABYLON.Vector3(100, 0.45, 12),
+            dir: new BABYLON.Vector3(1, 0, 0),
+        },
+        {
+            start: new BABYLON.Vector3(60, 0.45, -100),
+            end: new BABYLON.Vector3(60, 0.45, 100),
+            dir: new BABYLON.Vector3(0, 0, 1),
+        },
+    ];
+
+    routes.forEach((route, idx) => {
+        const car = BABYLON.MeshBuilder.CreateBox(`car-${idx}`, { width: 2.4, height: 1.2, depth: 5 }, scene);
+        car.position = route.start.clone();
+        car.metadata = {
+            route,
+            speed: 18 + Math.random() * 6,
+            forward: true,
+            cooldown: 0,
+        };
+        car.checkCollisions = false;
+        const mat = new BABYLON.StandardMaterial(`carMat-${idx}`, scene);
+        mat.diffuseColor = palette[idx % palette.length];
+        mat.emissiveColor = mat.diffuseColor.scale(0.2);
+        car.material = mat;
+        car.rotation.y = Math.atan2(route.dir.x, route.dir.z);
+        vehicles.push(car);
+    });
+}
+
+function spawnSprayCans(scene) {
+    for (let i = 0; i < 12; i++) {
+        const can = BABYLON.MeshBuilder.CreateCylinder(
+            `can-${i}`,
+            { height: 0.7, diameterTop: 0.24, diameterBottom: 0.28 },
+            scene
+        );
+        can.position = new BABYLON.Vector3(-70 + Math.random() * 140, 0.35, -70 + Math.random() * 140);
+        const mat = new BABYLON.StandardMaterial(`canMat-${i}`, scene);
+        const hue = Math.random();
+        mat.diffuseColor = colorFromHSV(hue, 0.8, 0.95);
+        mat.emissiveColor = colorFromHSV(hue, 0.9, 0.4);
+        can.material = mat;
+        can.metadata = { collected: false };
+        sprayCans.push(can);
+    }
+}
+
+function spawnGuards(scene) {
+    const guardColors = [
+        new BABYLON.Color3(0.2, 0.35, 0.85),
+        new BABYLON.Color3(0.15, 0.7, 0.45),
+    ];
+
+    const guardPoints = [
+        { start: new BABYLON.Vector3(-30, 1, 40), axis: "x", length: 30 },
+        { start: new BABYLON.Vector3(20, 1, -50), axis: "z", length: 36 },
+        { start: new BABYLON.Vector3(70, 1, 10), axis: "x", length: 26 },
+    ];
+
+    guardPoints.forEach((info, idx) => {
+        const guard = BABYLON.MeshBuilder.CreateCapsule(`guard-${idx}`, { height: 2.2, radius: 0.45 }, scene);
+        guard.position = info.start.clone();
+        const mat = new BABYLON.StandardMaterial(`guardMat-${idx}`, scene);
+        mat.diffuseColor = guardColors[idx % guardColors.length];
+        mat.emissiveColor = mat.diffuseColor.scale(0.3);
+        guard.material = mat;
+        guard.metadata = {
+            start: info.start.clone(),
+            axis: info.axis,
+            length: info.length,
+            dir: 1,
+            phase: Math.random() * Math.PI * 2,
+            alert: 0,
+        };
+        guards.push(guard);
+    });
+}
+
+function colorFromHSV(h, s, v) {
+    const i = Math.floor(h * 6);
+    const f = h * 6 - i;
+    const p = v * (1 - s);
+    const q = v * (1 - f * s);
+    const t = v * (1 - (1 - f) * s);
+    let r, g, b;
+    switch (i % 6) {
+        case 0:
+            r = v;
+            g = t;
+            b = p;
+            break;
+        case 1:
+            r = q;
+            g = v;
+            b = p;
+            break;
+        case 2:
+            r = p;
+            g = v;
+            b = t;
+            break;
+        case 3:
+            r = p;
+            g = q;
+            b = v;
+            break;
+        case 4:
+            r = t;
+            g = p;
+            b = v;
+            break;
+        default:
+            r = v;
+            g = p;
+            b = q;
+            break;
+    }
+    return new BABYLON.Color3(r, g, b);
+}
+
+function setupInput(scene) {
+    scene.onKeyboardObservable.add((kbInfo) => {
+        const isDown = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;
+        switch (kbInfo.event.code) {
+            case "KeyW":
+            case "ArrowUp":
+                inputMap.forward = isDown;
+                break;
+            case "KeyS":
+            case "ArrowDown":
+                inputMap.backward = isDown;
+                break;
+            case "KeyA":
+            case "ArrowLeft":
+                inputMap.left = isDown;
+                break;
+            case "KeyD":
+            case "ArrowRight":
+                inputMap.right = isDown;
+                break;
+            case "ShiftLeft":
+            case "ShiftRight":
+                inputMap.sprint = isDown;
+                break;
+            case "KeyE":
+                inputMap.interact = isDown;
+                break;
+            case "Space":
+                if (isDown) {
+                    state.wantJump = true;
+                }
+                break;
+            case "KeyG":
+                if (isDown) {
+                    attemptSpray(scene);
+                }
+                break;
+            case "KeyN":
+                if (isDown) {
+                    toggleNight(!state.isNight, scene);
+                }
+                break;
+            default:
+                break;
+        }
+    });
+}
+
+function setupGameLoop(scene, camera, player) {
+    const gravity = -24;
+    const jumpForce = 11;
+    let verticalVelocity = 0;
+    let isGrounded = false;
+
+    scene.onBeforeRenderObservable.add(() => {
+        const delta = scene.getEngine().getDeltaTime() / 1000;
+        const forward = new BABYLON.Vector3(Math.sin(camera.alpha), 0, Math.cos(camera.alpha));
+        const right = new BABYLON.Vector3(Math.sin(camera.alpha + Math.PI / 2), 0, Math.cos(camera.alpha + Math.PI / 2));
+
+        let move = new BABYLON.Vector3(0, 0, 0);
+        if (inputMap.forward) {
+            move.addInPlace(forward);
+        }
+        if (inputMap.backward) {
+            move.subtractInPlace(forward);
+        }
+        if (inputMap.left) {
+            move.subtractInPlace(right);
+        }
+        if (inputMap.right) {
+            move.addInPlace(right);
+        }
+
+        if (move.lengthSquared() > 0) {
+            move.normalize();
+            player.rotation.y = Math.atan2(move.x, move.z);
+        }
+
+        const runSpeed = inputMap.sprint ? 14 : 9.5;
+        const horizontal = move.scale(runSpeed * delta);
+
+        verticalVelocity += gravity * delta;
+
+        if (state.wantJump && isGrounded) {
+            verticalVelocity = jumpForce;
+            isGrounded = false;
+            logEvent("Skok!", "#69d1ff");
+        }
+        state.wantJump = false;
+
+        const displacement = new BABYLON.Vector3(horizontal.x, verticalVelocity * delta, horizontal.z);
+        player.moveWithCollisions(displacement);
+
+        if (player.position.y <= 1) {
+            player.position.y = 1;
+            verticalVelocity = 0;
+            isGrounded = true;
+        } else {
+            isGrounded = false;
+        }
+
+        camera.target.copyFrom(player.position);
+
+        updateVehicles(delta, player);
+        updateGuards(delta, player);
+        updateSprayCans(delta, player);
+        updateSprayCooldown(delta);
+        regenerateSpray(delta);
+        updateUI();
+    });
+}
+
+function attemptSpray(scene) {
+    if (state.sprayCooldown > 0) {
+        logEvent("Musisz zaczekać zanim zrobisz kolejny tag!", "#ff9f43");
+        return;
+    }
+    if (state.sprayEnergy < 12) {
+        logEvent("Brakuje energii sprayu. Znajdź puszkę!", "#ff5d5d");
+        return;
+    }
+
+    const player = scene.getMeshByName("player");
+    const camera = scene.activeCamera;
+    const origin = player.position.add(new BABYLON.Vector3(0, 1.2, 0));
+    const direction = new BABYLON.Vector3(
+        Math.sin(player.rotation.y),
+        0,
+        Math.cos(player.rotation.y)
+    );
+    const ray = new BABYLON.Ray(origin, direction, 14);
+    const pick = scene.pickWithRay(ray, (mesh) => mesh.metadata && mesh.metadata.graffitiSurface);
+
+    if (!pick.hit) {
+        logEvent("Nie ma ściany, na której możesz malować.", "#ffdc73");
+        return;
+    }
+
+    const decal = BABYLON.MeshBuilder.CreateDecal(
+        "tag-" + Date.now(),
+        pick.pickedMesh,
+        {
+            position: pick.pickedPoint,
+            normal: pick.getNormal(true),
+            size: new BABYLON.Vector3(3 + Math.random() * 1.5, 2 + Math.random(), 2),
+            angle: Math.random() * Math.PI,
+        }
+    );
+
+    const mat = new BABYLON.StandardMaterial("tagMat-" + Date.now(), scene);
+    const tex = new BABYLON.DynamicTexture("tagTex-" + Date.now(), { width: 512, height: 256 }, scene, false);
+    const ctx = tex.getContext();
+    const palette = ["#ff4d6d", "#69d1ff", "#f9f871", "#7effa1", "#f78fb3", "#c56cf0"];
+    ctx.fillStyle = "rgba(0,0,0,0)";
+    ctx.fillRect(0, 0, 512, 256);
+    ctx.font = "bold 120px 'Segoe UI'";
+    ctx.lineJoin = "round";
+    ctx.lineWidth = 18;
+    const tag = randomTag();
+    ctx.strokeStyle = "#050505";
+    ctx.strokeText(tag, 40, 160);
+    ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
+    ctx.fillText(tag, 40, 160);
+    ctx.font = "bold 36px 'Segoe UI'";
+    ctx.fillStyle = "#ffffff";
+    ctx.fillText("STREET", 60, 210);
+    tex.update(false);
+
+    mat.diffuseTexture = tex;
+    mat.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.35);
+    mat.backFaceCulling = false;
+    decal.material = mat;
+
+    state.sprayEnergy -= 12;
+    state.sprayCooldown = 1.6;
+    state.sprayCombo += 1;
+    const bonus = 6 + state.sprayCombo * 2;
+    state.reputation += bonus;
+    logEvent(`Nowy tag: +${bonus} respektu!`, "#7effa1");
+}
+
+function randomTag() {
+    const syllables = ["URB", "VIBE", "RAW", "SK8", "RHY", "NEO", "FLO", "DZN", "BOM", "RZR"];
+    const pick = () => syllables[Math.floor(Math.random() * syllables.length)];
+    return pick() + pick();
+}
+
+function updateVehicles(delta, player) {
+    vehicles.forEach((car) => {
+        const meta = car.metadata;
+        if (!meta) {
+            return;
+        }
+        const direction = meta.forward ? meta.route.dir : meta.route.dir.scale(-1);
+        const move = direction.scale(meta.speed * delta);
+        car.position.addInPlace(move);
+
+        if (meta.forward && car.position.subtract(meta.route.end).length() < 1) {
+            meta.forward = false;
+            car.rotation.y = Math.atan2(-direction.x, -direction.z);
+        } else if (!meta.forward && car.position.subtract(meta.route.start).length() < 1) {
+            meta.forward = true;
+            car.rotation.y = Math.atan2(direction.x, direction.z);
+        }
+
+        if (meta.cooldown > 0) {
+            meta.cooldown -= delta;
+        }
+
+        const dist = BABYLON.Vector3.Distance(player.position, car.position);
+        if (dist < 3.6 && meta.cooldown <= 0) {
+            meta.cooldown = 3;
+            state.reputation = Math.max(0, state.reputation - 8);
+            logEvent("Uważaj! Wpadłeś pod maskę – respekt -8", "#ff5d5d");
+        }
+    });
+}
+
+function updateGuards(delta, player) {
+    guards.forEach((guard) => {
+        const meta = guard.metadata;
+        const progress = Math.sin(performance.now() * 0.001 + meta.phase) * 0.5 + 0.5;
+        const offset = (progress * 2 - 1) * meta.length;
+        if (meta.axis === "x") {
+            guard.position.x = meta.start.x + offset;
+        } else {
+            guard.position.z = meta.start.z + offset;
+        }
+        guard.rotation.y += delta * 2;
+
+        if (meta.alert > 0) {
+            meta.alert -= delta;
+        }
+
+        const dist = BABYLON.Vector3.Distance(player.position, guard.position);
+        if (dist < 6) {
+            if (meta.alert <= 0) {
+                logEvent("Strażnik w pobliżu – kryj się!", "#ff9f43");
+            }
+            meta.alert = 2;
+            state.reputation = Math.max(0, state.reputation - 3 * delta);
+        }
+    });
+}
+
+function updateSprayCans(delta, player) {
+    sprayCans.forEach((can) => {
+        if (can.metadata.collected) {
+            return;
+        }
+        can.rotation.y += delta * 2;
+        can.position.y = 0.35 + Math.sin(performance.now() * 0.003 + can.uniqueId) * 0.15;
+        if (inputMap.interact && BABYLON.Vector3.Distance(player.position, can.position) < 2.4) {
+            can.metadata.collected = true;
+            can.setEnabled(false);
+            state.sprayEnergy = Math.min(100, state.sprayEnergy + 35);
+            state.sprayCooldown = 0;
+            state.sprayCombo = 0;
+            logEvent("Uzupełniono zapas sprayu!", "#69d1ff");
+        }
+    });
+}
+
+function updateSprayCooldown(delta) {
+    if (state.sprayCooldown > 0) {
+        state.sprayCooldown = Math.max(0, state.sprayCooldown - delta);
+        if (state.sprayCooldown === 0) {
+            state.sprayCombo = 0;
+        }
+    }
+}
+
+function regenerateSpray(delta) {
+    if (!inputMap.interact && state.sprayEnergy < 100) {
+        state.sprayEnergy = Math.min(100, state.sprayEnergy + delta * 1.2);
+    }
+}
+
+function updateUI() {
+    reputationEl.textContent = Math.round(state.reputation);
+    sprayEnergyEl.textContent = `${Math.round(state.sprayEnergy)}%`;
+    nightModeEl.textContent = state.isNight ? "On" : "Off";
+}
+
+function logEvent(message, color = "#8ad7ff") {
+    if (state.logTimeout) {
+        clearTimeout(state.logTimeout);
+    }
+    eventLogEl.textContent = message;
+    eventLogEl.style.color = color;
+    state.logTimeout = setTimeout(() => {
+        eventLogEl.textContent = "";
+    }, 2500);
+}
+
+function toggleNight(enabled, scene, hemiLight, sunLight) {
+    if (typeof hemiLight === "undefined") {
+        hemiLight = scene.lights.find((l) => l instanceof BABYLON.HemisphericLight);
+    }
+    if (typeof sunLight === "undefined") {
+        sunLight = scene.lights.find((l) => l instanceof BABYLON.DirectionalLight);
+    }
+
+    state.isNight = enabled;
+    if (enabled) {
+        scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);
+        scene.fogColor = new BABYLON.Color3(0.02, 0.03, 0.07);
+        hemiLight.intensity = 0.25;
+        sunLight.intensity = 0.35;
+        scene.lights
+            .filter((l) => l instanceof BABYLON.PointLight)
+            .forEach((light) => (light.intensity = 0.6));
+        logEvent("Miasto spowija noc – lampy ożywają.", "#f9f871");
+    } else {
+        scene.clearColor = new BABYLON.Color4(0.08, 0.1, 0.16, 1);
+        scene.fogColor = new BABYLON.Color3(0.05, 0.06, 0.09);
+        hemiLight.intensity = 0.95;
+        sunLight.intensity = 0.9;
+        scene.lights
+            .filter((l) => l instanceof BABYLON.PointLight)
+            .forEach((light) => (light.intensity = 0.3));
+        logEvent("Poranek: czas na nowe tagi!", "#7effa1");
+    }
+}
