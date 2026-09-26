import { demoExpenses, demoMembers, demoTrip } from '../data/demoTrip';
import type { Expense, HistoryEntry, TripProfile, TripSnapshot, TripSource, Traveler } from '../types';

const TOKEN_KEY = 'roadbook:invite-token';
const storageKey = (tripId: string) => `roadbook:v1:${tripId}`;
const memberStorageKey = (tripId: string) => `roadbook:v1:${tripId}:members`;
const tripStorageKey = (tripId: string) => `roadbook:v1:${tripId}:trip`;
const remoteSnapshotStorageKey = 'roadbook:remote-snapshot:v1';
const LIVE_READ_TIMEOUT_MS = 20_000;
const LATE_CALLBACK_GRACE_MS = 60_000;

export interface LocalLedger {
  expenses: Expense[];
  history: HistoryEntry[];
}

export type Mutation =
  | { action: 'create'; expense: Expense; actor: string; requestId: string }
  | { action: 'update'; expense: Expense; actor: string; requestId: string }
  | { action: 'delete'; expenseId: string; actor: string; requestId: string }
  | { action: 'addMember'; member: Traveler; actor: string; requestId: string }
  | { action: 'removeMember'; memberId: string; actor: string; requestId: string }
  | { action: 'updateDay'; day: TripProfile['days'][number]; actor: string; requestId: string }
  | { action: 'initialize'; source: TripSource; actor: string; requestId: string };

interface LedgerResponse {
  ok: boolean;
  error?: string;
  trip?: TripProfile | null;
  members?: Traveler[];
  expenses?: Expense[];
  history?: HistoryEntry[];
}

const endpoint = import.meta.env.VITE_LEDGER_ENDPOINT?.trim() ?? '';
let cachedInviteToken: string | null | undefined;

/**
 * Keep the ledger stable when the same Sheet row is returned twice. Transaction
 * IDs are the authoritative identity; two legitimate costs can share the same
 * description, amount, date, and payer, so content-based filtering would hide
 * real entries.
 */
export function dedupeExpenses(expenses: Expense[]): Expense[] {
  const seenIds = new Set<string>();
  const unique: Expense[] = [];

  for (const expense of expenses) {
    if (!expense || typeof expense.id !== 'string' || !expense.id.trim() || seenIds.has(expense.id)) continue;
    seenIds.add(expense.id);
    unique.push(expense);
  }

  return unique;
}

function normalizeLedgerResponse(response: LedgerResponse): LedgerResponse {
  return Array.isArray(response.expenses) ? { ...response, expenses: dedupeExpenses(response.expenses) } : response;
}

function inviteHint(token: string): string {
  return `${token.length}:${token.slice(0, 10)}`;
}

function cacheRemoteSnapshot(token: string, snapshot: LedgerResponse): void {
  if (!snapshot.ok || !snapshot.trip?.id || !snapshot.members?.length) return;
  try {
    window.localStorage.setItem(remoteSnapshotStorageKey, JSON.stringify({ inviteHint: inviteHint(token), snapshot }));
  } catch {
    // A full or restricted browser storage should never block the live connection.
  }
}

