import type { TripProfile } from '../types';

export function dateAtNoon(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

export function formatDate(dateString: string, format: 'long' | 'short' | 'weekday' = 'long'): string {
  const options: Intl.DateTimeFormatOptions = format === 'long'
    ? { month: 'short', day: 'numeric' }
    : format === 'weekday'
      ? { weekday: 'short' }
      : { month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', options).format(dateAtNoon(dateString));
}

export function daysUntil(dateString: string, now = new Date()): number {
  const target = new Date(`${dateString}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export interface TripProgress {
  daysUntilStart: number;
  completedDays: number;
  totalDays: number;
  percent: number;
  currentPlace: string;
  phase: 'upcoming' | 'in-progress' | 'returned';
  activeDayIndex: number;
}

export function getTripProgress(trip: TripProfile, now = new Date()): TripProgress {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(`${trip.startDate}T00:00:00`);
  const lastDay = new Date(`${trip.lastTripDate}T00:00:00`);
  const arrivalDay = new Date(`${trip.returnArrivalDate}T00:00:00`);
  const totalDays = trip.days.length;

  if (today < start) {
    return {
      daysUntilStart: Math.max(0, daysUntil(trip.startDate, now)),
      completedDays: 0,
      totalDays,
      percent: 0,
      currentPlace: 'Not traveling yet',
      phase: 'upcoming',
      activeDayIndex: 0,
    };
  }

  if (today > arrivalDay) {
    return { daysUntilStart: 0, completedDays: totalDays, totalDays, percent: 100, currentPlace: 'Trip complete', phase: 'returned', activeDayIndex: totalDays - 1 };
  }

  const elapsed = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  const completedDays = today > lastDay ? totalDays : Math.min(totalDays - 1, Math.max(0, elapsed));
  const activeDayIndex = Math.min(totalDays - 1, Math.max(0, elapsed));
  return {
    daysUntilStart: 0,
    completedDays,
    totalDays,
    percent: Math.round((completedDays / totalDays) * 100),
    currentPlace: today > lastDay ? 'Returning home' : trip.days[activeDayIndex]?.city ?? 'On the road',
    phase: 'in-progress',
    activeDayIndex,
  };
}
