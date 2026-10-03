import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import * as THREE from 'three';
import { coastalScene } from '../lib/scenery';

/** A photographic relief mesh: the cliff and road sit in front of the horizon. */
export function ScenicJourney({ selectedIndex }: { selectedIndex: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedIndex);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pausedRef = useRef(paused);
  const [ready, setReady] = useState(false);
  useEffect(() => { selectedRef.current = selectedIndex; }, [selectedIndex]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 150);
    camera.position.set(0, 0, 42);
    const geometry = new THREE.PlaneGeometry(76, 31.66, 100, 48);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i) / 38;
      const y = vertices.getY(i) / 15.83;
      const foreground = Math.max(0, -y + 0.1);
      const cliff = Math.max(0, x) * Math.max(0, 0.95 - y);
      vertices.setZ(i, foreground * 2.8 + cliff * 3.8);
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    let disposed = false;
    let texture: THREE.Texture | undefined;
    new THREE.TextureLoader().load(coastalScene, (loaded) => {
      if (disposed) { loaded.dispose(); return; }
      texture = loaded;
      loaded.colorSpace = THREE.SRGBColorSpace;
      material.map = loaded;
      material.needsUpdate = true;
      renderer.render(scene, camera);
      setReady(true);
    });
    function resize() {
      if (!host || disposed) return;
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      // Cover every aspect ratio without stretching the scenery.
      mesh.scale.setScalar(Math.max(1, camera.aspect / 2.25));
      renderer.render(scene, camera);
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    let visible = true;
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    intersection.observe(host);
    const pointer = { x: 0, y: 0 };
    const container = host.parentElement!;
    function move(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;
      const bounds = container.getBoundingClientRect();
      pointer.x = (event.clientX - bounds.left) / bounds.width - 0.5;
      pointer.y = (event.clientY - bounds.top) / bounds.height - 0.5;
    }
    function leave() { pointer.x = 0; pointer.y = 0; }
    container.addEventListener('pointermove', move);
    container.addEventListener('pointerleave', leave);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    function reduced() { setPaused(preference.matches); }
    preference.addEventListener('change', reduced);
    let frame = 0;
    let last = 0;
    function animate(time: number) {
      frame = requestAnimationFrame(animate);
      if (!visible || document.hidden || time - last < 33 || !texture) return;
      last = time;
      if (!pausedRef.current) {
        const drift = Math.sin(time * 0.00012) * 0.24;
        const dayFraming = Math.sin(selectedRef.current * 0.65) * 0.8;
        camera.position.x += (pointer.x * 1.8 + drift + dayFraming - camera.position.x) * 0.045;
        camera.position.y += (-pointer.y * 0.7 - camera.position.y) * 0.045;
        camera.lookAt(0, 0, 1.4);
        renderer.render(scene, camera);
      }
    }
    resize();
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      container.removeEventListener('pointermove', move);
      container.removeEventListener('pointerleave', leave);
      preference.removeEventListener('change', reduced);
      geometry.dispose(); material.dispose(); texture?.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <>
    <div className={`scenic-stage${ready ? ' scenic-stage--ready' : ''}`} ref={hostRef} style={{ backgroundImage: `url("${coastalScene}")` }} aria-hidden="true" />
    <button type="button" className="scene-motion" onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Play scenery motion' : 'Pause scenery motion'} aria-pressed={!paused}>{paused ? <Play size={14} /> : <Pause size={14} />}<span>{paused ? 'Play scene' : 'Pause scene'}</span></button>
  </>;
}