function loadCachedRemoteSnapshot(token: string): LedgerResponse | null {
  try {
    const raw = window.localStorage.getItem(remoteSnapshotStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { inviteHint?: string; snapshot?: LedgerResponse };
    if (parsed.inviteHint !== inviteHint(token) || !parsed.snapshot?.ok || !parsed.snapshot.trip?.id || !parsed.snapshot.members?.length) return null;
    return normalizeLedgerResponse(parsed.snapshot);
  } catch {
    return null;
  }
}

export function getInviteToken(): string | null {
  if (cachedInviteToken !== undefined) return cachedInviteToken;
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const invite = fragment.get('invite');
  const stored = window.sessionStorage.getItem(TOKEN_KEY);
  cachedInviteToken = invite || stored || null;

  if (invite) {
    window.sessionStorage.setItem(TOKEN_KEY, invite);
  }
  return cachedInviteToken;
}

export function hasLiveConnection(): boolean {
  return Boolean(endpoint && getInviteToken());
}

export function inviteLink(): string | null {
  const token = getInviteToken();
  if (!token) return null;
  return `${window.location.origin}${window.location.pathname}#invite=${encodeURIComponent(token)}`;
}

function applyLocalTripOverride(trip: TripProfile): TripProfile {
  try {
    const raw = window.localStorage.getItem(tripStorageKey(trip.id));
    if (!raw) return trip;
    const saved = JSON.parse(raw) as TripProfile;
    if (saved.id === trip.id && Array.isArray(saved.days) && saved.days.every((day) => typeof day.id === 'string')) return saved;
  } catch {
    // Ignore malformed browser storage and use the supplied trip fixture.
  }
  return trip;
}

export function saveLocalTrip(trip: TripProfile): void {
  window.localStorage.setItem(tripStorageKey(trip.id), JSON.stringify(trip));
}

export async function loadTripSource(): Promise<{ source: TripSource; isPrivate: boolean }> {
  if (import.meta.env.DEV) {
    try {
      const response = await fetch('/__local/trip', { cache: 'no-store' });
      if (response.ok) {
        const source = await response.json() as TripSource;
        if (source.trip?.id && Array.isArray(source.members)) return { source: { ...source, trip: applyLocalTripOverride(source.trip) }, isPrivate: true };
      }
    } catch {
      // A missing local fixture intentionally falls back to the synthetic sample.
    }
  }
  return { source: { trip: applyLocalTripOverride(demoTrip), members: demoMembers }, isPrivate: false };
}

function freshSampleExpenses(members: Traveler[]): Expense[] {
  const roster = members.length ? members : demoMembers;
  return demoExpenses.map((expense, index) => {
    const payerIndex = index === 0 ? 0 : index === 1 || index === 3 ? Math.min(1, roster.length - 1) : roster.length - 1;
    const beneficiaries = index === 2 && roster.length > 1 ? [roster[0].id, roster[roster.length - 1].id] : roster.map((member) => member.id);
    const payer = roster[payerIndex];
    return { ...expense, payerId: payer.id, beneficiaryIds: beneficiaries, createdBy: payer.name };
  });
}

export function loadLocalLedger(tripId: string, members: Traveler[], seedExpenses: Expense[] = []): LocalLedger {
  const uniqueSeedExpenses = dedupeExpenses(seedExpenses);
  try {
    const raw = window.localStorage.getItem(storageKey(tripId));
    if (raw) {
      const parsed = JSON.parse(raw) as LocalLedger;
      if (Array.isArray(parsed.expenses) && Array.isArray(parsed.history)) {
        // Replace an untouched sample ledger when the private fixture gains
        // authoritative booked costs; preserve later local edits.
        if (uniqueSeedExpenses.length && parsed.history.length === 0) return { expenses: uniqueSeedExpenses, history: [] };
        // A browser can retain the starter sample after the private trip
        // fixture is loaded. Remove only those marked demo rows so the
        // authoritative booked costs are the first entries users see while
        // preserving every later user-created expense.
        const existingExpenses = uniqueSeedExpenses.length
          ? parsed.expenses.filter((expense) => !expense.id.startsWith('demo-'))
          : parsed.expenses;
        const uniqueExistingExpenses = dedupeExpenses(existingExpenses);
        const known = new Set(uniqueExistingExpenses.map((expense) => expense.id));
        const missing = uniqueSeedExpenses.filter((expense) => !known.has(expense.id));
        const expenses = dedupeExpenses([...missing, ...uniqueExistingExpenses]);
        return { ...parsed, expenses };
      }
    }
  } catch {
    // Ignore malformed browser storage and restore the marked sample ledger.
  }
  return { expenses: uniqueSeedExpenses.length ? uniqueSeedExpenses : dedupeExpenses(freshSampleExpenses(members)), history: [] };
}

export function saveLocalLedger(tripId: string, ledger: LocalLedger): void {
  window.localStorage.setItem(storageKey(tripId), JSON.stringify(ledger));
}

export function loadLocalMembers(tripId: string, fallback: Traveler[]): Traveler[] {
  try {
    const raw = window.localStorage.getItem(memberStorageKey(tripId));
    if (raw) {
      const parsed = JSON.parse(raw) as Traveler[];
      if (Array.isArray(parsed) && parsed.every((member) => typeof member.id === 'string' && typeof member.name === 'string')) return parsed;
    }
  } catch {
    // Restore the roster from the local trip fixture if browser storage is unreadable.
  }
  return fallback;
}

export function saveLocalMembers(tripId: string, members: Traveler[]): void {
  window.localStorage.setItem(memberStorageKey(tripId), JSON.stringify(members));
}

export function resetLocalLedger(tripId: string, members: Traveler[], seedExpenses: Expense[] = []): LocalLedger {
  const ledger = { expenses: seedExpenses.length ? dedupeExpenses(seedExpenses) : dedupeExpenses(freshSampleExpenses(members)), history: [] };
  saveLocalLedger(tripId, ledger);
  return ledger;
}

export async function readLiveSnapshot(): Promise<LedgerResponse> {
  const token = getInviteToken();
  if (!endpoint || !token) throw new Error('A private invite and Apps Script endpoint are required.');
  try {
    const snapshot = normalizeLedgerResponse(await requestJsonpWithRetry(endpoint, token));
    cacheRemoteSnapshot(token, snapshot);
    return snapshot;
  } catch (error) {
    const cached = loadCachedRemoteSnapshot(token);
    if (cached) return cached;
    throw error;
  }
}

export async function mutateLive(mutation: Mutation): Promise<LedgerResponse> {
  const token = getInviteToken();
  if (!endpoint || !token) throw new Error('A private invite and Apps Script endpoint are required.');
  await postForm(endpoint, token, mutation);

  const deadline = Date.now() + 12_000;
  let lastSnapshot: LedgerResponse | null = null;
  while (Date.now() < deadline) {
    lastSnapshot = normalizeLedgerResponse(await requestJsonp(endpoint, token));
    if (lastSnapshot.history?.some((entry) => entry.requestId === mutation.requestId)) {
      if (!lastSnapshot.ok) throw new Error(lastSnapshot.error || 'The spreadsheet rejected the change.');
      return lastSnapshot;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 650));
  }

  throw new Error(lastSnapshot?.error || 'The spreadsheet did not confirm this change. Check your connection, then refresh before trying again.');
}

