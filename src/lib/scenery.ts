import type { CSSProperties } from 'react';
import type { TripDay } from '../types';

export const coastalScene = `${import.meta.env.BASE_URL}scenes/coastal-road.jpg`;
export const destinationAtlas = `${import.meta.env.BASE_URL}scenes/destinations.jpg`;

/** Illustrative destination imagery, never a photo of a booked property. */
export function destinationStyle(day: TripDay): CSSProperties {
  const place = `${day.city} ${day.region}`.toLowerCase();
  const index = /canyon|williams|tusayan/.test(place) ? 3
    : /joshua|twentynine/.test(place) ? 4
      : /vegas/.test(place) ? 2
        : /crestline|bernardino|big bear/.test(place) ? 1
          : /santa ana|orange county/.test(place) ? 5 : 0;
  return {
    backgroundImage: `url("${destinationAtlas}")`,
    backgroundSize: '300% 200%',
    backgroundPosition: `${(index % 3) * 50}% ${index >= 3 ? 100 : 0}%`,
  };
}
