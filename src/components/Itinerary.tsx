import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUpRight, BedDouble, CarFront, Check, CircleAlert, Clock3, ExternalLink, MapPin, Pencil, Plane, Plus, Trash2, Utensils, X } from 'lucide-react';
import { formatDate } from '../lib/dates';
import type { FoodStop, RentalPlan, TripDay, TripProfile, Traveler } from '../types';

interface ItineraryProps {
  trip: TripProfile;
  members: Traveler[];
  mode: 'local' | 'live' | 'error';
  error?: string;
  onSaveDay(day: TripDay, actor: string): Promise<void>;
}

interface DayDraft {
  title: string;
  drive: string;
  planText: string;
  stay: string;
  stayNote: string;
  meals: FoodStop[];
  actorId: string;
}

function makeDraft(day: TripDay, actorId: string): DayDraft {
  return {
    title: day.title,
    drive: day.drive,
    planText: day.plan.join('\n'),
    stay: day.stay,
    stayNote: day.stayNote ?? '',
    meals: day.meals.map((meal) => ({ ...meal })),
    actorId,
  };
}

function FoodLine({ label, suggestion, detail, url }: { label: string; suggestion: string; detail?: string; url?: string }) {
  return (
    <div className="meal-line">
      <span className="meal-line__label">{label}</span>
      <div><strong>{suggestion}</strong>{detail && <p>{detail}</p>}</div>
      {url && <a href={url} target="_blank" rel="noreferrer" aria-label={`Visit ${suggestion} website`}><ExternalLink size={15} /></a>}
    </div>
  );
}

function RentalDayNote({ rental, moment }: { rental: RentalPlan; moment: 'pickup' | 'dropoff' }) {
  const stop = moment === 'pickup' ? rental.pickup : rental.dropoff;
  return (
    <section className={`day-detail__rental day-detail__rental--${moment}`} aria-label={`Rental car ${moment}`}>
      <span className="day-detail__title"><CarFront size={15} /> Rental car · {moment === 'pickup' ? 'pickup' : 'return'}</span>
      <div className="day-detail__rental-main"><strong>{rental.provider} · {stop.time} · {stop.label}</strong><span>{rental.location} · {rental.address}</span></div>
      <p>{moment === 'pickup' ? 'From LAX, take the blue Economy Parking Shuttle (Shuttle E), then follow signs to the Off-Airport Rental Car Waiting Area on Level 1. Wait at the curb for the Priceless / NextCar shuttle.' : 'Return the car at the same NextCar office. Their shuttle drops passengers at the Economy Parking Garage curb for the Economy Shuttle back to the terminal.'}</p>
    </section>
  );
}

