import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

const mount = document.getElementById("cd-model");
if (!mount) {
  console.warn("Missing #cd-model mount element");
} else {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0.32, 4.1);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  const presentationRig = new THREE.Group();
  const baseRigRotationX = -0.08;
  const baseRigRotationY = 0;
  presentationRig.rotation.x = baseRigRotationX;
  presentationRig.rotation.y = baseRigRotationY;
  scene.add(presentationRig);

  const ambient = new THREE.AmbientLight(0xffffff, 0.95);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(2.2, 3, 3.5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x8be7ff, 0.95);
  rimLight.position.set(-3, 1.8, -2.4);
  scene.add(rimLight);

  const coverTexture = new THREE.TextureLoader().load("assets/warp-zone-volume-3-cd-cover.png");
  coverTexture.colorSpace = THREE.SRGBColorSpace;
  coverTexture.flipY = false;
  coverTexture.wrapS = THREE.RepeatWrapping;
  coverTexture.repeat.x = -1;
  coverTexture.offset.x = 1;
  coverTexture.center.set(0.5, 0.5);
  coverTexture.rotation = Math.PI;

  const smokeTexture = new THREE.TextureLoader().load("assets/images/smoke3.png");

  let modelRoot = null;
  let discSpinNode = null;
  let discSpinAxis = "y";
  let discBaseSpinRotation = 0;
  let startSpinAngle = 4.922;
  let caseSpinAngle = startSpinAngle;
  let discSpinAngle = startSpinAngle;
  let lastFrameNow = performance.now();
  let spinFactor = 0;
  let spinFactorVelocity = 0;
  let clickBoostLevel = 0;
  let clickBoostClicks = 0;
  let blueFlashFrameCounter = 0;
  let wasMusicPlaying = isMusicPlaying();

  const caseSpinSpeedMax = 0.84;
  const discSpinSpeedMax = 2.88;
  const spinSpringStiffness = 18;
  const spinSpringDamping = 7.2;
  const spinFactorMax = Number.POSITIVE_INFINITY;
  const clickBoostStep = 0.22;
  const clickBoostMax = Number.POSITIVE_INFINITY;
  const clickBoostDecayPerSecond = 0.12;
  const smokeThreshold = 1.5;
  const smokeStartClicks = 10;
  const tintStartClicks = 20;
  const blueFlashStartClicks = 200;
  const blackTintStartClicks = 260;
  const blackTintFullClicks = 420;
  const discTintThreshold = 1.75;
  const discTintFullSpeed = 2.35;
  const discTintStrengthMax = 0.78;
  const discTintColor = new THREE.Color(0xff2a2a);
  const discFlashTintColor = new THREE.Color(0xffffff);
  const discBlackTintColor = new THREE.Color(0x000000);
  const smokeBaseColor = new THREE.Color(0xe6e6e6);
  const smokeDarkTintColor = new THREE.Color(0x0a0a0a);
  const blueFlashCadenceFrames = 6;

  const smokeSprites = [];
  const discTintMaterials = [];
  const discGeneratorPoints = [];
  const smokePoolSize = 120;
  const smokeTmpWorld = new THREE.Vector3();
  const smokeTmpLocal = new THREE.Vector3();
  const smokeGeneratorWorld = new THREE.Vector3();
  const smokeGeneratorLocal = new THREE.Vector3();

  const mouseTarget = new THREE.Vector2(0, 0);
  const mouseCurrent = new THREE.Vector2(0, 0);
  const mouseTiltXMax = 0.085;
  const mouseTiltYMax = 0.125;

  let wobbleActive = false;
  let wobbleStart = 0;
  let wobbleDuration = 0;
  let wobbleAmpX = 0;
  let wobbleAmpY = 0;
  let wobblePhaseX = 0;
  let wobblePhaseY = 0;
  let nextWobbleAt = performance.now() + 1200 + Math.random() * 1800;

  let bounceStart = -Infinity;
  const bounceDuration = 760;
  const bounceAmplitude = 0.18;

  function triggerWobble(now) {
    wobbleActive = true;
    wobbleStart = now;
    wobbleDuration = 1000 + Math.random() * 900;
    wobbleAmpX = 0.02 + Math.random() * 0.018;
    wobbleAmpY = 0.022 + Math.random() * 0.022;
    wobblePhaseX = Math.random() * Math.PI * 2;
    wobblePhaseY = Math.random() * Math.PI * 2;
  }

  function queueNextWobble(now) {
    nextWobbleAt = now + 1700 + Math.random() * 2400;
  }

  function captureDiscTintMaterials(node) {
    discTintMaterials.length = 0;
    const seen = new Set();

    node.traverse((obj) => {
      if (!obj.isMesh || !obj.material) {
        return;
      }

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((mat) => {
        if (!mat || !mat.color || seen.has(mat)) {
          return;
        }
        seen.add(mat);
        discTintMaterials.push({
          material: mat,
          baseColor: mat.color.clone()
        });
      });
    });
  }

  function applyDiscTint(intensity) {
    if (!discTintMaterials.length) {
      return;
    }

    if (clickBoostClicks < tintStartClicks) {
      resetDiscTint();
      return;
    }

    if (clickBoostClicks >= blueFlashStartClicks) {
      if (clickBoostClicks >= blackTintStartClicks) {
        const blackTintAmount = THREE.MathUtils.clamp(
          (clickBoostClicks - blackTintStartClicks) / (blackTintFullClicks - blackTintStartClicks),
          0,
          1
        );
        for (let i = 0; i < discTintMaterials.length; i += 1) {
          const entry = discTintMaterials[i];
          entry.material.color.copy(entry.baseColor).lerp(discBlackTintColor, blackTintAmount);
          entry.material.needsUpdate = true;
        }
        return;
      }

      blueFlashFrameCounter += 1;
      if (blueFlashFrameCounter % blueFlashCadenceFrames === 0) {
        for (let i = 0; i < discTintMaterials.length; i += 1) {
          const entry = discTintMaterials[i];
          entry.material.color.copy(entry.baseColor).lerp(discFlashTintColor, 0.95);
          entry.material.needsUpdate = true;
        }
      } else {
        resetDiscTint();
      }
      return;
    }

    const normalized = THREE.MathUtils.clamp(
      (intensity - discTintThreshold) / (discTintFullSpeed - discTintThreshold),
      0,
      1
    );
    const tintAmount = normalized * discTintStrengthMax;

    for (let i = 0; i < discTintMaterials.length; i += 1) {
      const entry = discTintMaterials[i];
      entry.material.color.copy(entry.baseColor).lerp(discTintColor, tintAmount);
      entry.material.needsUpdate = true;
    }
  }

  function getBlacknessAmount() {
    return THREE.MathUtils.clamp(
      (clickBoostClicks - blackTintStartClicks) / (blackTintFullClicks - blackTintStartClicks),
      0,
      1
    );
  }

  function resetDiscTint() {
    for (let i = 0; i < discTintMaterials.length; i += 1) {
      const entry = discTintMaterials[i];
      entry.material.color.copy(entry.baseColor);
      entry.material.needsUpdate = true;
    }
  }

  function updateMouseTargetFromEvent(event) {
    const rect = mount.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    mouseTarget.x = Math.max(-1, Math.min(1, nx));
    mouseTarget.y = Math.max(-1, Math.min(1, ny));
  }

  mount.addEventListener("pointermove", (event) => {
    updateMouseTargetFromEvent(event);
  });

  mount.addEventListener("pointerleave", () => {
    mouseTarget.set(0, 0);
  });

  mount.addEventListener("click", () => {
    if (!isMusicPlaying()) {
      return;
    }
    bounceStart = performance.now();
    clickBoostLevel = Math.min(clickBoostMax, clickBoostLevel + clickBoostStep);
    clickBoostClicks += 1;
  });

  function initSmokePool() {
    for (let i = 0; i < smokePoolSize; i += 1) {
      const material = new THREE.SpriteMaterial({
        map: smokeTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0,
        color: 0xe6e6e6
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.scale.set(0.001, 0.001, 0.001);
      sprite.userData = {
        life: 1,
        ttl: 1,
        vx: 0,
        vy: 0,
        vz: 0,
        startScale: 0.05,
        endScale: 0.24,
        rotSpeed: 0,
        darkness: 0
      };
      presentationRig.add(sprite);
      smokeSprites.push(sprite);
    }
  }

  function spawnSmoke(originLocal, intensity) {
    const spawnCount = Math.min(4, 1 + Math.floor(intensity * 3));
    let emitted = 0;

    for (let i = 0; i < smokeSprites.length && emitted < spawnCount; i += 1) {
      const sprite = smokeSprites[i];
      if (sprite.visible) {
        continue;
      }

      const angle = Math.random() * Math.PI * 2;
      const radius = 0.04 + Math.random() * 0.12;
      const rise = 0.15 + Math.random() * 0.18;
      const outward = 0.02 + Math.random() * 0.06 + intensity * 0.035;

      const px = originLocal.x + Math.cos(angle) * radius;
      const py = originLocal.y + 0.16 + (Math.random() - 0.5) * 0.04;
      const pz = originLocal.z + Math.sin(angle) * radius;

      sprite.position.set(px, py, pz);
      sprite.visible = true;
      sprite.material.opacity = 0.34 + intensity * 0.2;
      const smokeDarkness = getBlacknessAmount();
      sprite.material.color.copy(smokeBaseColor).lerp(smokeDarkTintColor, smokeDarkness);

      sprite.userData.life = 0;
      sprite.userData.ttl = 0.55 + Math.random() * 0.5;
      sprite.userData.vx = Math.cos(angle) * outward * rise;
      sprite.userData.vy = rise;
      sprite.userData.vz = Math.sin(angle) * outward * rise;
      sprite.userData.startScale = 0.11 + Math.random() * 0.05;
      sprite.userData.endScale = 0.33 + Math.random() * 0.2;
      sprite.userData.rotSpeed = (Math.random() - 0.5) * 1.6;
      sprite.userData.darkness = smokeDarkness;

      emitted += 1;
    }
  }

  function randomDiscGeneratorPoint() {
    const r = Math.sqrt(Math.random()) * 0.98;
    const theta = Math.random() * Math.PI * 2;
    const a = Math.cos(theta) * r;
    const b = Math.sin(theta) * r;

    if (discSpinAxis === "x") {
      return new THREE.Vector3(0, a, b);
    }
    if (discSpinAxis === "z") {
      return new THREE.Vector3(a, b, 0);
    }
    return new THREE.Vector3(a, 0, b);
  }

  function generatorCountForClicks() {
    if (clickBoostClicks >= blueFlashStartClicks) {
      return 10;
    }
    return 1;
  }

  function ensureDiscGenerators() {
    const targetCount = generatorCountForClicks();

    while (discGeneratorPoints.length < targetCount) {
      discGeneratorPoints.push(randomDiscGeneratorPoint());
    }
    if (discGeneratorPoints.length > targetCount) {
      discGeneratorPoints.length = targetCount;
    }
  }

  function resetSmoke() {
    for (let i = 0; i < smokeSprites.length; i += 1) {
      const sprite = smokeSprites[i];
      sprite.visible = false;
      sprite.material.opacity = 0;
    }
  }

  function updateSmoke(dt, intensity) {
    if (!discSpinNode) {
      return;
    }

    ensureDiscGenerators();

    if (clickBoostClicks >= smokeStartClicks && intensity > smokeThreshold) {
      const emissionChance = (intensity - smokeThreshold + 0.1) * 7.5 * dt;
      for (let i = 0; i < discGeneratorPoints.length; i += 1) {
        if (Math.random() >= emissionChance) {
          continue;
        }

        const point = discGeneratorPoints[i];
        smokeGeneratorLocal.copy(point);
        smokeGeneratorWorld.copy(smokeGeneratorLocal);
        discSpinNode.localToWorld(smokeGeneratorWorld);
        smokeTmpLocal.copy(smokeGeneratorWorld);
        presentationRig.worldToLocal(smokeTmpLocal);

        spawnSmoke(smokeTmpLocal, intensity);
      }
    }

    for (let i = 0; i < smokeSprites.length; i += 1) {
      const sprite = smokeSprites[i];
      if (!sprite.visible) {
        continue;
      }

      const data = sprite.userData;
      data.life += dt;
      const t = data.life / data.ttl;
      data.darkness = Math.max(data.darkness || 0, getBlacknessAmount());

      if (t >= 1) {
        sprite.visible = false;
        sprite.material.opacity = 0;
        continue;
      }

      sprite.position.x += data.vx * dt;
      sprite.position.y += data.vy * dt;
      sprite.position.z += data.vz * dt;
      data.vy += 0.025 * dt;
      sprite.material.opacity = (1 - t) * (0.24 + intensity * 0.12);
      sprite.material.color.copy(smokeBaseColor).lerp(smokeDarkTintColor, data.darkness);

      const scale = data.startScale + (data.endScale - data.startScale) * t;
      sprite.scale.set(scale, scale, scale);
      sprite.material.rotation += data.rotSpeed * dt;
    }
  }

  function resetMotionAndEffects(now) {
    clickBoostLevel = 0;
    clickBoostClicks = 0;
    blueFlashFrameCounter = 0;
    discGeneratorPoints.length = 0;
    spinFactor = 0;
    spinFactorVelocity = 0;
    caseSpinAngle = startSpinAngle;
    discSpinAngle = startSpinAngle;

    wobbleActive = false;
    queueNextWobble(now);

    bounceStart = -Infinity;
    mouseTarget.set(0, 0);
    mouseCurrent.set(0, 0);

    resetSmoke();
    resetDiscTint();
  }

  initSmokePool();

  function applyCoverTexture(root) {
    const candidates = [];

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material || !obj.geometry) {
        return;
      }

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      const meshName = (obj.name || "").toLowerCase();
      const combinedMaterialNames = materials
        .map((mat) => (mat && mat.name ? mat.name.toLowerCase() : ""))
        .join(" ");
      const searchText = meshName + " " + combinedMaterialNames;

      if (/\b(cd|disc|disk|tray|spindle|hub|center|label)\b/.test(searchText)) {
        return;
      }

      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const dims = [size.x, size.y, size.z].sort((a, b) => b - a);
      const largest = dims[0] || 0;
      const middle = dims[1] || 0;
      const smallest = dims[2] || 0.0001;
      const panelScore = (largest * middle) / smallest;

      candidates.push({
        obj,
        materials,
        searchText,
        panelScore
      });
    });

    if (!candidates.length) {
      return;
    }

    candidates.sort((a, b) => b.panelScore - a.panelScore);

    const namedCover = candidates.find((entry) =>
      /\b(cover|insert|paper|art|front|booklet|sleeve|jcard|j-card)\b/.test(entry.searchText)
    );

    const target = namedCover || candidates[0];

    target.materials.forEach((mat) => {
      if (!mat) {
        return;
      }
      mat.map = coverTexture;
      mat.needsUpdate = true;
    });
  }

  function frameModel(root) {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.35 / maxDim;

    root.scale.setScalar(scale);
    root.position.set(-center.x * scale, -center.y * scale + 0.18, -center.z * scale);
  }

  function detectDiscSpinTarget(root) {
    const namedCandidates = [];
    const geometricCandidates = [];
    const rootCenter = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry) {
        return;
      }

      const meshName = (obj.name || "").toLowerCase();
      const materialNames = Array.isArray(obj.material)
        ? obj.material.map((m) => (m && m.name ? m.name.toLowerCase() : "")).join(" ")
        : obj.material && obj.material.name
          ? obj.material.name.toLowerCase()
          : "";
      const searchText = meshName + " " + materialNames;

      if (/\b(tray|jewel|case|cover|insert|paper|art)\b/.test(searchText)) {
        return;
      }

      if (!obj.geometry.boundingBox) {
        obj.geometry.computeBoundingBox();
      }
      const geomBox = obj.geometry.boundingBox;
      if (!geomBox) {
        return;
      }

      const rawSize = geomBox.getSize(new THREE.Vector3());
      const scale = obj.scale;
      const size = new THREE.Vector3(
        Math.abs(rawSize.x * scale.x),
        Math.abs(rawSize.y * scale.y),
        Math.abs(rawSize.z * scale.z)
      );
      const dims = [size.x, size.y, size.z];
      const maxDim = Math.max(dims[0], dims[1], dims[2]) || 1;
      const minDim = Math.min(dims[0], dims[1], dims[2]) || 0.0001;
      const flatness = maxDim / minDim;

      let axis = "y";
      if (size.x <= size.y && size.x <= size.z) axis = "x";
      if (size.z <= size.x && size.z <= size.y) axis = "z";

      const dimsSorted = [size.x, size.y, size.z].sort((a, b) => b - a);
      const majorA = dimsSorted[0] || 1;
      const majorB = dimsSorted[1] || 1;
      const roundnessScore = 1 - Math.min(1, Math.abs(majorA - majorB) / majorA);
      const centerDistance = obj.getWorldPosition(new THREE.Vector3()).distanceTo(rootCenter);
      const geometricScore = flatness * (0.45 + 0.55 * roundnessScore) / (1 + centerDistance * 1.1);

      const entry = { obj, flatness, axis, geometricScore };
      if (/\b(cd|disc|disk)\b/.test(searchText)) {
        namedCandidates.push(entry);
      }
      geometricCandidates.push(entry);
    });

    if (namedCandidates.length) {
      namedCandidates.sort((a, b) => b.flatness - a.flatness);
      return namedCandidates[0];
    }

    const plausible = geometricCandidates.filter((entry) => entry.flatness >= 6);
    if (!plausible.length) {
      return null;
    }

    plausible.sort((a, b) => b.geometricScore - a.geometricScore);
    return plausible[0];
  }

  function isAncestor(maybeAncestor, node) {
    let current = node && node.parent;
    while (current) {
      if (current === maybeAncestor) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  function parentDiscCompanions(root, discNode) {
    const discBox = new THREE.Box3().setFromObject(discNode);
    const discCenter = discBox.getCenter(new THREE.Vector3());
    const discSize = discBox.getSize(new THREE.Vector3());
    const discRadius = Math.max(discSize.x, discSize.y, discSize.z) * 0.5;
    const companionCandidates = [];

    root.traverse((obj) => {
      if (!obj.isMesh || obj === discNode) {
        return;
      }
      if (obj.parent === discNode) {
        return;
      }
      if (isAncestor(obj, discNode)) {
        return;
      }

      const name = (obj.name || "").toLowerCase();
      const matName = Array.isArray(obj.material)
        ? obj.material.map((m) => (m && m.name ? m.name.toLowerCase() : "")).join(" ")
        : obj.material && obj.material.name
          ? obj.material.name.toLowerCase()
          : "";
      const searchText = name + " " + matName;

      if (!/\b(center|hub|spindle|ring|hole)\b/.test(searchText)) {
        return;
      }
      if (/\b(tray|jewel|case|cover|insert|paper|art)\b/.test(searchText)) {
        return;
      }

      const center = obj.getWorldPosition(new THREE.Vector3());
      const dist = center.distanceTo(discCenter);
      if (dist > discRadius * 0.62) {
        return;
      }

      companionCandidates.push(obj);
    });

    companionCandidates.forEach((obj) => {
      discNode.attach(obj);
    });
  }

  new GLTFLoader().load(
    "assets/cd__jewel_case.glb",
    (gltf) => {
      modelRoot = gltf.scene;
      applyCoverTexture(modelRoot);
      frameModel(modelRoot);
      presentationRig.add(modelRoot);

      const discTarget = detectDiscSpinTarget(modelRoot);
      if (discTarget) {
        discSpinNode = discTarget.obj;
        discSpinAxis = discTarget.axis;
        if (discSpinAxis === "x") {
          discBaseSpinRotation = discSpinNode.rotation.x;
        } else if (discSpinAxis === "z") {
          discBaseSpinRotation = discSpinNode.rotation.z;
        } else {
          discBaseSpinRotation = discSpinNode.rotation.y;
        }
        parentDiscCompanions(modelRoot, discSpinNode);
        captureDiscTintMaterials(discSpinNode);
      }
    },
    undefined,
    (error) => {
      console.error("Unable to load cd__jewel_case.glb", error);
    }
  );

  function isMusicPlaying() {
    return document.body.classList.contains("music-playing");
  }

  function resize() {
    const width = mount.clientWidth;
    const height = Math.max(280, Math.round(width * 0.72));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function animate(now) {
    requestAnimationFrame(animate);

    const safeNow = typeof now === "number" ? now : performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (safeNow - lastFrameNow) / 1000));
    lastFrameNow = safeNow;

    const musicPlaying = isMusicPlaying();
    if (!musicPlaying && wasMusicPlaying) {
      resetMotionAndEffects(safeNow);
    }
    wasMusicPlaying = musicPlaying;

    const caseSpinTarget = modelRoot && musicPlaying ? 1 : 0;
    const spinAccel = (caseSpinTarget - spinFactor) * spinSpringStiffness - spinFactorVelocity * spinSpringDamping;
    spinFactorVelocity += spinAccel * dt;
    spinFactor += spinFactorVelocity * dt;
    spinFactor = Math.max(-0.08, Math.min(spinFactorMax, spinFactor));

    const discSpinFactor = Math.max(0, spinFactor + clickBoostLevel);

    caseSpinAngle += caseSpinSpeedMax * spinFactor * dt;
    discSpinAngle += discSpinSpeedMax * discSpinFactor * dt;

    if (musicPlaying && !wobbleActive && safeNow >= nextWobbleAt) {
      triggerWobble(safeNow);
    }

    let wobbleX = 0;
    let wobbleY = 0;

    if (wobbleActive) {
      const progress = (safeNow - wobbleStart) / wobbleDuration;
      if (progress >= 1) {
        wobbleActive = false;
        queueNextWobble(safeNow);
      } else {
        const envelope = Math.sin(progress * Math.PI);
        const t = safeNow * 0.01;
        wobbleX = Math.sin(t + wobblePhaseX) * wobbleAmpX * envelope;
        wobbleY = Math.cos(t * 1.08 + wobblePhaseY) * wobbleAmpY * envelope;
      }
    }

    mouseCurrent.lerp(mouseTarget, 0.12);

    const mouseTiltX = -mouseCurrent.y * mouseTiltXMax;
    const mouseTiltY = mouseCurrent.x * mouseTiltYMax;

    presentationRig.rotation.x = baseRigRotationX + mouseTiltX + wobbleX;
    presentationRig.rotation.y = baseRigRotationY + mouseTiltY + wobbleY;

    let bounceScale = 1;
    const bounceElapsed = safeNow - bounceStart;
    if (bounceElapsed >= 0 && bounceElapsed <= bounceDuration) {
      const p = bounceElapsed / bounceDuration;
      const damped = Math.sin(p * Math.PI * 5.6) * Math.exp(-2.4 * p);
      bounceScale = 1 + damped * bounceAmplitude;
    }
    presentationRig.scale.setScalar(Math.max(0.82, bounceScale));

    if (modelRoot) {
      modelRoot.rotation.y = caseSpinAngle;
    }

    if (discSpinNode) {
      if (discSpinAxis === "x") {
        discSpinNode.rotation.x = discBaseSpinRotation + discSpinAngle;
      } else if (discSpinAxis === "z") {
        discSpinNode.rotation.z = discBaseSpinRotation + discSpinAngle;
      } else {
        discSpinNode.rotation.y = discBaseSpinRotation + discSpinAngle;
      }
    }

    applyDiscTint(discSpinFactor);
    updateSmoke(dt, discSpinFactor);

    renderer.render(scene, camera);
  }

  resize();
  animate();
  window.addEventListener("resize", resize);
}
