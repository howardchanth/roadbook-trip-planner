import { useState } from 'react';
import { ArrowRight, ArrowUpRight, BedDouble, CalendarDays, CarFront, Check, CircleAlert, ExternalLink, MapPin, Plane, Plus, Users, WalletCards } from 'lucide-react';
import { formatDate, getTripProgress } from '../lib/dates';
import { formatAmount, formatMoney, totalForCurrency } from '../lib/money';
import { destinationStyle } from '../lib/scenery';
import type { Expense, RentalPlan, Traveler, TripProfile } from '../types';
import { ScenicJourney } from './ScenicJourney';

interface OverviewProps {
  trip: TripProfile;
  members: Traveler[];
  expenses: Expense[];
  onItinerary: (dayId?: string) => void;
  onMoney: () => void;
  onAddExpense: () => void;
}

function RentalCard({ rental }: { rental: RentalPlan }) {
  return <section className="rental-card" aria-labelledby="rental-heading">
    <div className="section-heading-row"><div><h2 id="rental-heading">Your rental car</h2><p>{rental.provider} · {rental.vehicle}</p></div><span className="booking-status"><Check size={14} /> Confirmed</span></div>
    <div className="rental-card__stops">
      <div><CarFront size={20} /><span>Pick up</span><strong>{formatDate(rental.pickup.date)} · {rental.pickup.time}</strong><p>{rental.pickup.label}</p></div>
      <div><CarFront size={20} /><span>Return</span><strong>{formatDate(rental.dropoff.date)} · {rental.dropoff.time}</strong><p>{rental.dropoff.label}</p></div>
    </div>
    <div className="rental-card__details"><div><strong>{rental.location}</strong><p>{rental.address}</p></div><div><strong>Confirmation {rental.confirmation}</strong><p>Driver {rental.driver}</p></div></div>
    <div className="rental-card__features">{rental.features.map((feature) => <span key={feature}><Check size={14} />{feature}</span>)}</div>
    <details className="rental-card__instructions"><summary>Pickup &amp; shuttle instructions</summary><p>{rental.pickupInstructions}</p><p><strong>Shuttle hours:</strong> {rental.shuttleHours}</p></details>
  </section>;
}

