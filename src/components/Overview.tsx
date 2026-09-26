import { ArrowDownRight, ArrowUpRight, CalendarDays, Check, CircleAlert, CircleDollarSign, Compass, ExternalLink, MapPinned, Plane, Route, TimerReset } from 'lucide-react';
import { formatDate, getTripProgress } from '../lib/dates';
import { formatAmount } from '../lib/money';
import type { TripProfile } from '../types';
import { RouteMap } from './RouteMap';

interface OverviewProps {
  trip: TripProfile;
  memberCount: number;
  onItinerary: () => void;
  onMoney: () => void;
}

export function Overview({ trip, memberCount, onItinerary, onMoney }: OverviewProps) {
  const progress = getTripProgress(trip);
  const dateRange = `${formatDate(trip.startDate)} — ${formatDate(trip.lastTripDate)}, ${new Date(`${trip.startDate}T12:00:00`).getFullYear()}`;
  const firstStop = trip.days[0]?.city ?? trip.route[0]?.name ?? 'the first stop';
  const routeShape = trip.days.reduce<string[]>((regions, day) => {
    if (day.region && regions.at(-1) !== day.region) regions.push(day.region);
    return regions;
  }, []).join(' → ');
  const activeDay = trip.days[progress.activeDayIndex];
  const confirmedStayNames = Array.from(new Set(trip.days.filter((day) => day.stayUrl).map((day) => day.stay)));
  const confirmedNightCount = trip.days.filter((day) => day.stayUrl).length;
  const countdown = progress.phase === 'upcoming'
    ? progress.daysUntilStart === 0 ? 'Today' : `${progress.daysUntilStart} days`
    : progress.phase === 'returned' ? 'Complete' : `${progress.completedDays} of ${progress.totalDays} days`;

  return (
    <div className="page page--overview">
      <header className="page-title-row">
        <div>
          <h1>{trip.title}</h1>
          <p>{trip.subtitle}</p>
        </div>
        <div className="title-facts">
          <span><CalendarDays size={16} />{dateRange}</span>
          <span><Compass size={16} />{memberCount} travelers</span>
        </div>
      </header>

      <div className="overview-quick-actions" aria-label="Trip shortcuts">
        <button type="button" onClick={onItinerary}><CalendarDays size={16} /><span><strong>Plan by day</strong><small>Schedule, stays, meals</small></span><ArrowUpRight size={15} /></button>
        <button type="button" onClick={onMoney}><CircleDollarSign size={16} /><span><strong>Update the ledger</strong><small>Record a shared cost</small></span><ArrowUpRight size={15} /></button>
      </div>

      <div className="overview-grid">
        <RouteMap trip={trip} activeDayIndex={progress.activeDayIndex} />

        <aside className="journey-panel" aria-label="Trip progress">
          <div className="journey-panel__topline"><span className="live-dot" />{progress.phase === 'upcoming' ? 'Before departure' : progress.phase === 'returned' ? 'Trip complete' : 'On the road'}</div>
          <div className="journey-count">
            <strong>{countdown}</strong>
            <span>{progress.phase === 'upcoming' ? 'until the first meet-up' : 'of the itinerary complete'}</span>
          </div>
          <div className="progress-track" role="progressbar" aria-label="Trip itinerary progress" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ transform: `scaleX(${progress.percent / 100})` }} />
          </div>
          <div className="progress-caption"><span>{progress.percent}% complete · {progress.completedDays}/{progress.totalDays} days</span><span>{progress.totalDays - progress.completedDays} ahead</span></div>
          <div className="current-place">
            <span className="current-place__label">{progress.phase === 'upcoming' ? 'Trip status' : 'Current stop'}</span>
            <strong>{progress.phase === 'upcoming' ? 'Not traveling yet' : progress.currentPlace}</strong>
            <span>{progress.phase === 'upcoming' ? `First meet-up · ${firstStop} · ${formatDate(trip.startDate)}` : activeDay?.title}</span>
          </div>
          <div className="next-stop">
            <div className="next-stop__icon"><MapPinned size={17} /></div>
            <div><span>Next up</span><strong>{progress.phase === 'upcoming' ? `Meet in ${firstStop}` : progress.phase === 'returned' ? 'Trip wrapped' : activeDay?.title}</strong></div>
            <ArrowDownRight size={16} aria-hidden="true" />
          </div>
          <button className="text-action" onClick={onItinerary}>Open day-by-day plan <span aria-hidden="true">→</span></button>
        </aside>
      </div>

      <section className="plan-pulse" aria-label="Plan summary">
        <div className="plan-pulse__cell plan-pulse__cell--budget">
          <div className="plan-pulse__icon"><CircleDollarSign size={18} /></div>
          <div><span>Working group budget</span><strong>{formatAmount(trip.budget.target, trip.budget.currency)}</strong><small>{formatAmount(trip.budget.low, trip.budget.currency)}–{formatAmount(trip.budget.high, trip.budget.currency)} estimated · {trip.budget.note}</small></div>
        </div>
          <div className="plan-pulse__cell">
          <div className="plan-pulse__icon"><Route size={18} /></div>
          <div><span>Route shape</span><strong>{routeShape || 'Group route'}</strong><small>{trip.days.length} trip dates · {confirmedNightCount ? `${confirmedNightCount} booked nights · ${confirmedStayNames.length} stays confirmed` : 'lodging to confirm'}</small></div>
        </div>
        <button className="plan-pulse__cell plan-pulse__cell--button" onClick={onMoney}>
          <div className="plan-pulse__icon"><ArrowUpRight size={18} /></div>
          <div><span>Money pool</span><strong>See who paid what</strong><small>USD and HKD kept separate</small></div>
          <ArrowUpRight className="cell-arrow" size={17} />
        </button>
      </section>

      {trip.alerts[0] && (
        <section className="travel-alert" aria-labelledby="travel-alert-title">
          <div className="travel-alert__mark"><CircleAlert size={18} /></div>
          <div className="travel-alert__copy">
            <div className="travel-alert__heading"><h2 id="travel-alert-title">{trip.alerts[0].title}</h2><span>Checked {formatDate(trip.alerts[0].checkedOn)}</span></div>
            <p>{trip.alerts[0].body}</p>
            <a href={trip.alerts[0].url} target="_blank" rel="noreferrer">{trip.alerts[0].sourceLabel} <ExternalLink size={13} /></a>
          </div>
        </section>
      )}

      <section className="travel-participants" aria-labelledby="flight-heading">
        <div className="section-heading-row">
          <div><h2 id="flight-heading">Flights &amp; arrivals.</h2><p>Add confirmed times when the group has them.</p></div>
          <button className="text-action" onClick={onItinerary}>See trip details <span aria-hidden="true">→</span></button>
        </div>
        <div className="flight-list">
          {trip.flights.map((flight) => (
            <article className="flight-row" key={flight.id}>
              <div className="flight-row__icon"><Plane size={17} /></div>
              <div className="flight-row__route"><span>{flight.traveler}</span><strong>{flight.route}</strong><p>{flight.detail}</p></div>
              <span className={`flight-status${flight.status.toLowerCase().includes('candidate') || flight.status.toLowerCase().includes('needed') ? ' flight-status--pending' : ''}`}><span />{flight.status}</span>
            </article>
          ))}
        </div>
        <div className="booking-note"><TimerReset size={15} /><span>{confirmedStayNames.length} lodging bookings are linked in the day plan; flight details still show their confirmation state.</span><Check size={15} /></div>
      </section>
    </div>
  );
}
