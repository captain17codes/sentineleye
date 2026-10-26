import * as THREE from 'three';

/**
 * Visual layers added on top of the react-globe.gl Earth (which shows Esri / Blue Marble imagery):
 *  - a lighting shell: day/night terminator, city lights on the night side, sun glint on water,
 *    relief shading from an elevation map, and a blue rim at the limb;
 *  - a slowly drifting cloud layer;
 *  - a detailed Sentinel-2 style satellite with a sensor fan pointing at the ground.
 * The sun is placed relative to the camera (light from the front-left) so the view always reads well;
 * it is an illustration, not the real-time sun position.
 */

const R = 100; // three-globe GLOBE_RADIUS

const loader = new THREE.TextureLoader();
function tex(url: string, srgb = false) {
  const t = loader.load(url);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SHELL_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SHELL_FRAG = /* glsl */ `
  uniform sampler2D nightTex;
  uniform sampler2D waterTex;
  uniform sampler2D heightTex;
  uniform vec3 sunDir;
  uniform float fade;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vPos;
  void main() {
    vec3 N = normalize(vN);
    // relief from the elevation map
    vec2 du = vec2(1.0 / 2048.0, 0.0);
    vec2 dv = vec2(0.0, 1.0 / 1024.0);
    float hx = texture2D(heightTex, vUv + du).r - texture2D(heightTex, vUv - du).r;
    float hy = texture2D(heightTex, vUv + dv).r - texture2D(heightTex, vUv - dv).r;
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), N) + vec3(1e-5));
    vec3 north = normalize(cross(N, east));
    vec3 Nb = normalize(N - 2.2 * (hx * east + hy * north));

    float d = dot(N, sunDir);
    float db = dot(Nb, sunDir);
    float night = smoothstep(0.08, -0.16, d);

    vec3 V = normalize(cameraPosition - vPos);
    float water = texture2D(waterTex, vUv).r;
    vec3 H = normalize(sunDir + V);
    float spec = pow(max(dot(N, H), 0.0), 220.0) * water * smoothstep(-0.02, 0.25, d);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    vec3 lights = texture2D(nightTex, vUv).rgb;
    lights = pow(lights, vec3(1.6)) * vec3(1.0, 0.78, 0.48) * 2.2;
    float twilight = exp(-pow(d / 0.11, 2.0));

    // day side: soft Lambert falloff + relief, kept light so the imagery stays true
    float shade = (1.0 - smoothstep(-0.1, 0.9, db)) * 0.42;
    float a = mix(shade, 0.92, night);
    vec3 col = lights * night
             + vec3(1.0, 0.5, 0.2) * twilight * 0.12
             + vec3(1.0, 0.96, 0.88) * spec * 0.3
             + vec3(0.42, 0.66, 1.0) * fres * (1.0 - night) * 0.55;
    a = clamp(a + spec * 0.4, 0.0, 0.96);
    // premultiplied output (blend: ONE, ONE_MINUS_SRC_ALPHA)
    gl_FragColor = vec4(col * fade, a * fade);
  }
`;

const CLOUD_FRAG = /* glsl */ `
  uniform sampler2D cloudTex;
  uniform vec3 sunDir;
  uniform float fade;
  uniform float shift;
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    float c = texture2D(cloudTex, vec2(vUv.x + shift, vUv.y)).r;
    c = smoothstep(0.12, 0.85, c);
    float d = dot(normalize(vN), sunDir);
    float lit = smoothstep(-0.18, 0.35, d);
    vec3 col = mix(vec3(0.05, 0.06, 0.09), vec3(1.0), lit);
    float a = c * 0.82 * fade * mix(0.35, 1.0, lit);
    gl_FragColor = vec4(col * a, a);
  }
`;

export interface GlobeLook {
  update(camera: THREE.Camera, altitude: number, timeS: number): void;
  dispose(): void;
}

export function addGlobeLook(scene: THREE.Scene): GlobeLook {
  const sunDir = { value: new THREE.Vector3(1, 0, 0) };

  const shellMat = new THREE.ShaderMaterial({
    uniforms: {
      nightTex: { value: tex('/textures/earth-night.jpg', false) },
      waterTex: { value: tex('/textures/earth-water.jpg') },
      heightTex: { value: tex('/textures/earth-topology.jpg') },
      sunDir,
      fade: { value: 1 },
    },
    vertexShader: SHELL_VERT,
    fragmentShader: SHELL_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R * 1.0012, 160, 80), shellMat);
  shell.rotation.y = -Math.PI / 2; // same orientation as the three-globe sphere
  shell.renderOrder = 2;

  const cloudMat = new THREE.ShaderMaterial({
    uniforms: { cloudTex: { value: tex('/textures/earth-clouds.jpg') }, sunDir, fade: { value: 1 }, shift: { value: 0 } },
    vertexShader: SHELL_VERT,
    fragmentShader: CLOUD_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.007, 128, 64), cloudMat);
  clouds.rotation.y = -Math.PI / 2;
  clouds.renderOrder = 3;

  scene.add(shell, clouds);

  const toCam = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();

  return {
    update(camera, altitude, timeS) {
      camera.updateMatrixWorld();
      toCam.copy(camera.position).normalize();
      right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      up.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      sunDir.value.copy(toCam).multiplyScalar(0.5).addScaledVector(right, -0.82).addScaledVector(up, 0.3).normalize();

      const shellFade = THREE.MathUtils.smoothstep(altitude, 0.06, 0.45);
      shellMat.uniforms.fade.value = shellFade;
      shell.visible = shellFade > 0.01;
      const cloudFade = THREE.MathUtils.smoothstep(altitude, 0.12, 0.55);
      cloudMat.uniforms.fade.value = cloudFade;
      cloudMat.uniforms.shift.value = (timeS * 0.0009) % 1;
      clouds.visible = cloudFade > 0.01;
    },
    dispose() {
      scene.remove(shell, clouds);
      shell.geometry.dispose();
      clouds.geometry.dispose();
      shellMat.dispose();
      cloudMat.dispose();
    },
  };
}

// ── satellite ─────────────────────────────────────────────────────────────

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d') as CanvasRenderingContext2D);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function foilTexture() {
  return canvasTex(256, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, '#f6d37a');
    g.addColorStop(0.5, '#c9962e');
    g.addColorStop(1, '#f0c560');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    let s = 3;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      c.strokeStyle = rnd() > 0.5 ? 'rgba(255,240,190,0.35)' : 'rgba(110,70,10,0.3)';
      c.lineWidth = 0.6 + rnd() * 1.4;
      c.beginPath();
      const x = rnd() * 256, y = rnd() * 256;
      c.moveTo(x, y);
      c.lineTo(x + (rnd() - 0.5) * 70, y + (rnd() - 0.5) * 70);
      c.stroke();
    }
  });
}