export function Overview({ trip, members, expenses, onItinerary, onMoney, onAddExpense }: OverviewProps) {
  const progress = getTripProgress(trip);
  const [selectedIndex, setSelectedIndex] = useState(progress.activeDayIndex);
  const selectedDay = trip.days[selectedIndex] ?? trip.days[0];
  const year = trip.startDate.slice(0, 4);
  const dateRange = `${formatDate(trip.startDate)}–${formatDate(trip.lastTripDate)}, ${year}`;
  const countdown = progress.phase === 'upcoming' ? `${progress.daysUntilStart} ${progress.daysUntilStart === 1 ? 'day' : 'days'}` : progress.phase === 'returned' ? 'Trip complete' : progress.currentPlace;
  const usdTotal = totalForCurrency(expenses, 'USD');
  const hkdTotal = totalForCurrency(expenses, 'HKD');
  const routeNames = trip.route.map((stop) => stop.name);

  return <div className="page page--overview">
    <section className="journey-hero" aria-label="Explore the trip by date">
      <ScenicJourney selectedIndex={selectedIndex} />
      <div className="hero-shade" aria-hidden="true" />
      <div className="hero-content">
        <div className="hero-title"><h1>{trip.title}</h1><p><CalendarDays size={17} /><span>{dateRange}</span><span className="hero-date-separator">·</span><span>{trip.days.length} days on the road</span></p></div>
        {selectedDay && <div className="hero-day-panel">
          <div className="hero-day-panel__date"><span>{formatDate(selectedDay.date, 'weekday')}, {formatDate(selectedDay.date)}</span><span>Day {selectedIndex + 1}</span></div>
          <h2>{selectedDay.city.split('→').at(-1)?.trim()}</h2>
          <p>{selectedDay.title}</p>
          <button className="button button--amber" onClick={() => onItinerary(selectedDay.id)}>View day <ArrowUpRight size={16} /></button>
        </div>}
      </div>
      <div className="hero-bottom">
        <div className="day-filmstrip" role="group" aria-label="Choose a trip date">
          {trip.days.map((day, index) => <button key={day.id} className={`film-day${selectedIndex === index ? ' film-day--selected' : ''}`} aria-pressed={selectedIndex === index} onClick={() => setSelectedIndex(index)}>
            <span className="film-day__image" style={destinationStyle(day)} aria-hidden="true" />
            <span className="film-day__copy"><span>{formatDate(day.date, 'short')}</span><strong>{day.city.split('→').at(-1)?.trim()}</strong></span>
          </button>)}
        </div>
        <span className="scenery-caption">Illustrative scenery</span>
      </div>
    </section>

    <section className="trip-ribbon" aria-label="Trip progress and group">
      <div className="trip-ribbon__departure"><CalendarDays size={21} /><div><strong>{countdown}</strong><span>{progress.phase === 'upcoming' ? 'until the first meet-up' : progress.phase === 'returned' ? 'All itinerary days complete' : 'Current stop'}</span></div></div>
      <div className="trip-ribbon__progress"><div><strong>{progress.percent}% complete</strong><span>{progress.completedDays} of {progress.totalDays} days</span></div><div className="progress-track" role="progressbar" aria-label="Trip progress" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress.percent}%` }} /></div></div>
      <div className="trip-ribbon__group"><Users size={21} /><div><strong>{members.length} travelers</strong><span>{members.map((member) => member.name).join(', ')}</span></div></div>
    </section>

    <div className="overview-workspace">
      <section className="next-day" aria-labelledby="next-day-heading">
        <div className="section-heading-row"><h2 id="next-day-heading">{selectedIndex === progress.activeDayIndex ? 'Next up' : 'Your selected day'}</h2><button className="text-action" onClick={() => onItinerary(selectedDay?.id)}>Open day plan <ArrowRight size={16} /></button></div>
        {selectedDay && <div className="next-day__content"><div className="next-day__image" style={destinationStyle(selectedDay)} aria-hidden="true" /><div className="next-day__copy"><span className="day-date">{formatDate(selectedDay.date, 'weekday')}, {formatDate(selectedDay.date)}</span><h3>{selectedDay.title}</h3><p><MapPin size={15} />{selectedDay.city}</p><ul>{selectedDay.plan.slice(0, 2).map((item, index) => <li key={index}>{item}</li>)}</ul><span className="next-day__stay"><BedDouble size={15} />{selectedDay.stay}</span></div></div>}
      </section>
      <section className="expense-preview" aria-labelledby="expense-preview-heading">
        <div className="section-heading-row"><h2 id="expense-preview-heading">Shared expenses</h2><WalletCards size={22} /></div>
        <div className="expense-preview__total"><strong>{formatMoney(usdTotal, 'USD')}</strong><span>{expenses.length} {expenses.length === 1 ? 'transaction' : 'transactions'}{hkdTotal ? ` · ${formatMoney(hkdTotal, 'HKD')} separate` : ''}</span></div>
        <p>Who paid, who shared it, and what everyone owes.</p>
        <button className="button button--amber" onClick={onAddExpense}><Plus size={17} /> Add expense</button>
        <button className="text-action" onClick={onMoney}>View money pool <ArrowRight size={16} /></button>
      </section>
    </div>

    <div className="overview-details">
      <section className="route-summary" aria-labelledby="route-summary-heading"><div><h2 id="route-summary-heading">The route</h2><p>{routeNames.join(' → ')}</p></div><div className="route-stops">{trip.route.map((stop, index) => <button key={stop.id} onClick={() => onItinerary(trip.days[stop.dayIndex]?.id)}><span className={`route-stop-dot${index === 0 ? ' route-stop-dot--start' : ''}`} /><strong>{stop.name}</strong><span>{formatDate(trip.days[stop.dayIndex]?.date ?? trip.startDate)}</span></button>)}</div><div className="budget-note"><span>Working group budget</span><strong>{formatAmount(trip.budget.target, trip.budget.currency)}</strong><span>{formatAmount(trip.budget.low, trip.budget.currency)}–{formatAmount(trip.budget.high, trip.budget.currency)} estimated · {trip.budget.note}</span></div></section>
      {trip.alerts.map((alert) => <section className="travel-alert" key={alert.title}><CircleAlert size={21} /><div><div className="travel-alert__heading"><h2>{alert.title}</h2><span>Checked {formatDate(alert.checkedOn)}</span></div><p>{alert.body}</p><div className="alert-links"><a href={alert.url} target="_blank" rel="noreferrer">{alert.sourceLabel}<ExternalLink size={14} /></a>{alert.links?.map((link) => <a href={link.url} key={link.url} target="_blank" rel="noreferrer">{link.label}<ExternalLink size={14} /></a>)}</div></div></section>)}
      {trip.rental && <RentalCard rental={trip.rental} />}
      <section className="travel-participants" aria-labelledby="flight-heading"><div className="section-heading-row"><h2 id="flight-heading">Flights &amp; arrivals</h2><button className="text-action" onClick={() => onItinerary()}>Trip details <ArrowRight size={16} /></button></div><div className="flight-list">{trip.flights.map((flight) => <article className="flight-row" key={flight.id}><Plane size={21} /><div className="flight-row__route"><span>{flight.traveler}</span><strong>{flight.route}</strong><p>{flight.detail}</p></div><span className="flight-status">{flight.status}</span></article>)}</div></section>
    </div>
  </div>;
}