function DayDetail({ day, index, alert, rental, rentalMoment }: { day: TripDay; index: number; alert?: TripProfile['alerts'][number]; rental?: RentalPlan; rentalMoment?: 'pickup' | 'dropoff' }) {
  return (
    <div className="day-detail">
      <div className="day-detail__left">
        <div className="day-detail__section"><span className="day-detail__title"><MapPin size={15} /> The plan</span><ul>{day.plan.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul></div>
        <div className="day-detail__section day-detail__stay"><span className="day-detail__title"><BedDouble size={15} /> Where to stay</span><strong>{day.stay}</strong>{day.stayNote && <p>{day.stayNote}</p>}{day.stayUrl && <a href={day.stayUrl} target="_blank" rel="noreferrer">{day.stayStatus === 'unverified' ? 'Open Airbnb link' : 'Open Airbnb booking'} <ExternalLink size={13} /></a>}</div>
      </div>
      <div className="day-detail__meals">
        <span className="day-detail__title"><Utensils size={15} /> Meal ideas · not reservations</span>
        {day.meals.length ? day.meals.map((meal, mealIndex) => <FoodLine key={`${day.id}-${meal.label}-${mealIndex}`} {...meal} />) : <p className="day-detail__empty">No meal ideas added yet.</p>}
      </div>
      {rental && rentalMoment && <RentalDayNote rental={rental} moment={rentalMoment} />}
      {alert && (
        <div className="day-alert">
          <CircleAlert size={17} />
          <div><strong>{alert.title}</strong><p>{alert.body}</p><a href={alert.url} target="_blank" rel="noreferrer">Check the latest NPS update <ExternalLink size={13} /></a></div>
        </div>
      )}
      {index === 0 && <p className="day-disclaimer">Confirm flight arrival times before setting the first-day schedule.</p>}
    </div>
  );
}

function DayEditor({
  day,
  draft,
  members,
  saving,
  error,
  onChange,
  onCancel,
  onSubmit,
}: {
  day: TripDay;
  draft: DayDraft;
  members: Traveler[];
  saving: boolean;
  error: string;
  onChange(draft: DayDraft): void;
  onCancel(): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
}) {
  const setField = <K extends keyof DayDraft>(key: K, value: DayDraft[K]) => onChange({ ...draft, [key]: value });
  const updateMeal = (index: number, changes: Partial<FoodStop>) => setField('meals', draft.meals.map((meal, mealIndex) => mealIndex === index ? { ...meal, ...changes } : meal));

  return (
    <form className="itinerary-editor" onSubmit={onSubmit} aria-label={`Edit schedule for ${day.title}`}>
      <div className="itinerary-editor__head">
        <div><span className="itinerary-editor__eyebrow">EDITING THIS DAY</span><strong>{formatDate(day.date, 'short')} · {day.city}</strong></div>
        <span className="itinerary-editor__lock"><MapPin size={13} /> Date and route stay fixed</span>
      </div>
      <div className="itinerary-editor__grid">
        <label className="itinerary-editor__field"><span>Day title</span><input required maxLength={120} value={draft.title} onChange={(event) => setField('title', event.target.value)} placeholder="A day in Los Angeles" /></label>
        <label className="itinerary-editor__field"><span>Drive or travel note</span><input maxLength={180} value={draft.drive} onChange={(event) => setField('drive', event.target.value)} placeholder="Local transit, 30 minutes" /></label>
        <label className="itinerary-editor__field itinerary-editor__field--wide"><span>Plan <small>One item per line</small></span><textarea rows={4} maxLength={2400} value={draft.planText} onChange={(event) => setField('planText', event.target.value)} placeholder={'Morning activity\nAfternoon stop\nEvening together'} /></label>
        <label className="itinerary-editor__field"><span>Where to stay</span><input required maxLength={180} value={draft.stay} onChange={(event) => setField('stay', event.target.value)} placeholder="Hotel or neighborhood" /></label>
        <label className="itinerary-editor__field"><span>Lodging note</span><input maxLength={600} value={draft.stayNote} onChange={(event) => setField('stayNote', event.target.value)} placeholder="Confirmation or check-in detail" /></label>
      </div>

      <section className="itinerary-editor__meals" aria-labelledby={`meals-heading-${day.id}`}>
        <div className="itinerary-editor__section-head"><div><strong id={`meals-heading-${day.id}`}>Meal ideas</strong><span>Optional places to try. Links must start with https://. Up to 8 ideas.</span></div><button type="button" className="itinerary-editor__add" disabled={draft.meals.length >= 8} onClick={() => setField('meals', [...draft.meals, { label: 'Meal', suggestion: '', detail: '', url: '' }])}><Plus size={14} /> Add meal</button></div>
        {draft.meals.map((meal, index) => (
          <div className="itinerary-meal-editor" key={`${index}`}>
            <label className="itinerary-editor__field"><span>Meal</span><input maxLength={32} value={meal.label} onChange={(event) => updateMeal(index, { label: event.target.value })} placeholder="Lunch" /></label>
            <label className="itinerary-editor__field"><span>Place or idea</span><input maxLength={140} value={meal.suggestion} onChange={(event) => updateMeal(index, { suggestion: event.target.value })} placeholder="Grand Central Market" /></label>
            <label className="itinerary-editor__field"><span>Note</span><input maxLength={300} value={meal.detail ?? ''} onChange={(event) => updateMeal(index, { detail: event.target.value })} placeholder="Good for a quick lunch" /></label>
            <label className="itinerary-editor__field"><span>Website link</span><input type="url" maxLength={300} value={meal.url ?? ''} onChange={(event) => updateMeal(index, { url: event.target.value })} placeholder="https://…" /></label>
            <button type="button" className="itinerary-meal-editor__remove" onClick={() => setField('meals', draft.meals.filter((_, mealIndex) => mealIndex !== index))} aria-label={`Remove ${meal.label || 'meal'} idea`} title="Remove meal"><Trash2 size={16} /></button>
          </div>
        ))}
        {!draft.meals.length && <p className="itinerary-editor__empty">No meal ideas yet. Add one if you have a place in mind.</p>}
      </section>

      <div className="itinerary-editor__footer">
        <label className="itinerary-editor__field itinerary-editor__actor"><span>Edited by</span><select value={draft.actorId} onChange={(event) => setField('actorId', event.target.value)}>{members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
        <div className="itinerary-editor__actions"><button type="button" className="itinerary-editor__cancel" onClick={onCancel} disabled={saving}><X size={15} /> Cancel</button><button type="submit" className="itinerary-editor__save" disabled={saving}><Check size={15} /> {saving ? 'Saving…' : 'Save day'}</button></div>
      </div>
      {error && <p className="itinerary-editor__error" role="alert">{error}</p>}
    </form>
  );
}

export function Itinerary({ trip, members, mode, error: connectionError, onSaveDay }: ItineraryProps) {
  const [openDay, setOpenDay] = useState(trip.days[0]?.id ?? '');
  const [editingDayId, setEditingDayId] = useState('');
  const [draft, setDraft] = useState<DayDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedDayId, setSavedDayId] = useState('');
  const longDriveDays = trip.days.filter((day) => /long|multi-hour/i.test(day.drive)).map((day) => day.title);
  const driveNote = longDriveDays.length
    ? `${longDriveDays.join(' and ')} have the longest drives. Confirm times and keep those days flexible.`
    : 'Confirm driving times with the group and leave room for breaks along the way.';

  function beginEditing(day: TripDay): void {
    setOpenDay(day.id);
    setEditingDayId(day.id);
    setDraft(makeDraft(day, members[0]?.id ?? ''));
    setSaveError('');
    setSavedDayId('');
  }

  function cancelEditing(): void {
    setEditingDayId('');
    setDraft(null);
    setSaveError('');
  }

  async function saveDay(event: FormEvent<HTMLFormElement>, day: TripDay): Promise<void> {
    event.preventDefault();
    if (!draft || saving) return;
    const actor = members.find((member) => member.id === draft.actorId)?.name ?? members[0]?.name ?? 'Traveler';
    const planItems = draft.planText.split('\n').map((item) => item.trim()).filter(Boolean);
    if (planItems.length > 20 || planItems.some((item) => item.length > 240)) {
      setSaveError('Keep the plan to 20 lines, with no more than 240 characters per line.');
      return;
    }
    const meals = draft.meals
      .map((meal) => ({ label: meal.label.trim(), suggestion: meal.suggestion.trim(), detail: meal.detail?.trim() || undefined, url: meal.url?.trim() || undefined }))
      .filter((meal) => meal.label && meal.suggestion);
    if (meals.some((meal) => meal.url && !/^https:\/\//i.test(meal.url))) {
      setSaveError('Meal links need to start with https://.');
      return;
    }
    const updated: TripDay = {
      ...day,
      title: draft.title.trim(),
      drive: draft.drive.trim(),
      plan: planItems,
      stay: draft.stay.trim(),
      stayNote: draft.stayNote.trim() || undefined,
      meals,
    };
    setSaving(true);
    setSaveError('');
    try {
      await onSaveDay(updated, actor);
      setEditingDayId('');
      setDraft(null);
      setSavedDayId(day.id);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Could not save this day. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const saveLocation = mode === 'live' ? 'Changes save to the shared trip Sheet for everyone.' : mode === 'error' ? 'The shared trip link needs attention before anyone can save changes.' : 'Changes are saved in this browser until the shared Sheet is connected.';

  return (
    <div className="page page--itinerary">
      <header className="page-title-row page-title-row--itinerary">
        <div>
          <h1>The days between here and there.</h1>
          <p>Confirmed stays and links that still need a check are marked clearly; the driving and meal ideas remain easy to adjust.</p>
        </div>
        <div className="itinerary-summary"><strong>{trip.days.length} dates</strong><span>{formatDate(trip.startDate)} — {formatDate(trip.lastTripDate)}</span></div>
      </header>

      <div className="itinerary-notes">
        <div className="itinerary-notes__icon"><Clock3 size={18} /></div>
        <div><strong>Keep the long-drive days light.</strong><span>{driveNote} {saveLocation}</span></div>
        <button aria-label="Open trip overview" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ArrowUpRight size={17} /></button>
      </div>

      <nav className="itinerary-day-nav" aria-label="Jump to a trip day">
        <span className="itinerary-day-nav__label">Jump to a date</span>
        <div className="itinerary-day-nav__scroller">
          {trip.days.map((day) => (
            <button type="button" className={openDay === day.id ? 'itinerary-day-nav__item itinerary-day-nav__item--active' : 'itinerary-day-nav__item'} key={day.id} onClick={() => { setOpenDay(day.id); setEditingDayId(''); setDraft(null); document.getElementById(`day-${day.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
              <span>{formatDate(day.date, 'short')}</span>
              <strong>{day.city.split('→')[0].trim()}</strong>
              {day.stayUrl && <i aria-label={day.stayStatus === 'unverified' ? 'Needs confirmation' : day.stayStatus === 'selected' ? 'Selected stay' : 'Booked stay'} title={day.stayStatus === 'unverified' ? 'Needs confirmation' : day.stayStatus === 'selected' ? 'Selected stay' : 'Booked stay'} />}
            </button>
          ))}
        </div>
      </nav>

      <div className="itinerary-list">
        {trip.days.map((day, index) => {
          const expanded = openDay === day.id;
          const editing = editingDayId === day.id && draft;
          const statusText = day.stayStatus === 'unverified' ? 'Needs confirmation' : day.stayStatus === 'selected' ? 'Selected stay' : day.stayUrl ? 'Booked stay' : day.status === 'watch' ? 'Needs a check' : 'Plan in progress';
          const alert = day.status === 'watch' ? trip.alerts[0] : undefined;
          return (
            <article id={`day-${day.id}`} className={`itinerary-day${expanded ? ' itinerary-day--open' : ''}${day.status === 'watch' ? ' itinerary-day--watch' : ''}`} key={day.id}>
              <div className="itinerary-day__date">
                <span>{formatDate(day.date, 'weekday')}</span>
                <strong>{formatDate(day.date, 'short')}</strong>
                <i aria-hidden="true" />
              </div>
              <div className="itinerary-day__main">
                <button className="itinerary-day__toggle" onClick={() => { setOpenDay(expanded ? '' : day.id); if (expanded && editing) cancelEditing(); }} aria-expanded={expanded} aria-controls={`detail-${day.id}`}>
                  <span className="itinerary-day__title"><span>{day.title}</span><span className={`day-status${day.status === 'watch' ? ' day-status--watch' : ''}`}>{day.status === 'watch' && <CircleAlert size={13} />}{statusText}</span></span>
                  <span className="itinerary-day__meta"><span><MapPin size={14} />{day.city}</span><span><Clock3 size={14} />{day.drive}</span></span>
                  <span className="itinerary-day__chevron">{expanded ? <ArrowUpRight size={18} /> : <ArrowDown size={18} />}</span>
                </button>
                {expanded && <div id={`detail-${day.id}`}>
                  {editing && draft ? (
                    <DayEditor day={day} draft={draft} members={members} saving={saving} error={saveError} onChange={setDraft} onCancel={cancelEditing} onSubmit={(event) => { void saveDay(event, day); }} />
                  ) : <>
                    <div className="itinerary-detail-actions">
                      {savedDayId === day.id && <span className="itinerary-saved" role="status"><Check size={14} /> Saved</span>}
                      <button type="button" className="itinerary-edit-button" onClick={() => beginEditing(day)} disabled={mode === 'error'}><Pencil size={14} /> Edit day</button>
                    </div>
                    {mode === 'error' && <p className="itinerary-edit-hint">{connectionError || 'Reconnect the shared trip before editing.'}</p>}
                    <DayDetail day={day} index={index} alert={alert} rental={trip.rental} rentalMoment={day.date === trip.rental?.pickup.date ? 'pickup' : day.date === trip.rental?.dropoff.date ? 'dropoff' : undefined} />
                  </>}
                </div>}
              </div>
            </article>
          );
        })}
      </div>

      <section className="flight-details" aria-labelledby="flight-details-heading">
        <div className="flight-details__heading"><div><h2 id="flight-details-heading">Flights converge. Confirmations are still open.</h2><p>Only the screenshot candidates and arrival outline are in hand.</p></div><Plane size={20} /></div>
        {trip.flights.map((flight) => (
          <article className="flight-detail-row" key={flight.id}>
            <span className="flight-detail-row__kind">{flight.kind === 'outbound' ? 'Outbound' : 'Return'}</span>
            <div><strong>{flight.route}</strong><span>{flight.traveler}</span></div>
            <p>{flight.detail}</p>
            <span className="flight-detail-row__state">{flight.status}</span>
          </article>
        ))}
        <div className="flight-arrival-note"><span className="flight-arrival-note__line" /><p><strong>Group arrival plan:</strong> Coordinate arrival times together and update these details once flights are confirmed.</p></div>
      </section>
    </div>
  );
}