function solarTexture() {
  return canvasTex(512, 256, (c) => {
    c.fillStyle = '#0b1530';
    c.fillRect(0, 0, 512, 256);
    const cols = 16, rows = 8;
    const cw = 512 / cols, ch = 256 / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const g = c.createLinearGradient(x * cw, y * ch, (x + 1) * cw, (y + 1) * ch);
        g.addColorStop(0, '#1d3b82');
        g.addColorStop(1, '#0e1f4d');
        c.fillStyle = g;
        c.fillRect(x * cw + 1.5, y * ch + 1.5, cw - 3, ch - 3);
        c.strokeStyle = 'rgba(160,190,255,0.18)';
        c.lineWidth = 0.6;
        c.beginPath();
        c.moveTo(x * cw + cw / 2, y * ch + 2);
        c.lineTo(x * cw + cw / 2, (y + 1) * ch - 2);
        c.stroke();
      }
    }
    c.strokeStyle = '#c9ccd4';
    c.lineWidth = 4;
    c.strokeRect(2, 2, 508, 252);
  });
}

export function buildSentinel2(): THREE.Group {
  const sat = new THREE.Group();

  const foil = new THREE.MeshStandardMaterial({ map: foilTexture(), metalness: 0.85, roughness: 0.32, emissive: 0x2a1e05 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe9e9e4, metalness: 0.1, roughness: 0.55, emissive: 0x1a1a1a });
  const silver = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.9, roughness: 0.25, emissive: 0x111111 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.3, roughness: 0.6 });
  const cells = new THREE.MeshStandardMaterial({
    map: solarTexture(),
    metalness: 0.55,
    roughness: 0.28,
    emissive: 0x050c22,
    side: THREE.DoubleSide,
  });
  const backing = new THREE.MeshStandardMaterial({ color: 0x9a9a92, metalness: 0.4, roughness: 0.6 });

  // bus: +z faces the ground (nadir), +y is the flight direction, panels extend to -x
  const bus = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 2.2), [foil, white, foil, foil, foil, foil]);
  sat.add(bus);
  // white radiator panels on the side faces
  for (const sx of [1]) {
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.6, 1.7), white);
    rad.position.set(sx * 1.22, 0, 0);
    sat.add(rad);
  }
  // top deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.5, 0.12), foil);
  deck.position.z = -1.12;
  sat.add(deck);

  // MSI instrument on the nadir face
  const msi = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 0.9), white);
  msi.position.set(0.2, 0.4, 1.5);
  sat.add(msi);
  const baffle = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.36, 0.3), black);
  baffle.position.set(0.2, 0.4, 2.0);
  sat.add(baffle);

  // star trackers
  for (const [x, y] of [[-0.7, -1.2], [-0.25, -1.35]] as const) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 16), black);
    st.rotation.x = Math.PI / 2;
    st.position.set(x, y, -1.45);
    sat.add(st);
  }
  // X-band antenna
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), silver);
  dish.rotation.x = -Math.PI / 2;
  dish.position.set(0.7, -1.4, 1.25);
  sat.add(dish);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), silver);
  mast.rotation.x = Math.PI / 2;
  mast.position.set(0.7, -1.4, 1.35);
  sat.add(mast);

  // solar wing: yoke + three panels
  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8), silver);
  yoke.rotation.z = Math.PI / 2;
  yoke.position.set(-2.0, 0, -0.4);
  sat.add(yoke);
  const panelW = 2.6, panelH = 2.2;
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Group();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), cells);
    face.rotation.x = Math.PI; // cells face the sky (-z)
    face.position.z = -0.03;
    const back = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, 0.05), backing);
    p.add(back, face);
    p.position.set(-2.8 - panelW / 2 - i * (panelW + 0.08), 0, -0.4);
    sat.add(p);
  }

  // pushbroom sensor fan towards the ground (290 km swath)
  const fanMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `varying float vT; void main(){ vT = uv.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying float vT; void main(){ float a = 0.34 * (1.0 - vT) + 0.05; gl_FragColor = vec4(0.55,0.75,1.0, a); }`,
  });
  const fanGeo = new THREE.BufferGeometry();
  // apex at the instrument, base on the ground (filled in by setFanLength)
  fanGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -1, 0, 1, 1, 0, 1], 3));
  fanGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 1, 0, 0, 1, 0], 2));
  const fan = new THREE.Mesh(fanGeo, fanMat);
  fan.name = 'fan';
  fan.position.set(0.2, 0.4, 2.15);
  sat.add(fan);

  return sat;
}

