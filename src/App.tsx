import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, CircleHelp, Compass, LayoutDashboard, Map, RotateCcw, WalletCards } from 'lucide-react';
import { Itinerary } from './components/Itinerary';
import { MoneyPool, type StorageMode } from './components/MoneyPool';
import { Overview } from './components/Overview';
import {
  applyLocalMutation,
  getEndpointConfigured,
  getInviteToken,
  inviteLink,
  loadLocalLedger,
  loadLocalMembers,
  loadTripSource,
  mutateLive,
  readLiveSnapshot,
  resetLocalLedger,
  saveLocalLedger,
  saveLocalMembers,
  saveLocalTrip,
  type LocalLedger,
  type Mutation,
} from './lib/storage';
import type { Expense, TripDay, TripSource, Traveler } from './types';

type Page = 'overview' | 'itinerary' | 'money';
type Snapshot = Awaited<ReturnType<typeof readLiveSnapshot>>;

function requestId(): string {
  return window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export default function App() {
  const [page, setPage] = useState<Page>('overview');
  const [source, setSource] = useState<TripSource | null>(null);
  const [privateFixture, setPrivateFixture] = useState(false);
  const [ledger, setLedger] = useState<LocalLedger>({ expenses: [], history: [] });
  const [remote, setRemote] = useState<Snapshot | null>(null);
  const [mode, setMode] = useState<StorageMode>('local');
  const [modeMessage, setModeMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [invitePresent, setInvitePresent] = useState(false);
  const [canInitialize, setCanInitialize] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [focusedDayId, setFocusedDayId] = useState('');
  const [expenseFormRequest, setExpenseFormRequest] = useState(0);
  const pendingLiveWrites = useRef(0);
  const snapshotRevision = useRef(0);

  useEffect(() => {
    let mounted = true;
    const token = getInviteToken();
    setInvitePresent(Boolean(token));

    async function initialize() {
      const loaded = await loadTripSource();
      if (!mounted) return;
      setPrivateFixture(loaded.isPrivate);
      const localMembers = loadLocalMembers(loaded.source.trip.id, loaded.source.members);
      const localSource = { ...loaded.source, members: localMembers };
      setSource(localSource);
      const localLedger = loadLocalLedger(loaded.source.trip.id, localMembers, loaded.source.expenses ?? []);
      setLedger(localLedger);

      if (getEndpointConfigured() && token) {
        try {
          const snapshot = await readLiveSnapshot();
          if (!mounted) return;
          if (snapshot.trip?.id && snapshot.members?.length) {
            setRemote(snapshot);
            setMode('live');
            setModeMessage('');
          } else if (loaded.isPrivate) {
            setCanInitialize(true);
            setMode('local');
            setModeMessage('The shared Sheet is reachable but has no trip plan yet. Add this local plan once to initialize the app-managed tabs.');
          } else {
            setMode('error');
            setModeMessage('This invite has no trip data yet. Open the local trip copy and initialize it before sharing the link.');
          }
        } catch (error) {
          if (!mounted) return;
          setMode('error');
          setModeMessage(error instanceof Error ? error.message : 'Could not read the shared spreadsheet.');
        }
      }
      setLoading(false);
    }

    void initialize();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (mode !== 'live') return;
    let mounted = true;
    let inFlight = false;

    async function refreshSharedTrip() {
      if (!mounted || inFlight || pendingLiveWrites.current > 0 || document.visibilityState !== 'visible') return;
      inFlight = true;
      const revision = snapshotRevision.current;
      try {
        const snapshot = await readLiveSnapshot();
        if (mounted && pendingLiveWrites.current === 0 && snapshotRevision.current === revision && snapshot.ok && snapshot.trip?.id && snapshot.members?.length) {
          setRemote(snapshot);
        }
      } catch {
        // Keep the latest loaded snapshot visible during a temporary connection interruption.
      } finally {
        inFlight = false;
      }
    }

    const intervalId = window.setInterval(() => { void refreshSharedTrip(); }, 30_000);
    const handleVisibility = () => { if (document.visibilityState === 'visible') void refreshSharedTrip(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [mode]);

  const trip = remote?.trip?.id ? remote.trip : source?.trip;
  const members = remote?.members?.length ? remote.members : source?.members ?? [];
  const expenses = remote?.expenses ?? ledger.expenses;
  const history = remote?.history ?? ledger.history;

  useEffect(() => {
    if (trip) document.title = `${trip.title} — Roadbook`;
  }, [trip]);

  useEffect(() => {
    if (source && mode !== 'live') saveLocalMembers(source.trip.id, source.members);
  }, [mode, source]);

  async function copyInviteLink(): Promise<void> {
    const link = inviteLink();
    if (!link) throw new Error('Open the site with the private invite link first.');
    await navigator.clipboard.writeText(link);
  }

  async function saveLiveMutation(mutation: Mutation): Promise<Snapshot> {
    snapshotRevision.current += 1;
    pendingLiveWrites.current += 1;
    try {
      const next = await mutateLive(mutation);
      setRemote(next);
      return next;
    } finally {
      pendingLiveWrites.current -= 1;
    }
  }

  async function persistExpense(expense: Expense, editing: boolean): Promise<void> {
    if (!source || mode === 'error') throw new Error(modeMessage || 'The shared connection is not ready.');
    const actor = editing ? expense.updatedBy ?? expense.createdBy : expense.createdBy;
    const mutation: Mutation = editing
      ? { action: 'update', expense, actor, requestId: requestId() }
      : { action: 'create', expense, actor, requestId: requestId() };
    if (mode === 'live') {
      await saveLiveMutation(mutation);
    } else {
      const nextLedger = applyLocalMutation(ledger, mutation);
      saveLocalLedger(source.trip.id, nextLedger);
      setLedger(nextLedger);
    }
  }

  async function persistDay(day: TripDay, actor: string): Promise<void> {
    if (!source || mode === 'error') throw new Error(modeMessage || 'The shared connection is not ready.');
    if (mode === 'live') {
      await saveLiveMutation({ action: 'updateDay', day, actor, requestId: requestId() });
      return;
    }
    const nextTrip = { ...source.trip, days: source.trip.days.map((current) => current.id === day.id ? day : current) };
    saveLocalTrip(nextTrip);
    setSource((current) => current ? { ...current, trip: nextTrip } : current);
  }

  async function removeExpense(expense: Expense, actor: string): Promise<void> {
    if (!source || mode === 'error') throw new Error(modeMessage || 'The shared connection is not ready.');
    const mutation: Mutation = { action: 'delete', expenseId: expense.id, actor, requestId: requestId() };
    if (mode === 'live') {
      await saveLiveMutation(mutation);
    } else {
      const nextLedger = applyLocalMutation(ledger, mutation);
      saveLocalLedger(source.trip.id, nextLedger);
      setLedger(nextLedger);
    }
  }

  async function addMember(member: Traveler, actor: string): Promise<void> {
    if (!source || mode === 'error') throw new Error(modeMessage || 'The shared connection is not ready.');
    if (mode === 'live') {
      await saveLiveMutation({ action: 'addMember', member, actor, requestId: requestId() });
      return;
    }
    setSource((current) => current ? { ...current, members: [...current.members, member] } : current);
  }

  async function initializeSheet(): Promise<void> {
    if (!source) return;
    setInitializing(true);
    setModeMessage('Setting up the app-managed tabs…');
    try {
      await saveLiveMutation({ action: 'initialize', source, actor: members[0]?.name ?? 'Trip owner', requestId: requestId() });
      setCanInitialize(false);
      setMode('live');
      setModeMessage('');
    } catch (error) {
      setModeMessage(error instanceof Error ? error.message : 'Could not initialize the spreadsheet.');
      setMode('error');
    } finally {
      setInitializing(false);
    }
  }

  function resetLedger(): void {
    if (!source) return;
    const fresh = resetLocalLedger(source.trip.id, members, source.expenses ?? []);
    setLedger(fresh);
  }

  function navigate(next: Page): void {
    setPage(next);
    setExpenseFormRequest(0);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  if (loading || !trip || !source) {
    return <div className="app-loading"><span className="loading-mark"><Compass size={21} /></span><strong>Unfolding the roadbook…</strong><span>Loading the local trip plan</span></div>;
  }

  const navItems: Array<{ id: Page; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'itinerary', label: 'Itinerary', icon: Map },
    { id: 'money', label: 'Money pool', icon: WalletCards },
  ];

  const storageStatus = mode === 'live' ? 'Shared' : mode === 'error' ? 'Check link' : 'Local preview';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#trip-content">Skip to trip</a>
      <header className="topbar">
        <button className="brand-lockup" onClick={() => navigate('overview')} aria-label="Roadbook overview"><Compass size={23} strokeWidth={1.5} /><strong>ROADBOOK</strong></button>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(({ id, label }) => <button className={`nav-item${page === id ? ' nav-item--active' : ''}`} key={id} onClick={() => navigate(id)} aria-current={page === id ? 'page' : undefined}>{label}</button>)}
        </nav>
        <div className="topbar__right">
          <span className={`storage-pill storage-pill--${mode}`}><i />{storageStatus}</span>
          <span className="group-count">{members.length} travelers</span>
          <div className="header-roster" aria-label={members.map((member) => member.name).join(', ')}>{members.slice(0, 3).map((member) => <span title={member.name} key={member.id}>{initials(member.name)}</span>)}</div>
          {trip.sheetUrl && <a className="source-link" href={trip.sheetUrl} target="_blank" rel="noreferrer" aria-label="Open source spreadsheet"><BookOpen size={18} /></a>}
        </div>
      </header>
      <main className="main-column" id="trip-content">
        {mode === 'local' && privateFixture && <div className="local-preview-banner"><span className="local-preview-banner__mark"><RotateCcw size={14} /></span><span><strong>Local preview.</strong> Private trip details and ledger edits stay in this browser until the shared Sheet is connected.</span>{canInitialize && <button onClick={() => void initializeSheet()} disabled={initializing}>{initializing ? 'Setting up…' : 'Initialize shared Sheet'}</button>}</div>}
        {mode === 'error' && <div className="local-preview-banner local-preview-banner--error"><span className="local-preview-banner__mark"><CircleHelp size={14} /></span><span><strong>Shared link needs attention.</strong> {modeMessage} Local sample data is still visible; edits are paused.</span></div>}

        {page === 'overview' && <Overview trip={trip} members={members} expenses={expenses} onItinerary={(dayId) => { setFocusedDayId(dayId ?? ''); navigate('itinerary'); }} onMoney={() => navigate('money')} onAddExpense={() => { navigate('money'); setExpenseFormRequest((value) => value + 1); }} />}
        {page === 'itinerary' && <Itinerary trip={trip} members={members} initialDayId={focusedDayId} mode={mode} error={modeMessage} onSaveDay={persistDay} />}
        {page === 'money' && <MoneyPool members={members} expenses={expenses} history={history} formRequest={expenseFormRequest} mode={mode} error={modeMessage} onSave={persistExpense} onDelete={removeExpense} onAddMember={addMember} onReset={resetLedger} onCopyInvite={copyInviteLink} inviteAvailable={invitePresent} canInitialize={canInitialize} onInitialize={initializeSheet} initializing={initializing} />}

        <footer className="page-footer"><div><Compass size={16} /><span>Roadbook</span></div><span>{trip.title} · {trip.startDate.slice(0, 4)}</span>{trip.sheetUrl && <a href={trip.sheetUrl} target="_blank" rel="noreferrer">Open spreadsheet <ArrowUpRight size={14} /></a>}</footer>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'mobile-bottom-nav__item mobile-bottom-nav__item--active' : 'mobile-bottom-nav__item'} onClick={() => navigate(id)} aria-current={page === id ? 'page' : undefined}><Icon size={19} /><span>{label}</span></button>)}
      </nav>
    </div>
  );
}
