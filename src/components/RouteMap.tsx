import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ArrowUp } from 'lucide-react';
import { formatDate } from '../lib/dates';
import type { RouteStop, TripProfile } from '../types';

interface RouteMapProps {
  trip: TripProfile;
  activeDayIndex: number;
}

const MAP_WIDTH = 19.2;
const MAP_DEPTH = 15.8;
const TILE_SIZE = 256;
const MAP_TILE_TEMPLATE = import.meta.env.VITE_MAP_TILE_TEMPLATE || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const tileImageCache = new Map<string, Promise<HTMLImageElement>>();

interface GeoBounds { minLon: number; maxLon: number; minLat: number; maxLat: number }

function mapBounds(stops: RouteStop[]): GeoBounds {
  const longitudes = stops.map((stop) => stop.lon);
  const latitudes = stops.map((stop) => stop.lat);
  const lonSpan = Math.max(Math.max(...longitudes) - Math.min(...longitudes), 0.7);
  const latSpan = Math.max(Math.max(...latitudes) - Math.min(...latitudes), 0.7);
  const lonPadding = lonSpan * 0.22;
  const latPadding = latSpan * 0.25;
  let minLon = Math.min(...longitudes) - lonPadding;
  let maxLon = Math.max(...longitudes) + lonPadding;
  let minLat = Math.min(...latitudes) - latPadding;
  let maxLat = Math.max(...latitudes) + latPadding;
  const widthSpan = (maxLon - minLon) / 360;
  const north = mercatorY(maxLat);
  const south = mercatorY(minLat);
  const heightSpan = south - north;
  const targetHeight = widthSpan * MAP_DEPTH / MAP_WIDTH;

  if (heightSpan < targetHeight) {
    const center = (north + south) / 2;
    const expandedNorth = center - targetHeight / 2;
    const expandedSouth = center + targetHeight / 2;
    minLat = THREE.MathUtils.radToDeg(Math.atan(Math.sinh(Math.PI * (1 - 2 * expandedSouth))));
    maxLat = THREE.MathUtils.radToDeg(Math.atan(Math.sinh(Math.PI * (1 - 2 * expandedNorth))));
  } else {
    const targetWidth = heightSpan * MAP_WIDTH / MAP_DEPTH;
    const center = (minLon + maxLon) / 2;
    const expandedDegrees = targetWidth * 360;
    minLon = center - expandedDegrees / 2;
    maxLon = center + expandedDegrees / 2;
  }

  return { minLon, maxLon, minLat, maxLat };
}

function mercatorY(latitude: number): number {
  const boundedLatitude = THREE.MathUtils.clamp(latitude, -85.05112878, 85.05112878);
  const radians = THREE.MathUtils.degToRad(boundedLatitude);
  return 0.5 - Math.log((1 + Math.sin(radians)) / (1 - Math.sin(radians))) / (4 * Math.PI);
}

