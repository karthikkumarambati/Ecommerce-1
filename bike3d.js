/* =========================================================
   bike3d.js — interactive 3D geared bicycle (Three.js)

   Public API, available as the global object Bike3D:
     mount(container, options)  build and start a 3D viewer inside `container`
                                options: { colour, gear, speed, autoRotate }
     destroy()                  stop the viewer and free its memory
     setColour(hex)             change the frame colour, e.g. "#6a3de8"
     setGear(index)             select a gear (0 = easiest, last = hardest)
     setSpeed(value)            ride speed; 0 stops the wheels
     setAutoRotate(on)          slow turntable on or off
     resetView()                return the camera to the default angle
     GEAR_TEETH                 cog sizes, easiest to hardest
     CHAINRING_TEETH            front chainring size

   Sections:
     1. Constants and layout
     2. Helpers (tubes, gears, materials)
     3. Parts (wheels, frame, crank, cassette, chain)
     4. Viewer (scene, camera, controls, animation)
     5. Public API
   ========================================================= */

const Bike3D = (() => {

  /* ---------- 1. Constants and layout ---------- */

  const GEAR_TEETH = [34, 30, 27, 24, 21, 19, 17, 15, 14, 13, 12, 11];
  const CHAINRING_TEETH = 46;
  const TOOTH_SCALE = 0.005;          // converts teeth to a radius in scene units
  const WHEEL_RADIUS = 0.62;
  const CHAIN_Z = 0.11;               // depth of the chain, between chainring and cassette

  // Key points on the bike, in scene units. The bike runs along the x axis.
  const REAR_HUB = new THREE.Vector3(-1.0, WHEEL_RADIUS, 0);
  const FRONT_HUB = new THREE.Vector3(1.0, WHEEL_RADIUS, 0);
  const BOTTOM_BRACKET = new THREE.Vector3(-0.12, 0.42, 0);
  const SEAT_TOP = new THREE.Vector3(-0.42, 1.2, 0);
  const HEAD_TOP = new THREE.Vector3(0.62, 1.2, 0);
  const HEAD_BOTTOM = new THREE.Vector3(0.66, 1.02, 0);

  const DEFAULT_CAMERA = { yaw: 1.2, pitch: 0.2, radius: 5.2 };
  const TARGET = new THREE.Vector3(0, 0.7, 0);

  let view = null;   // holds the running viewer, or null when no viewer is shown

  /* ---------- 2. Helpers ---------- */

  const vec = (x, y, z) => new THREE.Vector3(x, y, z);
  const withZ = (point, z) => new THREE.Vector3(point.x, point.y, z);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  /** A straight cylinder between two points (used for frame tubes and spokes) */
  function tube(from, to, radius, material) {
    const direction = new THREE.Vector3().subVectors(to, from);
    const length = direction.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 16), material);
    mesh.position.copy(from).add(direction.clone().multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(vec(0, 1, 0), direction.normalize());
    return mesh;
  }

  /** A flat gear ring with teeth, extruded to a thickness along z */
  function gearGeometry(teeth, outerRadius, innerRadius, thickness) {
    const shape = new THREE.Shape();
    const steps = teeth * 2;
    for (let i = 0; i < steps; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / steps) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    // Centre hole
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius * 0.45, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    return new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 1 });
  }

  /** Materials for each part. The frame colour can change at any time. */
  function createMaterials(frameColour) {
    const standard = (color, metalness, roughness) =>
      new THREE.MeshStandardMaterial({ color, metalness, roughness });
    return {
      frame: standard(frameColour, 0.4, 0.3),
      metal: standard(0xc9ced8, 0.9, 0.25),
      black: standard(0x151515, 0.3, 0.6),
      tyre: standard(0x111111, 0.1, 0.8),
      chain: standard(0x9aa3b5, 0.9, 0.3),
      cogSilver: standard(0xb8c0cc, 0.9, 0.3),
      cogSelected: standard(0xffb703, 0.6, 0.25)
    };
  }

  /** Free the memory used by a part and its children */
  function disposeObject(object) {
    object.traverse(child => {
      if (child.geometry) child.geometry.dispose();
    });
  }

  /* ---------- 3. Parts ---------- */

  /** One wheel, centred on its hub, lying in the x-y plane */
  function buildWheel(mats) {
    const wheel = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_RADIUS, 0.045, 16, 80), mats.tyre);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_RADIUS - 0.05, 0.016, 10, 80), mats.metal);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16), mats.metal);
    hub.rotation.x = Math.PI / 2;
    wheel.add(tyre, rim, hub);

    const rimRadius = WHEEL_RADIUS - 0.05;
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const rimPoint = vec(Math.cos(angle) * rimRadius, Math.sin(angle) * rimRadius, 0);
      wheel.add(tube(vec(0, 0, 0), rimPoint, 0.003, mats.metal));
    }
    return wheel;
  }

  /** The main frame: tubes, fork, stays, seatpost, saddle, stem and handlebar */
  function buildFrame(mats) {
    const frame = new THREE.Group();
    const addTube = (from, to, radius = 0.035, material = mats.frame) =>
      frame.add(tube(from, to, radius, material));

    addTube(BOTTOM_BRACKET, SEAT_TOP);          // seat tube
    addTube(SEAT_TOP, HEAD_TOP);                // top tube
    addTube(HEAD_BOTTOM, BOTTOM_BRACKET);       // down tube
    addTube(HEAD_TOP, HEAD_BOTTOM, 0.05);       // head tube

    // Left and right sides: chainstays, seatstays and fork legs
    for (const z of [-0.08, 0.08]) {
      addTube(withZ(BOTTOM_BRACKET, z), withZ(REAR_HUB, z), 0.025);
      addTube(withZ(SEAT_TOP, z * 0.8), withZ(REAR_HUB, z), 0.022);
      addTube(withZ(HEAD_BOTTOM, z), withZ(FRONT_HUB, z), 0.026);
    }

    addTube(SEAT_TOP, vec(SEAT_TOP.x, 1.36, 0), 0.03, mats.metal);   // seatpost

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.13), mats.black);
    saddle.position.set(-0.44, 1.4, 0);
    saddle.rotation.z = -0.05;
    frame.add(saddle);

    addTube(HEAD_TOP, vec(0.6, 1.34, 0), 0.03, mats.metal);           // stem
    addTube(vec(0.6, 1.34, 0), vec(0.56, 1.38, 0.22), 0.02, mats.black); // handlebar, right
    addTube(vec(0.6, 1.34, 0), vec(0.56, 1.38, -0.22), 0.02, mats.black); // handlebar, left
    return frame;
  }

  /** Crank arms, pedals and the front chainring. This group turns when pedalling. */
  function buildCrank(mats) {
    const crank = new THREE.Group();
    crank.position.copy(BOTTOM_BRACKET);

    crank.add(tube(vec(0, 0, 0.13), vec(0, -0.17, 0.13), 0.02, mats.metal));
    crank.add(tube(vec(0, 0, -0.13), vec(0, 0.17, -0.13), 0.02, mats.metal));

    const pedalGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.05);
    const pedalA = new THREE.Mesh(pedalGeometry, mats.black);
    pedalA.position.set(0, -0.17, 0.16);
    const pedalB = new THREE.Mesh(pedalGeometry, mats.black);
    pedalB.position.set(0, 0.17, -0.16);
    crank.add(pedalA, pedalB);

    const chainring = new THREE.Mesh(
      gearGeometry(CHAINRING_TEETH, CHAINRING_TEETH * TOOTH_SCALE, CHAINRING_TEETH * TOOTH_SCALE - 0.04, 0.02),
      mats.metal
    );
    chainring.position.z = 0.1;
    crank.add(chainring);
    return crank;
  }

  /** The cassette: one cog per gear, stacked along the rear hub */
  function buildCassette(mats) {
    const group = new THREE.Group();
    const cogs = GEAR_TEETH.map((teeth, index) => {
      const pitch = teeth * TOOTH_SCALE;
      const cog = new THREE.Mesh(
        gearGeometry(teeth, pitch + 0.008, pitch - 0.008, 0.008),
        mats.cogSilver
      );
      cog.position.z = 0.1 + index * 0.0095;
      group.add(cog);
      return cog;
    });
    return { group, cogs };
  }

  /** The chain: small oval links running from the chainring to the selected cog */
  function buildChain(mats, cogPitchRadius) {
    const chain = new THREE.Group();
    const ringRadius = CHAINRING_TEETH * TOOTH_SCALE;

    const addLinks = (from, to) => {
      const direction = new THREE.Vector3().subVectors(to, from);
      const length = direction.length();
      const count = Math.max(2, Math.floor(length / 0.035));
      const angle = Math.atan2(direction.y, direction.x);
      for (let i = 0; i <= count; i++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 12), mats.chain);
        link.scale.set(1.6, 1, 1);
        link.rotation.z = angle;
        link.position.copy(from).lerp(to, i / count);
        chain.add(link);
      }
    };

    // Upper run and lower run
    addLinks(vec(BOTTOM_BRACKET.x, BOTTOM_BRACKET.y + ringRadius, CHAIN_Z),
             vec(REAR_HUB.x, REAR_HUB.y + cogPitchRadius, CHAIN_Z));
    addLinks(vec(BOTTOM_BRACKET.x, BOTTOM_BRACKET.y - ringRadius, CHAIN_Z),
             vec(REAR_HUB.x, REAR_HUB.y - cogPitchRadius, CHAIN_Z));
    return chain;
  }

  /* ---------- 4. Viewer ---------- */

  /** Build and start a 3D viewer inside a container */
  function mount(container, options = {}) {
    destroy();

    if (!window.THREE) {
      container.innerHTML = `<p class="viewer-note">The 3D view needs an internet connection to load.</p>`;
      return false;
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);

    // Lights: soft fill, a warm key light, and magenta and violet rim lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(3, 5, 6);
    scene.add(keyLight);
    const magentaRim = new THREE.PointLight(0xd6408f, 1.2, 12);
    magentaRim.position.set(-3, 2, -3);
    const violetRim = new THREE.PointLight(0x6a3de8, 1.0, 12);
    violetRim.position.set(3, -1, -3);
    scene.add(magentaRim, violetRim);

    // Soft shadow under the bike
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1, 0.25, 1);
    scene.add(shadow);

    // Parts
    const mats = createMaterials(options.colour || "#a1262f");
    const root = new THREE.Group();
    scene.add(root);

    const rear = buildWheel(mats);
    rear.position.copy(REAR_HUB);
    const cassette = buildCassette(mats);
    rear.add(cassette.group);
    const front = buildWheel(mats);
    front.position.copy(FRONT_HUB);
    const crank = buildCrank(mats);

    root.add(rear, front, crank, buildFrame(mats));

    view = {
      container, renderer, scene, camera, root, mats,
      rear, front, crank, cassette, chain: null,
      gear: 0, speed: 0,
      autoRotate: false, dragging: false,
      yaw: DEFAULT_CAMERA.yaw, pitch: DEFAULT_CAMERA.pitch, radius: DEFAULT_CAMERA.radius,
      lastX: 0, lastY: 0, raf: 0, resizeObserver: null
    };

    setColour(options.colour || "#a1262f");
    setGear(options.gear ?? 5);
    setSpeed(options.speed ?? 0.6);
    setAutoRotate(options.autoRotate ?? true);

    attachControls(renderer.domElement);
    startLoop();

    view.resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h || !view) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    view.resizeObserver.observe(container);
    return true;
  }

  /** Mouse and touch controls: drag to orbit, scroll or pinch to zoom */
  function attachControls(canvas) {
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";

    const onPointerDown = event => {
      view.dragging = true;
      view.lastX = event.clientX;
      view.lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onPointerMove = event => {
      if (!view || !view.dragging) return;
      view.yaw -= (event.clientX - view.lastX) * 0.008;
      view.pitch = clamp(view.pitch + (event.clientY - view.lastY) * 0.005, -0.2, 1.0);
      view.lastX = event.clientX;
      view.lastY = event.clientY;
    };
    const onPointerUp = () => {
      if (!view) return;
      view.dragging = false;
      canvas.style.cursor = "grab";
    };
    const onWheel = event => {
      event.preventDefault();
      if (view) view.radius = clamp(view.radius + event.deltaY * 0.003, 3, 9);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
  }

  /** Animation loop: spins the wheels and crank, moves the camera, and draws the frame */
  function startLoop() {
    const clock = new THREE.Clock();

    const tick = () => {
      if (!view) return;
      view.raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);

      // Wheels and crank turn with the ride speed
      view.rear.rotation.z -= view.speed * dt * 3;
      view.front.rotation.z -= view.speed * dt * 3;
      view.crank.rotation.z -= view.speed * dt * 1.5;

      // Turntable
      if (view.autoRotate && !view.dragging) view.yaw += dt * 0.25;

      // Place the camera on a sphere around the bike
      const { yaw, pitch, radius } = view;
      view.camera.position.set(
        TARGET.x + radius * Math.cos(pitch) * Math.sin(yaw),
        TARGET.y + radius * Math.sin(pitch),
        TARGET.z + radius * Math.cos(pitch) * Math.cos(yaw)
      );
      view.camera.lookAt(TARGET);

      view.renderer.render(view.scene, view.camera);
    };
    tick();
  }

  /** Stop the viewer and free its memory. Safe to call when nothing is running. */
  function destroy() {
    if (!view) return;
    cancelAnimationFrame(view.raf);
    if (view.resizeObserver) view.resizeObserver.disconnect();
    disposeObject(view.scene);
    view.renderer.dispose();
    view.renderer.domElement.remove();
    view = null;
  }

  /* ---------- 5. Public API ---------- */

  function setColour(hex) {
    if (view) view.mats.frame.color.set(hex);
  }

  /** Highlight the chosen cog and rebuild the chain to reach it */
  function setGear(index) {
    if (!view) return;
    const gear = clamp(index, 0, GEAR_TEETH.length - 1);
    view.gear = gear;

    view.cassette.cogs.forEach((cog, i) => {
      cog.material = i === gear ? view.mats.cogSelected : view.mats.cogSilver;
    });

    if (view.chain) {
      view.root.remove(view.chain);
      disposeObject(view.chain);
    }
    view.chain = buildChain(view.mats, GEAR_TEETH[gear] * TOOTH_SCALE);
    view.root.add(view.chain);
  }

  function setSpeed(value) {
    if (view) view.speed = Math.max(0, value);
  }

  function setAutoRotate(on) {
    if (view) view.autoRotate = Boolean(on);
  }

  function resetView() {
    if (!view) return;
    view.yaw = DEFAULT_CAMERA.yaw;
    view.pitch = DEFAULT_CAMERA.pitch;
    view.radius = DEFAULT_CAMERA.radius;
  }

  return {
    GEAR_TEETH,
    CHAINRING_TEETH,
    mount,
    destroy,
    setColour,
    setGear,
    setSpeed,
    setAutoRotate,
    resetView
  };
})();
