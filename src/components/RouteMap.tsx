import { CalendarDays, MapPinned, Route as RouteIcon } from 'lucide-react';
import { formatDate } from '../lib/dates';
import type { RouteStop, TripProfile } from '../types';

interface RouteMapProps {
  trip: TripProfile;
  activeDayIndex: number;
}

interface ProjectedStop extends RouteStop {
  x: number;
  y: number;
  index: number;
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
    x: 12 + ((stop.lon - minLon) / lonSpan) * 76,
    y: 49 - ((stop.lat - minLat) / latSpan) * 35,
  }));
}

function uniqueStops(stops: ProjectedStop[]): ProjectedStop[] {
  return stops.filter((stop, index) => !stops.slice(0, index).some((earlier) => earlier.lat === stop.lat && earlier.lon === stop.lon));
}

export function RouteMap({ trip, activeDayIndex }: RouteMapProps) {
  const projected = projectStops(trip.route);
  const visibleStops = uniqueStops(projected);
  const activeRouteIndex = trip.route.reduce((best, stop, index) => stop.dayIndex <= activeDayIndex && stop.dayIndex >= (trip.route[best]?.dayIndex ?? -1) ? index : best, 0);
  const activeStop = projected[activeRouteIndex] ?? projected[0];
  const routeCaption = trip.route.reduce<string[]>((names, stop) => {
    if (names.at(-1) !== stop.shortName) names.push(stop.shortName);
    return names;
  }, []).join(' → ');
  const path = projected.map((stop) => `${stop.x},${stop.y}`).join(' ');
  const traveledPath = projected.slice(0, activeRouteIndex + 1).map((stop) => `${stop.x},${stop.y}`).join(' ');

  return (
    <section className="route-panel" aria-labelledby="route-heading">
      <div className="route-panel__head">
        <div>
          <div className="route-panel__eyebrow"><RouteIcon size={14} /> Route at a glance</div>
          <h2 id="route-heading">A clear line through the trip.</h2>
          <p>{routeCaption || 'Your stops will appear here.'}</p>
        </div>
        <span className="map-mode"><span className="status-light" /> {visibleStops.length} stops</span>
      </div>

      <div className="route-map route-map--flat">
        <svg className="route-map__svg" viewBox="0 0 100 60" role="img" aria-label={`Trip route through ${routeCaption || 'the trip stops'}`}>
          <defs>
            <linearGradient id="route-wash" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f3f6eb" />
              <stop offset="1" stopColor="#e6eee0" />
            </linearGradient>
            <pattern id="route-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#d7e2d4" strokeWidth="0.35" />
            </pattern>
          </defs>
          <rect width="100" height="60" rx="3" fill="url(#route-wash)" />
          <rect width="100" height="60" rx="3" fill="url(#route-grid)" opacity=".72" />
          <path d="M4 52 C19 44 18 31 31 33 S48 49 59 36 S73 20 96 12" fill="none" stroke="#d0ddce" strokeWidth="5" strokeLinecap="round" opacity=".75" />
          <polyline points={path} fill="none" stroke="#2f5747" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity=".28" />
          {traveledPath && <polyline points={traveledPath} fill="none" stroke="#c18a3d" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />}
          <polyline points={path} fill="none" stroke="#284d40" strokeWidth=".75" strokeDasharray="1.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
          {visibleStops.map((stop) => {
            const active = stop.lat === activeStop?.lat && stop.lon === activeStop?.lon;
            const labelY = stop.y - (stop.index % 2 === 0 ? 4.3 : -4.8);
            return (
              <g key={stop.id} className={active ? 'route-map__point route-map__point--active' : 'route-map__point'}>
                {active && <circle cx={stop.x} cy={stop.y} r="5.2" fill="#dbe98a" opacity=".54" />}
                <circle cx={stop.x} cy={stop.y} r={active ? 2.5 : 1.8} fill={active ? '#284d40' : '#fbfcf7'} stroke="#284d40" strokeWidth=".8" />
                <text x={stop.x} y={labelY} textAnchor="middle">{stop.shortName}</text>
              </g>
            );
          })}
          <text x="5" y="56" className="route-map__caption">{formatDate(trip.startDate, 'short')}</text>
          <text x="95" y="56" className="route-map__caption" textAnchor="end">{formatDate(trip.lastTripDate, 'short')}</text>
        </svg>
        <div className="route-map__legend"><span><i className="route-map__legend-dot route-map__legend-dot--traveled" /> Covered</span><span><i className="route-map__legend-dot" /> Planned</span></div>
        <div className="route-map__current"><MapPinned size={14} /><span>Current marker</span><strong>{activeStop?.shortName ?? 'Trip start'}</strong></div>
      </div>

      <div className="route-strip" role="list" aria-label="Route stops">
        {trip.route.map((stop, index) => (
          <div className="route-stop" role="listitem" key={`${stop.id}-${index}`}>
            <span className={`route-stop__pin${index === activeRouteIndex ? ' route-stop__pin--active' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
            <div><strong>{stop.shortName}</strong><span>{trip.days[stop.dayIndex]?.date ? formatDate(trip.days[stop.dayIndex].date, 'short') : ''}</span></div>
          </div>
        ))}
      </div>
      <div className="route-panel__foot"><CalendarDays size={14} /><span>Dates follow the day-by-day plan. Open a day to edit the route notes and lodging.</span></div>
    </section>
  );
}
