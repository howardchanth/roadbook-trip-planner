import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CalendarDays, MapPinned, Minus, Plus, Route as RouteIcon, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { formatDate } from '../lib/dates';
import type { RouteStop, TripProfile } from '../types';

interface RouteMapProps {
  trip: TripProfile;
  activeDayIndex: number;
}

interface ProjectedStop extends RouteStop {
  x: number;
  z: number;
  index: number;
}

interface PointerPosition {
  x: number;
  y: number;
}

function projectStops(stops: RouteStop[]): ProjectedStop[] {
  if (!stops.length) return [];
  const minLon = Math.min(...stops.map((stop) => stop.lon));
  const maxLon = Math.max(...stops.map((stop) => stop.lon));
  const minLat = Math.min(...stops.map((stop) => stop.lat));
  const maxLat = Math.max(...stops.map((stop) => stop.lat));
  const lonSpan = Math.max(maxLon - minLon, 1);
  const latSpan = Math.max(maxLat - minLat, 1);

  return stops.map((stop, index) => ({
    ...stop,
    index,
    x: (((stop.lon - minLon) / lonSpan) - 0.5) * 10.4,
    z: (0.5 - ((stop.lat - minLat) / latSpan)) * 6.2,
  }));
}

function uniqueStops(stops: ProjectedStop[]): ProjectedStop[] {
  return stops.filter((stop, index) => !stops.slice(0, index).some((earlier) => earlier.lat === stop.lat && earlier.lon === stop.lon));
}

function routeNames(stops: RouteStop[]): string {
  return stops.reduce<string[]>((names, stop) => {
    if (names.at(-1) !== stop.shortName) names.push(stop.shortName);
    return names;
  }, []).join(' → ');
}

function makeTopographicLoops(scene: THREE.Scene): THREE.Object3D[] {
  const loops: THREE.Object3D[] = [];
  const loopMaterial = new THREE.LineBasicMaterial({ color: 0x9abb83, transparent: true, opacity: 0.09 });

  for (let level = 0; level < 3; level += 1) {
    const points: THREE.Vector3[] = [];
    const radiusX = 2.3 + level * 1.85;
    const radiusZ = 1.1 + level * 0.8;
    for (let step = 0; step <= 56; step += 1) {
      const angle = (step / 56) * Math.PI * 2;
      const wobble = 1 + Math.sin(angle * 3 + level) * 0.08 + Math.cos(angle * 5 - level) * 0.04;
      points.push(new THREE.Vector3(Math.cos(angle) * radiusX * wobble - 2.2, 0.12 + level * 0.006, Math.sin(angle) * radiusZ * wobble + 0.8));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const loop = new THREE.Line(geometry, loopMaterial.clone());
    loop.rotation.y = level * 0.08;
    scene.add(loop);
    loops.push(loop);
  }

  return loops;
}

function addRidge(scene: THREE.Scene, points: THREE.Vector3[], color: number, opacity: number): THREE.Mesh {
  const shape = new THREE.Shape();
  const baseY = -0.08;
  shape.moveTo(points[0]?.x ?? -12, baseY);
  points.forEach((point) => shape.lineTo(point.x, point.y));
  const lastPoint = points.at(-1);
  shape.lineTo(lastPoint?.x ?? 12, baseY);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
  const ridge = new THREE.Mesh(geometry, material);
  ridge.position.z = points[0]?.z ?? -5.7;
  scene.add(ridge);
  return ridge;
}

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineLoop || object instanceof THREE.Points)) return;
    object.geometry.dispose();
    const material = object.material;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material.dispose();
  });
}

