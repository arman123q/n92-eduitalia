"use client";

/**
 * Cinematic hero for Student Essentials — a real-time Three.js
 * scene (Venice Grand Canal at sunset: gradient sky with the warm
 * band at the horizon, glowing sun, palazzi with lit windows, a
 * distant dome, shimmering water, an open suitcase with folded
 * clothes on the embankment, and gold floating essential tiles),
 * echoing the owner's approved reference composition.
 *
 * Performance & honesty rules:
 *  - The WebGL scene initialises ONLY on wide screens (>=1024px)
 *    with no reduced-motion preference and a working WebGL
 *    context; it lazy-loads the three.js chunk, caps pixel ratio,
 *    and pauses when off-screen or the tab is hidden.
 *  - Everyone else gets the static fallback image — a captured
 *    still of this very scene — which is never described as an
 *    animation.
 *  - The renderer is sized from the mount via ResizeObserver, so
 *    a not-yet-settled layout can never leave a 0×0 canvas stuck.
 */
import { useEffect, useRef, useState } from "react";
import { CheckSquare, Play } from "lucide-react";

export default function EssentialsHero({ onHowTo }: { onHowTo: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!wide || calm || !mountRef.current) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (disposed || !mountRef.current) return;
      const mount = mountRef.current;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
      } catch {
        return; // no WebGL — the fallback image stays
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      mount.appendChild(renderer.domElement);
      setWebgl(true);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
      camera.position.set(0, 2.4, 15);
      camera.lookAt(0.5, 1.75, 0);
      const fit = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (!w || !h) return false;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        return true;
      };
      fit();

      // --- Lights: sunset key + warm camera fill so the
      //     camera-facing sides of the palazzi never go black ---
      scene.add(new THREE.HemisphereLight(0xffd9b0, 0x24333c, 1.05));
      const sunLight = new THREE.DirectionalLight(0xffab66, 1.5);
      sunLight.position.set(-7, 5, -10);
      scene.add(sunLight);
      const fill = new THREE.DirectionalLight(0xffc39a, 0.55);
      fill.position.set(6, 4, 16);
      scene.add(fill);
      scene.add(new THREE.AmbientLight(0x70543e, 0.5));
      const caseLight = new THREE.PointLight(0xffbe78, 34, 22, 2);
      caseLight.position.set(5, 3.2, 9);
      scene.add(caseLight);

      // --- Sky: gradient compressed so the amber band sits
      //     exactly at the horizon line ---
      const skyCanvas = document.createElement("canvas");
      skyCanvas.width = 4; skyCanvas.height = 512;
      const sg = skyCanvas.getContext("2d")!;
      const grad = sg.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, "#1c143c");
      grad.addColorStop(0.45, "#4a2560");
      grad.addColorStop(0.65, "#b4505f");
      grad.addColorStop(0.8, "#f08a4e");
      grad.addColorStop(0.95, "#ffc978");
      grad.addColorStop(1, "#ffd489");
      sg.fillStyle = grad; sg.fillRect(0, 0, 4, 512);
      const sky = new THREE.Mesh(
        new THREE.PlaneGeometry(170, 34),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(skyCanvas), fog: false })
      );
      sky.position.set(0, 11.5, -34);
      scene.add(sky);

      // --- Sun + glow ---
      const sun = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), new THREE.MeshBasicMaterial({ color: 0xffe3a1, fog: false }));
      sun.position.set(1.2, 2.9, -30);
      scene.add(sun);
      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = glowCanvas.height = 128;
      const gg = glowCanvas.getContext("2d")!;
      const rg = gg.createRadialGradient(64, 64, 2, 64, 64, 64);
      rg.addColorStop(0, "rgba(255,205,130,0.9)");
      rg.addColorStop(1, "rgba(255,205,130,0)");
      gg.fillStyle = rg; gg.fillRect(0, 0, 128, 128);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false }));
      glow.scale.setScalar(14);
      glow.position.copy(sun.position);
      scene.add(glow);

      // --- Distant skyline: dome + campanile silhouettes ---
      const silhouette = new THREE.MeshStandardMaterial({ color: 0x4a3049, roughness: 1 });
      const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.7, 1.8, 20), silhouette);
      domeBase.position.set(3.2, 1.9, -25.5);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.35, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), silhouette);
      dome.position.set(3.2, 2.8, -25.5);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.9, 12), silhouette);
      spire.position.set(3.2, 6.2, -25.5);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 7, 10), silhouette);
      tower.position.set(7.4, 3.5, -25.5);
      scene.add(domeBase, dome, spire, tower);
      for (let i = 0; i < 9; i++) {
        const h = 1.8 + Math.sin(i * 2.7) * 0.6 + (i % 3) * 0.4;
        const b = new THREE.Mesh(new THREE.BoxGeometry(2.7, h, 1.4), silhouette);
        b.position.set(-14 + i * 3.2 + (i === 4 ? 3.4 : 0), h / 2, -26);
        scene.add(b);
      }

      // --- Palazzi banks (windows as children, so they follow
      //     each building's rotation exactly) ---
      const plaster = [0xa85f41, 0xbc7349, 0x97553f, 0xc98452, 0xa35a40];
      const litMat = new THREE.MeshBasicMaterial({ color: 0xffca7a });
      const darkWinMat = new THREE.MeshStandardMaterial({ color: 0x4c2f28, roughness: 1 });
      const addBank = (side: 1 | -1) => {
        for (let i = 0; i < 6; i++) {
          const w = 3.4 + (i % 3) * 0.7;
          const h = 3.9 + ((i * 7) % 3) * 0.8;
          const b = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, 3),
            new THREE.MeshStandardMaterial({ color: plaster[(i + (side > 0 ? 2 : 0)) % plaster.length], roughness: 0.95 })
          );
          b.position.set(side * (12.4 + (i % 2) * 0.8), h / 2 + 0.3, -16.5 + i * 3.05);
          b.rotation.y = side * -0.3;
          const rows = Math.max(2, Math.floor(h / 1.2));
          for (let wy = 0; wy < rows; wy++) {
            for (let wx = 0; wx < 3; wx++) {
              if ((wx * 3 + wy * 7 + i) % 3 === 0) continue;
              const win = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.52), (wx + wy + i) % 4 === 0 ? darkWinMat : litMat);
              win.position.set(-side * (w / 2 + 0.02), -h / 2 + 1.05 + wy * 1.15, -0.95 + wx * 0.95);
              win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
              b.add(win);
              if ((wx + wy * 2 + i) % 3 !== 0) {
                const front = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.52), (wx * 2 + wy + i) % 5 === 0 ? darkWinMat : litMat);
                front.position.set(-w / 2 + 0.65 + wx * ((w - 1.3) / 2), -h / 2 + 1.05 + wy * 1.15, 1.52);
                b.add(front);
              }
            }
          }
          scene.add(b);
        }
      };
      addBank(-1); addBank(1);

      // --- Water (custom shader: deep teal, sun glints, sparkle) ---
      const waterUniforms = { uTime: { value: 0 } };
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 44),
        new THREE.ShaderMaterial({
          uniforms: waterUniforms,
          vertexShader: `varying vec2 vUv; varying vec3 vPos; void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.0); vPos=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
          fragmentShader: `
            uniform float uTime; varying vec2 vUv; varying vec3 vPos;
            float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
            void main(){
              vec3 deep = vec3(0.02,0.09,0.115);
              vec3 skyTint = vec3(0.82,0.42,0.25);
              float fres = pow(1.0 - vUv.y, 1.7);
              vec3 col = mix(deep, skyTint, fres*0.38);
              float colBand = smoothstep(0.35, 0.0, abs(vPos.x - 1.2 + sin(vPos.z*0.7 + uTime*0.7)*0.6));
              col += vec3(1.0,0.6,0.28) * colBand * 0.4 * (0.6 + 0.4*sin(vPos.z*1.4 - uTime*1.6));
              vec2 cell = floor(vec2(vPos.x*5.0, vPos.z*5.0 + uTime*0.9));
              float sparkle = step(0.978, hash(cell)) * (0.5 + 0.5*sin(uTime*3.0 + hash(cell.yx)*40.0));
              col += vec3(1.0,0.8,0.5) * sparkle * 0.45;
              float ripple = sin(vPos.z*2.2 + uTime*1.2 + sin(vPos.x*1.7)*1.3)*0.025;
              col += ripple;
              gl_FragColor = vec4(col, 1.0);
            }`,
        })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, 0, -8);
      scene.add(water);

      // --- Embankment foreground ---
      const stoneCanvas = document.createElement("canvas");
      stoneCanvas.width = stoneCanvas.height = 128;
      const sc = stoneCanvas.getContext("2d")!;
      sc.fillStyle = "#6a5546"; sc.fillRect(0, 0, 128, 128);
      for (let n = 0; n < 900; n++) {
        sc.fillStyle = Math.random() > 0.5 ? "rgba(0,0,0,0.13)" : "rgba(255,235,200,0.10)";
        sc.fillRect(Math.random() * 128, Math.random() * 128, 2.4, 2.4);
      }
      sc.fillStyle = "rgba(0,0,0,0.18)";
      for (let lx = 0; lx <= 128; lx += 32) sc.fillRect(lx, 0, 1.5, 128);
      const stoneTex = new THREE.CanvasTexture(stoneCanvas);
      stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
      stoneTex.repeat.set(10, 1.4);
      const quay = new THREE.Mesh(new THREE.BoxGeometry(46, 1.1, 4.6), new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 1 }));
      quay.position.set(0, -0.55, 9.9);
      scene.add(quay);

      // --- Open suitcase with folded clothes ---
      const caseGroup = new THREE.Group();
      const shellMat = new THREE.MeshStandardMaterial({ color: 0x6e4a30, roughness: 0.55, metalness: 0.1 });
      const liningMat = new THREE.MeshStandardMaterial({ color: 0x9c343c, roughness: 0.9 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.75, 2.3), shellMat);
      base.position.y = 0.38;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.28, 2.3), shellMat);
      lid.position.set(0, 1.3, -1.45);
      lid.rotation.x = -0.52;
      const lidInner = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.06, 2.0), new THREE.MeshStandardMaterial({ color: 0xa83a42, roughness: 0.9 }));
      lidInner.position.set(0, -0.16, 0);
      lid.add(lidInner);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.1, 2.0), liningMat);
      inner.position.y = 0.78;
      caseGroup.add(base, lid, inner);
      const clothCols = [0xf3ead8, 0x9db08a, 0xc7a05a, 0x708090];
      clothCols.forEach((c, i) => {
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.25 - (i % 2) * 0.15, 0.22, 0.95), new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
        cloth.position.set(-0.75 + (i % 2) * 1.45, 0.95 + Math.floor(i / 2) * 0.24, 0.1 - (i % 2) * 0.2);
        cloth.rotation.y = (i % 2 ? -1 : 1) * 0.06;
        caseGroup.add(cloth);
      });
      const passport = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.88), new THREE.MeshStandardMaterial({ color: 0x24365e, roughness: 0.45 }));
      passport.position.set(0.85, 1.3, 0.35);
      passport.rotation.y = -0.4;
      caseGroup.add(passport);
      caseGroup.position.set(4.1, 0.06, 5.2);
      caseGroup.rotation.y = -0.55;
      scene.add(caseGroup);

      // Steel bottle + book stack beside the case
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.95, 18), new THREE.MeshStandardMaterial({ color: 0xc3c9cd, roughness: 0.25, metalness: 0.9 }));
      bottle.position.set(6.3, 0.5, 5.7);
      scene.add(bottle);
      [0x103f35, 0xc7a05a, 0xfaf9f5].forEach((c, i) => {
        const book = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.13, 0.78), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
        book.position.set(6.15, 0.1 + i * 0.14, 4.15);
        book.rotation.y = (i - 1) * 0.16;
        scene.add(book);
      });

      // --- Floating gold tiles with drawn glyph icons ---
      const glyphs: ((g: CanvasRenderingContext2D) => void)[] = [
        (g) => { g.font = "92px serif"; g.fillText("✈", 30, 105); },
        (g) => { g.beginPath(); g.arc(75, 62, 34, Math.PI * 1.05, Math.PI * 1.95); g.lineWidth = 10; g.stroke(); g.fillRect(36, 58, 16, 42); g.fillRect(98, 58, 16, 42); },
        (g) => { g.fillRect(58, 22, 34, 40); g.fillRect(64, 8, 8, 16); g.fillRect(80, 8, 8, 16); g.fillRect(42, 84, 66, 12); g.fillRect(70, 62, 10, 24); },
        (g) => { g.strokeRect(32, 34, 86, 58); g.fillRect(24, 100, 102, 10); },
        (g) => { g.beginPath(); g.moveTo(52, 26); g.lineTo(98, 26); g.lineTo(122, 52); g.lineTo(100, 66); g.lineTo(100, 118); g.lineTo(50, 118); g.lineTo(50, 66); g.lineTo(28, 52); g.closePath(); g.lineWidth = 8; g.stroke(); },
        (g) => { g.strokeRect(48, 18, 54, 104); g.beginPath(); g.moveTo(66, 106); g.lineTo(84, 106); g.lineWidth = 7; g.stroke(); },
      ];
      const tiles: InstanceType<typeof THREE.Group>[] = [];
      const tilePos: [number, number, number][] = [[0.6, 4.6, 3.4], [2.2, 5.6, 2.6], [3.9, 4.9, 3.1], [5.4, 5.9, 2.4], [6.9, 4.7, 3.0], [4.6, 3.6, 3.8]];
      glyphs.forEach((draw, i) => {
        const cnv = document.createElement("canvas");
        cnv.width = cnv.height = 150;
        const g = cnv.getContext("2d")!;
        g.fillStyle = "#0c2921";
        g.fillRect(0, 0, 150, 150);
        g.strokeStyle = "#e9c979";
        g.fillStyle = "#e9c979";
        g.lineWidth = 8;
        draw(g);
        const grp = new THREE.Group();
        const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 1.28), new THREE.MeshBasicMaterial({ color: 0xc7a05a }));
        frame.position.z = -0.012;
        const face = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 1.16), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cnv) }));
        grp.add(frame, face);
        grp.position.set(...tilePos[i]);
        grp.userData.phase = i * 1.13;
        grp.userData.baseY = tilePos[i][1];
        scene.add(grp);
        tiles.push(grp);
      });

      // --- Animate ---
      const clock = new THREE.Clock();
      let raf = 0;
      let running = true;
      let mx = 0;
      const onPointer = (e: PointerEvent) => { mx = (e.clientX / window.innerWidth - 0.5) * 0.9; };
      window.addEventListener("pointermove", onPointer);
      const io = new IntersectionObserver(([en]) => { running = en.isIntersecting; }, { threshold: 0.05 });
      io.observe(mount);
      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!running || document.hidden) return;
        const t = clock.getElapsedTime();
        waterUniforms.uTime.value = t;
        tiles.forEach((tile) => {
          tile.position.y = tile.userData.baseY + Math.sin(t * 0.9 + tile.userData.phase) * 0.16;
          tile.rotation.y = Math.sin(t * 0.5 + tile.userData.phase) * 0.16;
          tile.rotation.z = Math.cos(t * 0.4 + tile.userData.phase) * 0.05;
        });
        camera.position.x += ((mx + Math.sin(t * 0.07) * 0.35) - camera.position.x) * 0.03;
        camera.lookAt(0.5, 1.75, 0);
        renderer.render(scene, camera);
      };
      tick();
      (window as unknown as { __essentialsHeroReady?: boolean }).__essentialsHeroReady = true;

      const onResize = () => { fit(); };
      window.addEventListener("resize", onResize);
      const ro = new ResizeObserver(() => { fit(); });
      ro.observe(mount);

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onPointer);
        renderer.dispose();
        mount.removeChild(renderer.domElement);
      };
    })();

    return () => { disposed = true; cleanup?.(); };
  }, []);

  const scrollToChecklist = () => {
    document.getElementById("checklist")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative isolate overflow-hidden bg-[#241a33]" aria-label="Italy Student Checklist and Essentials">
      {/* Static fallback still (also the poster while WebGL warms up) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/essentials-hero.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div ref={mountRef} className={`absolute inset-0 ${webgl ? "" : "hidden"}`} aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#160f24]/72 via-[#160f24]/38 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#160f24]/55 to-transparent" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[540px] w-full max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:min-h-[600px]">
        <p className="inline-flex w-fit items-center rounded-full bg-[#103F35] px-4 py-1.5 text-[0.78rem] font-bold uppercase tracking-[0.14em] text-[#FAF9F5] ring-1 ring-[#C7A05A]/60">
          N92 Student Essentials
        </p>
        <h1 className="font-display mt-5 max-w-2xl text-[2.6rem] font-bold leading-[1.08] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-6xl">
          Italy Student Checklist &amp; Essentials
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#FAF9F5]/92 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
          Everything Indian students need to prepare before moving to Italy.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={scrollToChecklist} className="inline-flex items-center gap-2 rounded-full bg-[#FAF9F5] px-6 py-3 text-[0.95rem] font-bold text-[#103F35] shadow-lg transition hover:bg-white">
            <CheckSquare size={18} aria-hidden="true" /> Start My Checklist
          </button>
          <button type="button" onClick={onHowTo} className="inline-flex items-center gap-2 rounded-full border-2 border-[#FAF9F5]/85 px-6 py-3 text-[0.95rem] font-bold text-white backdrop-blur-sm transition hover:bg-white/10">
            <Play size={17} aria-hidden="true" /> How to Use This Guide
          </button>
        </div>
      </div>
    </section>
  );
}