function toWorld(stop: RouteStop, bounds: GeoBounds): { x: number; z: number } {
  const north = mercatorY(bounds.maxLat);
  const south = mercatorY(bounds.minLat);
  const northing = (south - mercatorY(stop.lat)) / (south - north);
  return {
    // The scene uses +Y as vertical and +Z as north; invert east/west so screen-right is east.
    x: (0.5 - (stop.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * MAP_WIDTH,
    z: (northing - 0.5) * MAP_DEPTH,
  };
}

function loadTileImage(zoom: number, x: number, y: number): Promise<HTMLImageElement> {
  const scale = 2 ** zoom;
  const safeX = ((x % scale) + scale) % scale;
  const safeY = THREE.MathUtils.clamp(y, 0, scale - 1);
  const key = `${zoom}/${safeX}/${safeY}`;
  const cached = tileImageCache.get(key);
  if (cached) return cached;

  const url = MAP_TILE_TEMPLATE.replace('{z}', String(zoom)).replace('{x}', String(safeX)).replace('{y}', String(safeY));
  const imagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Map tile failed to load at ${zoom}/${safeX}/${safeY}`));
    image.src = url;
  });
  tileImageCache.set(key, imagePromise);
  imagePromise.catch(() => tileImageCache.delete(key));
  return imagePromise;
}

async function createBasemapTexture(bounds: GeoBounds, width: number, height: number): Promise<THREE.CanvasTexture> {
  const longitudeSpan = (bounds.maxLon - bounds.minLon) / 360;
  const mercatorTop = mercatorY(bounds.maxLat);
  const mercatorBottom = mercatorY(bounds.minLat);
  const latitudeSpan = mercatorBottom - mercatorTop;
  const targetWidth = Math.max(width, 320) * Math.min(window.devicePixelRatio || 1, 1.5);
  const targetHeight = Math.max(height, 260) * Math.min(window.devicePixelRatio || 1, 1.5);
  const zoom = THREE.MathUtils.clamp(Math.ceil(Math.log2(Math.max(
    targetWidth / (longitudeSpan * TILE_SIZE),
    targetHeight / (latitudeSpan * TILE_SIZE),
  ))), 4, 11);
  const worldSize = 2 ** zoom;
  const minTileX = ((bounds.minLon + 180) / 360) * worldSize;
  const maxTileX = ((bounds.maxLon + 180) / 360) * worldSize;
  const northTileY = mercatorTop * worldSize;
  const southTileY = mercatorBottom * worldSize;
  const firstX = Math.floor(minTileX);
  const lastX = Math.max(Math.floor(minTileX), Math.ceil(maxTileX) - 1);
  const firstY = Math.floor(northTileY);
  const lastY = Math.max(Math.floor(northTileY), Math.ceil(southTileY) - 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil((maxTileX - minTileX) * TILE_SIZE));
  canvas.height = Math.max(1, Math.ceil((southTileY - northTileY) * TILE_SIZE));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A 2D canvas is required to compose map tiles.');

  context.fillStyle = '#e7e5dc';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const tiles = [];
  for (let y = firstY; y <= lastY; y += 1) {
    for (let x = firstX; x <= lastX; x += 1) tiles.push({ x, y, image: loadTileImage(zoom, x, y) });
  }
  const loadedTiles = await Promise.all(tiles.map(async (tile) => ({ ...tile, image: await tile.image })));
  loadedTiles.forEach(({ x, y, image }) => {
    context.drawImage(image, (x - minTileX) * TILE_SIZE, (y - northTileY) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function terrainHeight(x: number, z: number): number {
  const broadRelief = 0.018 * Math.sin(x * 0.34 + z * 0.12) + 0.014 * Math.cos(z * 0.48 - x * 0.11);
  const fineRelief = 0.006 * Math.sin(x * 1.05 + z * 0.42) * Math.cos(z * 0.72 - x * 0.23);
  return broadRelief + fineRelief;
}

function createTerrain(texture?: THREE.CanvasTexture): THREE.Mesh {
  const columns = 96;
  const rows = 62;
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const low = new THREE.Color('#d6d9c6');
  const mid = new THREE.Color('#e9e4d1');
  const high = new THREE.Color('#cbd5ba');

  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const x = (column / columns - 0.5) * MAP_WIDTH;
      const z = (row / rows - 0.5) * MAP_DEPTH;
      const y = terrainHeight(x, z);
      positions.push(x, y, z);
      uvs.push(1 - column / columns, row / rows);
      const color = y < 0 ? low.clone().lerp(mid, THREE.MathUtils.clamp((y + 0.3) / 0.3, 0, 1)) : mid.clone().lerp(high, THREE.MathUtils.clamp(y / 0.3, 0, 1));
      colors.push(color.r, color.g, color.b);
      if (column < columns && row < rows) {
        const here = row * (columns + 1) + column;
        const next = here + columns + 1;
        indices.push(here, next, here + 1, next, next + 1, here + 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ map: texture, vertexColors: !texture, roughness: 0.94, metalness: 0, side: THREE.DoubleSide });
  return new THREE.Mesh(geometry, material);
}

function createContours(): THREE.Group {
  const contours = new THREE.Group();
  const stepX = MAP_WIDTH / 56;
  const stepZ = MAP_DEPTH / 38;
  const levels = [-0.2, -0.08, 0.06, 0.19];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0]] as const;

  for (const level of levels) {
    const segments: number[] = [];
    for (let row = 0; row < MAP_DEPTH / stepZ; row += 1) {
      for (let column = 0; column < MAP_WIDTH / stepX; column += 1) {
        const x = -MAP_WIDTH / 2 + column * stepX;
        const z = -MAP_DEPTH / 2 + row * stepZ;
        const corners = [
          { x, z, value: terrainHeight(x, z) },
          { x: x + stepX, z, value: terrainHeight(x + stepX, z) },
          { x: x + stepX, z: z + stepZ, value: terrainHeight(x + stepX, z + stepZ) },
          { x, z: z + stepZ, value: terrainHeight(x, z + stepZ) },
        ];
        const crossings: THREE.Vector3[] = [];

        for (const [from, to] of edges) {
          const a = corners[from];
          const b = corners[to];
          if ((a.value < level) === (b.value < level)) continue;
          const amount = (level - a.value) / (b.value - a.value);
          const pointX = THREE.MathUtils.lerp(a.x, b.x, amount);
          const pointZ = THREE.MathUtils.lerp(a.z, b.z, amount);
          crossings.push(new THREE.Vector3(pointX, terrainHeight(pointX, pointZ) + 0.018, pointZ));
        }

        for (let index = 0; index + 1 < crossings.length; index += 2) {
          segments.push(...crossings[index].toArray(), ...crossings[index + 1].toArray());
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
    const material = new THREE.LineBasicMaterial({ color: '#a79d7d', transparent: true, opacity: 0.22 });
    contours.add(new THREE.LineSegments(geometry, material));
  }
  return contours;
}

function routeCurve(stops: RouteStop[], bounds: GeoBounds): THREE.CatmullRomCurve3 {
  const points = stops.map((stop) => {
    const world = toWorld(stop, bounds);
    return new THREE.Vector3(world.x, terrainHeight(world.x, world.z) + 0.2, world.z);
  });
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.18);
}

export function RouteMap({ trip, activeDayIndex }: RouteMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [mapTilesState, setMapTilesState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const stopLabels = useMemo(() => trip.route.filter((stop, index) => !trip.route.slice(0, index).some((earlier) => earlier.lat === stop.lat && earlier.lon === stop.lon)), [trip.route]);
  const routeCaption = useMemo(() => trip.route.reduce<string[]>((names, stop) => {
    if (names.at(-1) !== stop.shortName) names.push(stop.shortName);
    return names;
  }, []).join(' → '), [trip.route]);
  const mapDescription = useMemo(() => `Interactive 3D map showing the route through ${routeCaption || 'the trip stops'}. Drag to tilt and scroll to zoom.`, [routeCaption]);
  const bounds = useMemo(() => mapBounds(trip.route), [trip.route]);
  const curve = useMemo(() => routeCurve(trip.route, bounds), [trip.route, bounds]);
  const activeStop = trip.route.reduce((best, stop, index) => stop.dayIndex <= activeDayIndex && stop.dayIndex >= (trip.route[best]?.dayIndex ?? -1) ? index : best, 0);
  const activeLabel = stopLabels.findIndex((stop) => stop.lat === trip.route[activeStop]?.lat && stop.lon === trip.route[activeStop]?.lon);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    } catch {
      setWebglUnavailable(true);
      setMapTilesState('unavailable');
      return;
    }

    let disposed = false;
    let mapTexture: THREE.CanvasTexture | null = null;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e9e6d9');
    const camera = new THREE.OrthographicCamera(-MAP_WIDTH / 2, MAP_WIDTH / 2, MAP_DEPTH / 2, -MAP_DEPTH / 2, 0.1, 80);
    camera.up.set(0, 0, 1);
    camera.position.set(0, 24, 10);
    camera.lookAt(0, 0, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    const ambient = new THREE.HemisphereLight('#fffaf0', '#697860', 1.85);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight('#fff4d5', 2.9);
    keyLight.position.set(-8, 18, 9);
    scene.add(keyLight);

    const ground = createTerrain();
    const groundMaterial = ground.material as THREE.MeshStandardMaterial;
    const mapSlab = new THREE.Mesh(
      new THREE.BoxGeometry(MAP_WIDTH + 0.42, 0.34, MAP_DEPTH + 0.42),
      new THREE.MeshStandardMaterial({ color: '#71836a', roughness: 0.88, metalness: 0 }),
    );
    mapSlab.position.y = -0.48;
    scene.add(mapSlab);
    scene.add(ground);
    const reliefLines = createContours();
    reliefLines.visible = false;
    scene.add(reliefLines);

    setMapTilesState('loading');
    void createBasemapTexture(bounds, host.clientWidth, host.clientHeight).then((texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      mapTexture = texture;
      groundMaterial.map = texture;
      groundMaterial.vertexColors = false;
      groundMaterial.needsUpdate = true;
      reliefLines.visible = false;
      setMapTilesState('ready');
    }).catch(() => {
      if (disposed) return;
      reliefLines.visible = true;
      setMapTilesState('unavailable');
    });

    const routePoints = curve.getPoints(220);
    const routeGeometry = new THREE.BufferGeometry().setFromPoints(routePoints);
    const routeLine = new THREE.Line(routeGeometry, new THREE.LineBasicMaterial({ color: '#47644e', transparent: true, opacity: 0.8 }));
    scene.add(routeLine);
    const routeCasing = new THREE.TubeGeometry(curve, 220, 0.17, 8, false);
    const routeCasingMesh = new THREE.Mesh(routeCasing, new THREE.MeshBasicMaterial({ color: '#fffdf5', depthTest: false, depthWrite: false }));
    routeCasingMesh.renderOrder = 2;
    scene.add(routeCasingMesh);
    const routeRail = new THREE.TubeGeometry(curve, 220, 0.105, 8, false);
    const routeRailMesh = new THREE.Mesh(routeRail, new THREE.MeshBasicMaterial({ color: '#c45432', depthTest: false, depthWrite: false }));
    routeRailMesh.renderOrder = 3;
    scene.add(routeRailMesh);

    const traveledStops = trip.route.slice(0, activeStop + 1);
    if (traveledStops.length > 1) {
      const traveledCurve = routeCurve(traveledStops, bounds);
      const traveledRoute = new THREE.TubeGeometry(traveledCurve, 100, 0.12, 8, false);
      const traveledRouteMesh = new THREE.Mesh(traveledRoute, new THREE.MeshBasicMaterial({ color: '#d1a94d', depthTest: false, depthWrite: false }));
      traveledRouteMesh.renderOrder = 4;
      scene.add(traveledRouteMesh);
    }

    const markerGroup = new THREE.Group();
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), new THREE.MeshStandardMaterial({ color: '#deed87', roughness: 0.4, metalness: 0 }));
    const markerHalo = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.34, 36), new THREE.MeshBasicMaterial({ color: '#697e59', transparent: true, opacity: 0.48, side: THREE.DoubleSide }));
    markerHalo.rotation.x = -Math.PI / 2;
    markerHalo.position.y = -0.12;
    markerGroup.add(marker, markerHalo);
    scene.add(markerGroup);

    for (const stop of trip.route) {
      const location = toWorld(stop, bounds);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), new THREE.MeshBasicMaterial({ color: '#fbfcf9', depthTest: false, depthWrite: false }));
      dot.position.set(location.x, terrainHeight(location.x, location.z) + 0.13, location.z);
      dot.renderOrder = 5;
      scene.add(dot);
    }

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.minPolarAngle = 0.16;
    controls.maxPolarAngle = 0.78;
    controls.rotateSpeed = 0.35;
    controls.minZoom = 0.9;
    controls.maxZoom = 2.4;
    controls.zoomSpeed = 0.55;

    const resizeMap = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      const aspect = width / height;
      const viewHeight = Math.max(MAP_DEPTH * 1.22, (MAP_WIDTH / aspect) * 1.14);
      const viewWidth = viewHeight * aspect;
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
    };
    resizeMap();
    const resizeObserver = new ResizeObserver(resizeMap);
    resizeObserver.observe(host);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const activeWorld = toWorld(trip.route[activeStop], bounds);
    const actualMarker = new THREE.Vector3(activeWorld.x, terrainHeight(activeWorld.x, activeWorld.z) + 0.28, activeWorld.z);
    const projection = new THREE.Vector3();
    let animationId = 0;

    const animate = () => {
      animationId = window.requestAnimationFrame(animate);
      controls.update();
      const clockSeconds = performance.now() / 1000;
      markerGroup.position.set(activeWorld.x, actualMarker.y + (reduceMotion ? 0 : Math.sin(clockSeconds * 1.7) * 0.045), activeWorld.z);
      markerGroup.scale.setScalar(reduceMotion ? 1 : 0.96 + Math.sin(clockSeconds * 1.8) * 0.04);
      markerHalo.scale.setScalar(reduceMotion ? 1 : 1.04 + Math.sin(clockSeconds * 1.8) * 0.1);

      const placedLabels: Array<{ left: number; right: number; top: number; bottom: number }> = [];
      const labelOffsets = [[0, 0], [34, -19], [-34, -19], [0, 27], [46, 18], [-46, 18], [0, -34], [62, 0], [-62, 0]] as const;
      stopLabels.forEach((stop, index) => {
        const label = labelRefs.current[index];
        if (!label) return;
        const point = toWorld(stop, bounds);
        projection.set(point.x, terrainHeight(point.x, point.z) + 0.3, point.z).project(camera);
        const projectedX = (projection.x * 0.5 + 0.5) * host.clientWidth;
        const projectedY = (-projection.y * 0.5 + 0.5) * host.clientHeight;
        const width = label.offsetWidth;
        const height = label.offsetHeight;
        let left = projectedX - width / 2;
        let top = projectedY - height / 2;
        for (const [offsetX, offsetY] of labelOffsets) {
          const candidateLeft = projectedX + offsetX - width / 2;
          const candidateTop = projectedY + offsetY - height / 2;
          const inside = candidateLeft >= 6 && candidateLeft + width <= host.clientWidth - 6 && candidateTop >= 6 && candidateTop + height <= host.clientHeight - 6;
          const clear = placedLabels.every((placed) => candidateLeft + width + 3 <= placed.left || candidateLeft >= placed.right + 3 || candidateTop + height + 3 <= placed.top || candidateTop >= placed.bottom + 3);
          if (inside && clear) {
            left = candidateLeft;
            top = candidateTop;
            break;
          }
        }
        placedLabels.push({ left, right: left + width, top, bottom: top + height });
        const x = left + width / 2;
        const y = top + height / 2;
        const visible = projection.z < 1 && projection.z > -1 && x > 12 && x < host.clientWidth - 12 && y > 12 && y < host.clientHeight - 12;
        label.style.left = `${x}px`;
        label.style.top = `${y}px`;
        label.style.opacity = visible ? '1' : '0';
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      mapTexture?.dispose();
      renderer.dispose();
    };
  }, [activeStop, bounds, curve, stopLabels, trip.route]);

  return (
    <section className="route-panel" aria-labelledby="route-heading">
      <div className="route-panel__head">
        <div>
          <h2 id="route-heading">Trip route</h2>
          <p>{routeCaption}</p>
        </div>
        <span className="map-mode"><span className="status-light" /> Planned route</span>
      </div>
      <div className={`route-map${webglUnavailable ? ' route-map--fallback' : ''}`} ref={hostRef}>
        <canvas ref={canvasRef} aria-label={mapDescription} />
        {stopLabels.map((stop, index) => (
          <div className={`route-label${index === activeLabel ? ' route-label--active' : ''}`} key={stop.id} ref={(element) => { labelRefs.current[index] = element; }}>
            <span className="route-label__dot" />
            <span>{stop.shortName}</span>
          </div>
        ))}
        {webglUnavailable && <div className="map-fallback" role="status">3D is unavailable here. The complete stop list is below.</div>}
        {mapTilesState === 'loading' && <span className="map-tile-state" role="status">Loading map detail</span>}
        {mapTilesState === 'unavailable' && !webglUnavailable && <span className="map-tile-state map-tile-state--error" role="status">Map detail unavailable · route still shown</span>}
        <div className="map-north" aria-label="North is up"><span>N</span><ArrowUp size={11} strokeWidth={2.2} /></div>
        <div className="map-date-chip"><span>{formatDate(trip.days[0]?.date ?? trip.startDate)}</span><span>through</span><span>{formatDate(trip.lastTripDate)}</span></div>
        <a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      </div>
      <div className="route-strip" role="list" aria-label="Route stops">
        {trip.route.map((stop, index) => (
          <div className="route-stop" role="listitem" key={stop.id}>
            <span className={`route-stop__pin${index === activeStop ? ' route-stop__pin--active' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
            <div><strong>{stop.shortName}</strong><span>{trip.days[stop.dayIndex]?.date ? formatDate(trip.days[stop.dayIndex].date, 'short') : ''}</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}