export function RouteMap({ trip, activeDayIndex }: RouteMapProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<PointerPosition>({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const autoRotateRef = useRef(true);
  const [zoom, setZoom] = useState(1);
  const [autoRotate, setAutoRotate] = useState(() => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [sceneState, setSceneState] = useState<'loading' | 'ready' | 'fallback'>('loading');

  const projectedStops = useMemo(() => projectStops(trip.route), [trip.route]);
  const visibleStops = useMemo(() => uniqueStops(projectedStops), [projectedStops]);
  const activeRouteIndex = useMemo(() => {
    const eligible = visibleStops.filter((stop) => stop.dayIndex <= activeDayIndex);
    return eligible.length ? eligible.length - 1 : 0;
  }, [activeDayIndex, visibleStops]);
  const [selectedIndex, setSelectedIndex] = useState(activeRouteIndex);
  const selectedStop = visibleStops[selectedIndex] ?? visibleStops[0];
  const routeCaption = routeNames(trip.route);

  useEffect(() => {
    setSelectedIndex(activeRouteIndex);
  }, [activeRouteIndex]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const host = mountRef.current;
    if (!host || visibleStops.length === 0) return undefined;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setSceneState('fallback');
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x13322d, 0.038);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 7.1, 13.6);
    camera.lookAt(0, 0, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x13322d, 1);
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', `Three-dimensional route through ${routeCaption || 'the trip stops'}`);
    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xbfd59f, 1.25));
    const keyLight = new THREE.DirectionalLight(0xdff19a, 2.4);
    keyLight.position.set(-4, 8, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x5eb6a0, 1.3);
    fillLight.position.set(8, 4, -7);
    scene.add(fillLight);

    const terrainGeometry = new THREE.PlaneGeometry(24, 16, 48, 32);
    terrainGeometry.rotateX(-Math.PI / 2);
    const terrainPositions = terrainGeometry.attributes.position;
    for (let index = 0; index < terrainPositions.count; index += 1) {
      const x = terrainPositions.getX(index);
      const z = terrainPositions.getZ(index);
      terrainPositions.setY(index, Math.sin(x * 0.65) * 0.08 + Math.cos(z * 0.75) * 0.07 + Math.sin((x + z) * 0.42) * 0.045);
    }
    terrainGeometry.computeVertexNormals();
    const terrain = new THREE.Mesh(terrainGeometry, new THREE.MeshStandardMaterial({ color: 0x1c453b, roughness: 0.94, metalness: 0.02 }));
    terrain.position.y = -0.16;
    scene.add(terrain);

    const grid = new THREE.GridHelper(22, 22, 0x5e8a72, 0x31584d);
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.1;
    });
    grid.position.y = -0.02;
    scene.add(grid);

    makeTopographicLoops(scene);
    addRidge(scene, [
      new THREE.Vector3(-12, 1.1, -5.7),
      new THREE.Vector3(-9, 2.1, -5.7),
      new THREE.Vector3(-6, 0.8, -5.7),
      new THREE.Vector3(-3, 2.6, -5.7),
      new THREE.Vector3(0, 0.9, -5.7),
      new THREE.Vector3(3, 2.2, -5.7),
      new THREE.Vector3(7, 0.75, -5.7),
      new THREE.Vector3(12, 1.8, -5.7),
    ], 0x122d2a, 0.95);
    addRidge(scene, [
      new THREE.Vector3(-12, 0.5, -4.4),
      new THREE.Vector3(-8, 1.15, -4.4),
      new THREE.Vector3(-5, 0.45, -4.4),
      new THREE.Vector3(-1, 1.55, -4.4),
      new THREE.Vector3(3, 0.55, -4.4),
      new THREE.Vector3(7, 1.25, -4.4),
      new THREE.Vector3(12, 0.6, -4.4),
    ], 0x1b4139, 0.8);

    const routePoints = visibleStops.map((stop) => new THREE.Vector3(stop.x, 0.25, stop.z));
    const routeCurve = new THREE.CatmullRomCurve3(routePoints, false, 'catmullrom', 0.35);
    const routeGlow = new THREE.Mesh(
      new THREE.TubeGeometry(routeCurve, Math.max(40, routePoints.length * 22), 0.13, 8, false),
      new THREE.MeshBasicMaterial({ color: 0xa8c879, transparent: true, opacity: 0.18 }),
    );
    scene.add(routeGlow);
    const routeSignal = new THREE.Mesh(
      new THREE.TubeGeometry(routeCurve, Math.max(40, routePoints.length * 22), 0.045, 8, false),
      new THREE.MeshStandardMaterial({ color: 0xe2f28a, emissive: 0x7a8632, emissiveIntensity: 0.55, roughness: 0.34 }),
    );
    scene.add(routeSignal);
    const routePulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xf4f8bd, transparent: true, opacity: 0.96 }),
    );
    scene.add(routePulse);

    const starPositions: number[] = [];
    for (let index = 0; index < 64; index += 1) {
      const angle = index * 1.71;
      starPositions.push(Math.sin(angle * 1.3) * 11, 0.55 + (index % 7) * 0.31, Math.cos(angle) * 6.4 - 0.2);
    }
    const stars = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3)),
      new THREE.PointsMaterial({ color: 0xc4dc9b, size: 0.045, transparent: true, opacity: 0.7, sizeAttenuation: true }),
    );
    scene.add(stars);

    visibleStops.forEach((stop, index) => {
      const marker = new THREE.Group();
      marker.position.set(stop.x, 0.28, stop.z);
      const isActive = index === activeRouteIndex;
      const markerColor = isActive ? 0xdff28b : 0x78b895;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 6), new THREE.MeshBasicMaterial({ color: markerColor, transparent: true, opacity: 0.7 }));
      stem.position.y = 0.22;
      marker.add(stem);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(isActive ? 0.16 : 0.105, 14, 10), new THREE.MeshStandardMaterial({ color: markerColor, emissive: markerColor, emissiveIntensity: isActive ? 0.65 : 0.25, roughness: 0.3 }));
      orb.position.y = 0.47;
      marker.add(orb);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(isActive ? 0.31 : 0.22, 0.018, 6, 28), new THREE.MeshBasicMaterial({ color: markerColor, transparent: true, opacity: isActive ? 0.9 : 0.46 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.035;
      marker.add(ring);
      scene.add(marker);
    });

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize);
    resizeObserver?.observe(host);
    window.addEventListener('resize', resize);

    const handlePointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointerRef.current = {
        x: ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2,
        y: ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2,
      };
    };
    const handlePointerLeave = () => { pointerRef.current = { x: 0, y: 0 }; };
    host.addEventListener('pointermove', handlePointerMove);
    host.addEventListener('pointerleave', handlePointerLeave);

    let frame = 0;
    const animate = (time: number) => {
      frame = window.requestAnimationFrame(animate);
      const pointer = pointerRef.current;
      const orbit = autoRotateRef.current ? Math.sin(time * 0.00016) * 0.56 : 0;
      camera.position.x += ((orbit + pointer.x * 0.75) - camera.position.x) * 0.025;
      camera.position.y += ((7.1 - pointer.y * 0.42) - camera.position.y) * 0.025;
      camera.position.z += ((13.6 / zoomRef.current) - camera.position.z) * 0.025;
      camera.lookAt(pointer.x * 0.22, 0.05, pointer.y * 0.16);
      const pulsePoint = routeCurve.getPointAt((time * 0.00006) % 1);
      routePulse.position.copy(pulsePoint);
      routePulse.position.y += 0.08;
      renderer.render(scene, camera);
    };
    frame = window.requestAnimationFrame(animate);
    setSceneState('ready');

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [routeCaption, visibleStops, activeRouteIndex]);

  const labelPosition = (stop: ProjectedStop): CSSProperties => {
    const routeOrder = visibleStops.length > 1 ? stop.index / (visibleStops.length - 1) : 0.5;
    const orderLeft = 14 + routeOrder * 72;
    const plottedLeft = 50 + stop.x * 3.7;
    const rowOffsets = [-8, 7, -4, 10, -7, 6, -3];
    return {
      left: `${Math.max(11, Math.min(89, plottedLeft * 0.58 + orderLeft * 0.42))}%`,
      top: `${Math.max(18, Math.min(72, 46 + stop.z * 4.8 + rowOffsets[stop.index % rowOffsets.length]))}%`,
    };
  };

  return (
    <section className="route-panel route-panel--cinematic" aria-labelledby="route-heading">
      <div className="route-panel__head route-panel__head--cinematic">
        <div>
          <div className="route-panel__eyebrow"><RouteIcon size={14} /> Route / 3D field</div>
          <h2 id="route-heading">The route, without the noise.</h2>
          <p>{routeCaption || 'Your stops will appear here.'} · one continuous signal through the roadbook.</p>
        </div>
        <div className="route-stage__tools" aria-label="Route visual controls">
          <span className="map-mode"><span className="status-light" /> {visibleStops.length} stops</span>
          <button type="button" className="route-control" onClick={() => setZoom((current) => Math.max(0.82, Number((current - 0.12).toFixed(2))))} aria-label="Zoom out"><Minus size={14} /></button>
          <span className="route-zoom" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" className="route-control" onClick={() => setZoom((current) => Math.min(1.3, Number((current + 0.12).toFixed(2))))} aria-label="Zoom in"><Plus size={14} /></button>
          <button type="button" className={`route-control route-control--motion${autoRotate ? ' route-control--on' : ''}`} onClick={() => setAutoRotate((current) => !current)} aria-pressed={autoRotate} aria-label={autoRotate ? 'Pause route motion' : 'Resume route motion'}><RotateCcw size={14} /></button>
        </div>
      </div>

      <div className={`route-stage${sceneState === 'fallback' ? ' route-stage--fallback' : ''}`}>
        <div className="route-stage__canvas" ref={mountRef} />
        <div className="route-stage__grain" aria-hidden="true" />
        <div className="route-stage__labels" aria-hidden="true">
          {visibleStops.map((stop, index) => index === selectedIndex ? (
            <span className="route-stage__label route-stage__label--active" style={labelPosition(stop)} key={stop.id}>
              <i />{stop.shortName}
            </span>
          ) : null)}
        </div>
        <div className="route-stage__readout">
          <span>Live marker</span>
          <strong>{selectedStop?.shortName ?? 'Trip start'}</strong>
          <small>{selectedStop?.dayIndex !== undefined && trip.days[selectedStop.dayIndex] ? `${formatDate(trip.days[selectedStop.dayIndex].date, 'short')} · ${trip.days[selectedStop.dayIndex].title}` : 'Route not started'}</small>
        </div>
        <div className="route-stage__timeline"><span>{formatDate(trip.startDate, 'short')}</span><i /><span>{formatDate(trip.lastTripDate, 'short')}</span></div>
        <div className="route-stage__legend"><span><i className="route-stage__legend-line" /> Route signal</span><span><i className="route-stage__legend-dot" /> Stop beacons</span></div>
        {sceneState === 'fallback' && <div className="route-stage__fallback-copy">This browser cannot render the 3D field. The route stops below are still available.</div>}
        {sceneState === 'loading' && <div className="route-stage__loading">Building the route field…</div>}
      </div>

      <div className="route-strip" role="list" aria-label="Route stops">
        {visibleStops.map((stop, index) => (
          <button className={`route-stop route-stop--button${index === selectedIndex ? ' route-stop--selected' : ''}`} type="button" key={stop.id} onClick={() => setSelectedIndex(index)}>
            <span className={`route-stop__pin${index === activeRouteIndex || index === selectedIndex ? ' route-stop__pin--active' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
            <span><strong>{stop.shortName}</strong><span>{trip.days[stop.dayIndex]?.date ? formatDate(trip.days[stop.dayIndex].date, 'short') : ''}</span></span>
          </button>
        ))}
      </div>
      <div className="route-panel__foot"><CalendarDays size={14} /><span>Dates follow the day-by-day plan. Choose a stop to inspect its marker, then open the daily plan for lodging and route notes.</span><MapPinned size={14} /></div>
    </section>
  );
}