function requestJsonp(url: string, token: string): Promise<LedgerResponse> {
  return new Promise((resolve, reject) => {
    const callbacks = (window as Window & { RoadbookCallbacks?: Record<string, (result: LedgerResponse) => void> }).RoadbookCallbacks ?? {};
    const callbackName = `cb_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    const callbackRoot = window as Window & { RoadbookCallbacks?: Record<string, (result: LedgerResponse) => void> };
    callbackRoot.RoadbookCallbacks = callbacks;

    const script = document.createElement('script');
    const cleanup = () => {
      delete callbacks[callbackName];
      script.remove();
      window.clearTimeout(timeoutId);
    };
    callbacks[callbackName] = (result) => {
      cleanup();
      resolve(result);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('Could not read the shared spreadsheet. Check the Apps Script deployment and private invite link.'));
    };
    const timeoutId = window.setTimeout(() => {
      // Apps Script can finish a request after the browser-side timeout, especially
      // on a cold start. Keep a harmless callback briefly so a late JSONP response
      // cannot throw "callback is not a function" and poison the page.
      script.remove();
      window.clearTimeout(timeoutId);
      callbacks[callbackName] = () => undefined;
      window.setTimeout(() => { delete callbacks[callbackName]; }, LATE_CALLBACK_GRACE_MS);
      reject(new Error('The spreadsheet read timed out. Try refreshing the page.'));
    }, LIVE_READ_TIMEOUT_MS);
    const query = new URLSearchParams({ action: 'read', token, callback: `RoadbookCallbacks.${callbackName}`, nonce: String(Date.now()) });
    script.src = `${url}${url.includes('?') ? '&' : '?'}${query.toString()}`;
    document.head.append(script);
  });
}

async function requestJsonpWithRetry(url: string, token: string): Promise<LedgerResponse> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestJsonp(url, token);
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 900));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not read the shared spreadsheet.');
}

async function postForm(url: string, token: string, mutation: Mutation): Promise<void> {
  const values = new URLSearchParams({
    token,
    action: mutation.action,
    requestId: mutation.requestId,
    actor: mutation.actor,
    payload: JSON.stringify(mutation),
  });
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: values,
    });
  } catch {
    throw new Error('Could not send the change to Google Apps Script. Check your connection and try again.');
  }
}

export function applyLocalMutation(ledger: LocalLedger, mutation: Mutation): LocalLedger {
  if (mutation.action === 'initialize' || mutation.action === 'addMember' || mutation.action === 'removeMember' || mutation.action === 'updateDay') return ledger;
  const next = structuredClone(ledger);
  const at = new Date().toISOString();

  if (mutation.action === 'create') {
    if (!next.expenses.some((expense) => expense.id === mutation.expense.id)) next.expenses.unshift(mutation.expense);
    next.history.unshift({ id: `history-${mutation.requestId}`, requestId: mutation.requestId, at, actor: mutation.actor, action: 'created', after: mutation.expense });
  } else if (mutation.action === 'update') {
    const index = next.expenses.findIndex((expense) => expense.id === mutation.expense.id);
    const before = next.expenses[index];
    if (index >= 0) next.expenses[index] = mutation.expense;
    next.history.unshift({ id: `history-${mutation.requestId}`, requestId: mutation.requestId, at, actor: mutation.actor, action: 'edited', before, after: mutation.expense });
  } else if (mutation.action === 'delete') {
    const before = next.expenses.find((expense) => expense.id === mutation.expenseId);
    next.expenses = next.expenses.filter((expense) => expense.id !== mutation.expenseId);
    next.history.unshift({ id: `history-${mutation.requestId}`, requestId: mutation.requestId, at, actor: mutation.actor, action: 'deleted', before });
  }
  next.history = next.history.slice(0, 150);
  return next;
}

export function toSnapshot(source: TripSource, ledger: LocalLedger): TripSnapshot {
  return { trip: source.trip, members: source.members, expenses: ledger.expenses, history: ledger.history };
}

export function getEndpointConfigured(): boolean {
  return Boolean(endpoint);
}