/** Stretches the sensor fan so it reaches the ground: length and half-width in the satellite's local units. */
export function setFanSize(sat: THREE.Object3D, length: number, halfWidth: number) {
  const fan = sat.getObjectByName('fan') as THREE.Mesh | undefined;
  if (!fan) return;
  const pos = fan.geometry.getAttribute('position') as THREE.BufferAttribute;
  pos.setXYZ(1, -halfWidth, 0, length);
  pos.setXYZ(2, halfWidth, 0, length);
  pos.needsUpdate = true;
  fan.geometry.computeBoundingSphere();
}

/** Image-based lighting so the metal parts reflect something. */
export function satelliteEnvironment(renderer: THREE.WebGLRenderer, sat: THREE.Object3D) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 earth = vec3(0.10,0.22,0.42); vec3 space = vec3(0.02); vec3 c = mix(earth, space, smoothstep(-0.2,0.3,h)); float sun = pow(max(dot(normalize(vP), normalize(vec3(-0.6,0.5,0.6))),0.0), 64.0)*8.0; gl_FragColor = vec4(c + vec3(sun),1.0); }`,
    })
  );
  envScene.add(sky);
  const env = pmrem.fromScene(envScene).texture;
  sat.traverse((o: any) => {
    if (o.isMesh && o.material?.isMeshStandardMaterial) {
      o.material.envMap = env;
      o.material.envMapIntensity = o.material.map && o.material.side === THREE.DoubleSide ? 0.45 : 1.3;
      o.material.needsUpdate = true;
    }
    if (o.isMesh && Array.isArray(o.material)) {
      o.material.forEach((m: any) => {
        if (m.isMeshStandardMaterial) {
          m.envMap = env;
          m.envMapIntensity = 1.2;
          m.needsUpdate = true;
        }
      });
    }
  });
  pmrem.dispose();
}
