"use client";

/**
 * Stage 5 — cinematic Venetian 3D hero (Three.js, fully procedural, no assets).
 *
 * Safety contract (brief Stage 5):
 * - Purely decorative: aria-hidden, pointer-events none, layered UNDER content.
 * - The eligibility form never depends on this component.
 * - Fallbacks: if WebGL is unavailable, the import fails, or the user prefers
 *   reduced motion, nothing renders and the CSS/SVG skyline scene remains.
 * - Performance: lazy-loaded (separate chunk), DPR capped, animation pauses
 *   when the tab is hidden or the hero is scrolled out of view, geometry and
 *   materials disposed on unmount.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

const PALETTE = [0xf3e3c2, 0xe8c9a0, 0xdfa878, 0xd9b48c, 0xcfa06e, 0xf0dcc0, 0xe3b48a];

function facadeTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f5efe4";
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = "rgba(70,50,30,0.85)";
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const x = 14 + col * 38;
      const y = 18 + row * 48;
      g.fillRect(x, y, 18, 28);
      g.fillStyle = "rgba(255,214,150,0.9)";
      g.fillRect(x + 3, y + 3, 12, 10);
      g.fillStyle = "rgba(70,50,30,0.85)";
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function Hero3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // --- fallback gates ---
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // WebGL unavailable → CSS/SVG scene stays
    }

    const isSmall = window.innerWidth < 640;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf6e8cd, 26, 62);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(0, 3.4, 15);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.25 : 1.75));
    renderer.domElement.style.opacity = "0";
    renderer.domElement.style.transition = "opacity 1.2s ease";
    mount.appendChild(renderer.domElement);

    // --- lights ---
    scene.add(new THREE.HemisphereLight(0xfff2dd, 0x8a6f4d, 0.9));
    const sun = new THREE.DirectionalLight(0xffd9a3, 1.6);
    sun.position.set(-8, 12, 6);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffe9c4, 0.35));

    const world = new THREE.Group();
    scene.add(world);

    // --- canal water ---
    const waterGeo = new THREE.PlaneGeometry(10.5, 74, 20, 60);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x1d5c4d, roughness: 0.32, metalness: 0.15 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0, -12);
    world.add(water);
    const waterBase = waterGeo.attributes.position.array.slice();

    // --- banks ---
    const bankMaterial = new THREE.MeshStandardMaterial({ color: 0xcbb693, roughness: 0.9 });
    for (const side of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(9, 0.24, 74), bankMaterial);
      bank.position.set(side * 9.7, 0.1, -12);
      world.add(bank);
    }

    // --- buildings ---
    const tex = facadeTexture();
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    for (const side of [-1, 1]) {
      for (let z = 8; z > -40; z -= rand(4.2, 5.2)) {
        const h = rand(3.2, 8.6);
        const w = rand(3.4, 4.6);
        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          roughness: 0.85,
        });
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, h, rand(3.4, 4.6));
        b.position.set(side * rand(8.2, 10.5), h / 2 + 0.2, z + rand(-0.6, 0.6));
        world.add(b);
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(w * 0.78, 1.1, 4),
          new THREE.MeshStandardMaterial({ color: 0xa15c3a, roughness: 0.9 })
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.set(b.position.x, h + 0.75, b.position.z);
        roof.scale.z = 0.7;
        world.add(roof);
      }
    }

    // --- campanile + dome silhouettes ---
    const brick = new THREE.MeshStandardMaterial({ color: 0xb0764f, roughness: 0.9 });
    const patina = new THREE.MeshStandardMaterial({ color: 0x2e6f5e, roughness: 0.6, metalness: 0.2 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.7, 15, 1.7), brick);
    tower.position.set(-11.5, 7.5, -27);
    world.add(tower);
    const towerTop = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3, 4), patina);
    towerTop.rotation.y = Math.PI / 4;
    towerTop.position.set(-11.5, 16.5, -27);
    world.add(towerTop);
    const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.8, 3.4, 20), new THREE.MeshStandardMaterial({ color: 0xefe3cb, roughness: 0.85 }));
    domeBase.position.set(10.5, 1.7, -31);
    world.add(domeBase);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.3, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), patina);
    dome.position.set(10.5, 3.4, -31);
    world.add(dome);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 2.4, 8), patina);
    spire.position.set(10.5, 8.6, -31);
    world.add(spire);

    // --- mooring poles ---
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.95 });
    for (let i = 0; i < 10; i++) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 6), poleMat);
      pole.position.set((i % 2 === 0 ? -1 : 1) * 4.6, 0.9, 4 - i * 4.4);
      pole.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.05;
      world.add(pole);
    }

    // --- golden journey path + travelling light ---
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-6.5, 6.2, 9),
      new THREE.Vector3(-3, 8.2, -3),
      new THREE.Vector3(2, 9.2, -13),
      new THREE.Vector3(6.5, 7.4, -24),
      new THREE.Vector3(9.5, 6.4, -29),
    ]);
    const path = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 64, 0.05, 8),
      new THREE.MeshStandardMaterial({ color: 0xc7a05a, emissive: 0x9a742a, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.6 })
    );
    world.add(path);
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffe1a0, emissive: 0xffc65e, emissiveIntensity: 2.2 })
    );
    world.add(orb);
    const orbLight = new THREE.PointLight(0xffd98a, 14, 13);
    world.add(orbLight);

    // --- gold dust particles ---
    const count = isSmall ? 60 : 130;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rand(-13, 13);
      pos[i * 3 + 1] = rand(0.5, 9.5);
      pos[i * 3 + 2] = rand(-36, 10);
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0xd9b36c, size: 0.13, transparent: true, opacity: 0.55, depthWrite: false })
    );
    world.add(particles);

    // --- interaction state ---
    let tx = 0, ty = 0, cx = 0, cy = 0, scrollP = 0;
    const onPointer = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 1.1;
      ty = (e.clientY / window.innerHeight - 0.5) * 0.55;
    };
    const onScroll = () => {
      scrollP = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    let visible = true;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0.02 });
    io.observe(mount);

    let raf = 0;
    let firstFrame = true;
    const clock = new THREE.Clock();
    const waterPos = waterGeo.attributes.position;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!visible || document.hidden) return;
      const t = clock.getElapsedTime();

      // gentle water
      for (let i = 0; i < waterPos.count; i++) {
        const x = waterBase[i * 3], y = waterBase[i * 3 + 1];
        waterPos.setZ(i, Math.sin(x * 1.4 + t * 1.1) * 0.045 + Math.cos(y * 0.9 + t * 0.7) * 0.04);
      }
      waterPos.needsUpdate = true;

      // travelling light along the golden path
      const u = (t * 0.045) % 1;
      const p = curve.getPointAt(u);
      orb.position.copy(p);
      orbLight.position.copy(p);

      // drifting dust
      particles.rotation.y = Math.sin(t * 0.05) * 0.02;
      particles.position.y = Math.sin(t * 0.24) * 0.18;

      // restrained camera: pointer parallax + idle sway + scroll lift
      cx += (tx - cx) * 0.04;
      cy += (ty - cy) * 0.04;
      camera.position.x = cx + Math.sin(t * 0.11) * 0.25;
      camera.position.y = 3.4 - cy + scrollP * 1.5 + Math.sin(t * 0.16) * 0.08;
      camera.lookAt(0, 2.6, -8);
      world.rotation.y = scrollP * 0.05;

      renderer.render(scene, camera);
      if (firstFrame) {
        firstFrame = false;
        renderer.domElement.style.opacity = "1";
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m) m.dispose();
      });
      tex.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}
