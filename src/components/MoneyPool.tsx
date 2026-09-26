import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, ChevronDown, CircleHelp, FilePlus2, Plus, RotateCcw, Trash2, Users, WalletCards, X } from 'lucide-react';
import { balancesByCurrency, expenseNet, formatMoney, splitExpense, totalForCurrency } from '../lib/money';
import { formatDate } from '../lib/dates';
import type { Currency, Expense, HistoryEntry, Traveler } from '../types';

export type StorageMode = 'local' | 'live' | 'error';

interface MoneyPoolProps {
  members: Traveler[];
  expenses: Expense[];
  history: HistoryEntry[];
  mode: StorageMode;
  error: string;
  canInitialize: boolean;
  initializing: boolean;
  onInitialize: () => Promise<void>;
  onSave: (expense: Expense, editing: boolean) => Promise<void>;
  onDelete: (expense: Expense, actor: string) => Promise<void>;
  onAddMember: (member: Traveler, actor: string) => Promise<void>;
  onReset: () => void;
  onCopyInvite: () => Promise<void>;
  inviteAvailable: boolean;
}

function formatLedgerTime(value: string | undefined): string {
  const date = new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function makeId(prefix: string): string {
  return `${prefix}-${window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;
}

function centsFromField(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const [dollars, cents = ''] = value.trim().split('.');
  return Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
}

function ExpenseForm({
  members,
  expense,
  busy,
  actor,
  onActor,
  onSave,
  onClose,
}: {
  members: Traveler[];
  expense?: Expense;
  busy: boolean;
  actor: string;
  onActor: (value: string) => void;
  onSave: (expense: Expense) => Promise<void>;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense ? (expense.amountCents / 100).toFixed(2) : '');
  const [currency, setCurrency] = useState<Currency>(expense?.currency ?? 'USD');
  const [payerId, setPayerId] = useState(expense?.payerId ?? members[0]?.id ?? '');
  const [date, setDate] = useState(expense?.date ?? new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(expense?.category ?? 'Meals');
  const [allPeople, setAllPeople] = useState(!expense || expense.beneficiaryIds.length === members.length);
  const [selectedIds, setSelectedIds] = useState<string[]>(expense?.beneficiaryIds ?? members.map((member) => member.id));
  const [formError, setFormError] = useState('');
  const submittingRef = useRef(false);

  function toggleMember(memberId: string) {
    setSelectedIds((current) => current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]);
    setAllPeople(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submittingRef.current) return;
    setFormError('');
    const amountCents = centsFromField(amount);
    const beneficiaryIds = allPeople ? members.map((member) => member.id) : members.filter((member) => selectedIds.includes(member.id)).map((member) => member.id);
    if (!description.trim()) return setFormError('Add a short description so everyone can recognize this expense.');
    if (amountCents === null || amountCents <= 0) return setFormError('Enter an amount greater than zero with up to two decimal places.');
    if (!payerId) return setFormError('Choose who paid.');
    if (beneficiaryIds.length === 0) return setFormError('Choose at least one person this expense was for.');
    if (members.length < 1) return setFormError('Add a traveler before entering an expense.');

    const now = new Date().toISOString();
    const saved: Expense = {
      id: expense?.id ?? makeId('expense'),
      date,
      description: description.trim(),
      category,
      amountCents,
      currency,
      payerId,
      beneficiaryIds,
      createdAt: expense?.createdAt ?? now,
      createdBy: expense?.createdBy ?? actor,
      ...(expense ? { updatedAt: now, updatedBy: actor } : {}),
    };
    submittingRef.current = true;
    try {
      await onSave(saved);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'The change could not be saved.');
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <form className="expense-form" onSubmit={(event) => void submit(event)}>
      <div className="expense-form__header"><div><h3>{expense ? 'Edit this expense' : 'Add an expense'}</h3><p>Choose who paid and exactly who shared it.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close expense form"><X size={17} /></button></div>
      <div className="expense-form__grid">
        <label className="field field--wide"><span>Description</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Shared dinner" maxLength={120} autoFocus /></label>
        <label className="field"><span>Amount</span><div className="amount-input"><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" aria-label="Amount" /><select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} aria-label="Currency"><option value="USD">USD</option><option value="HKD">HKD</option></select></div></label>
        <label className="field"><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Meals</option><option>Lodging</option><option>Transport</option><option>Activities</option><option>Tickets</option><option>Other</option></select></label>
        <label className="field"><span>Paid by</span><select value={payerId} onChange={(event) => setPayerId(event.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      </div>
      <fieldset className="beneficiary-fieldset">
        <legend>Paid for</legend>
        <div className="beneficiary-options">
          <label className={`beneficiary-option${allPeople ? ' beneficiary-option--active' : ''}`}><input type="checkbox" checked={allPeople} onChange={(event) => { setAllPeople(event.target.checked); if (event.target.checked) setSelectedIds(members.map((member) => member.id)); }} /><span>Everyone</span><small>Split across {members.length}</small></label>
          {members.map((member) => (
            <label className={`beneficiary-option${!allPeople && selectedIds.includes(member.id) ? ' beneficiary-option--active' : ''}`} key={member.id}>
              <input type="checkbox" checked={allPeople || selectedIds.includes(member.id)} onChange={() => toggleMember(member.id)} disabled={allPeople} />
              <span>{member.name}</span><small>{allPeople ? 'included' : 'select'}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field field--actor"><span>Recording as <span className="self-reported">· self-reported</span></span><select value={actor} onChange={(event) => onActor(event.target.value)}>{members.map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}</select></label>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="expense-form__footer"><p><CircleHelp size={14} />Extra cents are assigned in traveler-list order and shown in the calculation.</p><div><button type="button" className="button button--quiet" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Saving…' : expense ? 'Save changes' : 'Add to ledger'}</button></div></div>
    </form>
  );
}

function ExpenseBreakdown({ expense, members, history }: { expense: Expense; members: Traveler[]; history: HistoryEntry[] }) {
  const splits = splitExpense(expense, members);
  const splitById = new Map(splits.map((line) => [line.traveler.id, line.shareCents]));
  const payer = members.find((member) => member.id === expense.payerId)?.name ?? 'Unknown traveler';
  const beneficiaryNames = members.filter((member) => expense.beneficiaryIds.includes(member.id)).map((member) => member.name);
  const remainder = expense.beneficiaryIds.length ? expense.amountCents % expense.beneficiaryIds.length : 0;
  const relatedHistory = history.filter((entry) => (!entry.entity || entry.entity === 'expense') && (entry.before?.id === expense.id || entry.after?.id === expense.id)).slice(0, 8);

  return (
    <div className="expense-breakdown">
      <div className="calculation-summary"><span className="calculation-summary__label">How the split works</span><strong>{formatMoney(expense.amountCents, expense.currency)} ÷ {beneficiaryNames.length} {beneficiaryNames.length === 1 ? 'person' : 'people'} = {formatMoney(Math.floor(expense.amountCents / Math.max(beneficiaryNames.length, 1)), expense.currency)} base share</strong><p>{payer} paid the full amount. The participants below are responsible for the listed shares.</p></div>
      <div className="calculation-table" role="table" aria-label={`Calculation for ${expense.description}`}>
        <div className="calculation-row calculation-row--head" role="row"><span role="columnheader">Traveler</span><span role="columnheader">Share</span><span role="columnheader">Paid</span><span role="columnheader">Net effect</span></div>
        {members.map((member) => {
          const share = splitById.get(member.id) ?? 0;
          const paid = member.id === expense.payerId ? expense.amountCents : 0;
          const net = expenseNet(expense, member.id, members);
          return <div className="calculation-row" role="row" key={member.id}><span role="cell">{member.name}{expense.beneficiaryIds.includes(member.id) ? '' : <small> · not included</small>}</span><span role="cell">{share ? formatMoney(share, expense.currency) : '—'}</span><span role="cell">{paid ? formatMoney(paid, expense.currency) : '—'}</span><span role="cell" className={net > 0 ? 'money-positive' : net < 0 ? 'money-negative' : ''}>{formatMoney(net, expense.currency, true)}</span></div>;
        })}
      </div>
      {remainder > 0 && <p className="rounding-note">{remainder}¢ remainder {remainder === 1 ? 'goes' : 'cents go'} to {members.filter((member) => expense.beneficiaryIds.includes(member.id)).slice(0, remainder).map((member) => member.name).join(', ')} in traveler-list order.</p>}
      <div className="beneficiary-note"><span>Paid for</span><strong>{beneficiaryNames.join(', ') || 'No travelers selected'}</strong></div>
      <div className="expense-history">
        <span className="expense-history__title">Change history</span>
        {relatedHistory.length ? relatedHistory.map((entry) => <div className="expense-history__line" key={entry.id}><span>{entry.action === 'created' ? 'Added' : entry.action === 'edited' ? 'Edited' : 'Removed'} by {entry.actor}</span><time>{formatLedgerTime(entry.at)}</time></div>) : <div className="expense-history__line"><span>Added by {expense.createdBy}</span><time>{formatLedgerTime(expense.createdAt)}</time></div>}
        {expense.updatedBy && !relatedHistory.some((entry) => entry.action === 'edited') && <div className="expense-history__line"><span>Last edited by {expense.updatedBy}</span><time>{formatLedgerTime(expense.updatedAt)}</time></div>}
      </div>
    </div>
  );
}

export function MoneyPool({ members, expenses, history, mode, error, canInitialize, initializing, onInitialize, onSave, onDelete, onAddMember, onReset, onCopyInvite, inviteAvailable }: MoneyPoolProps) {
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | Currency>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | undefined>();
  const [expandedId, setExpandedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [actor, setActor] = useState(members[0]?.name ?? '');
  const [toast, setToast] = useState('');
  const saveInFlightRef = useRef(false);

  const orderedExpenses = useMemo(() => [...expenses].sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`)), [expenses]);
  const filteredExpenses = orderedExpenses.filter((expense) => currencyFilter === 'ALL' || expense.currency === currencyFilter);
  const usdBalances = balancesByCurrency(expenses, members, 'USD');
  const hkdBalances = balancesByCurrency(expenses, members, 'HKD');
  const usdTotal = totalForCurrency(expenses, 'USD');
  const hkdTotal = totalForCurrency(expenses, 'HKD');

  async function saveExpense(expense: Expense) {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setBusy(true);
    try {
      await onSave(expense, Boolean(editing));
      setToast(editing ? 'Expense updated.' : 'Expense added.');
      setEditing(undefined);
      setShowForm(false);
      window.setTimeout(() => setToast(''), 3200);
    } finally {
      saveInFlightRef.current = false;
      setBusy(false);
    }
  }

  async function deleteExpense(expense: Expense) {
    if (!window.confirm(`Remove “${expense.description}” from the ledger? The change will be recorded in history.`)) return;
    setBusy(true);
    try {
      await onDelete(expense, actor);
      setExpandedId('');
      setToast('Expense removed and logged.');
      window.setTimeout(() => setToast(''), 3200);
    } catch (deleteError) {
      setToast(deleteError instanceof Error ? deleteError.message : 'Could not remove expense.');
    } finally {
      setBusy(false);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMemberError('');
    const name = memberName.trim();
    if (!name) return setMemberError('Enter a traveler name.');
    if (members.some((member) => member.name.toLowerCase() === name.toLowerCase())) return setMemberError('That name is already in the group.');
    const member = { id: makeId('traveler'), name };
    setBusy(true);
    try {
      await onAddMember(member, actor || name);
      setActor((current) => current || name);
      setMemberName('');
      setShowMemberForm(false);
      setToast(`${name} joined the ledger.`);
      window.setTimeout(() => setToast(''), 3200);
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : 'Could not add this traveler.');
    } finally {
      setBusy(false);
    }
  }

  const storageLabel = mode === 'live' ? 'Shared spreadsheet' : mode === 'error' ? 'Connection needs attention' : 'Local preview';

  return (
    <div className="page page--money">
      <header className="page-title-row page-title-row--money">
        <div><h1>Shared trip expenses</h1><p>Log who paid, who shared each cost, and what everyone owes.</p></div>
        <button className="button button--primary add-expense-top" onClick={() => { setEditing(undefined); setShowForm(true); }}><Plus size={17} /> Add expense</button>
      </header>

      <div className={`sync-banner sync-banner--${mode}`} role="status">
        <span className="sync-banner__light" />
        <div><strong>{storageLabel}</strong><span>{mode === 'live' ? 'Changes save to the shared Sheet. Open pages check for updates automatically.' : mode === 'error' ? error || 'The live connection did not load. Refresh after checking the invite and endpoint.' : 'Private trip entries stay in this browser and do not touch the shared Sheet until it is connected.'}</span></div>
        {mode === 'live' && inviteAvailable && <button className="sync-banner__action" onClick={() => void onCopyInvite()}>Copy invite link <ArrowUpRight size={14} /></button>}
        {mode === 'local' && canInitialize && <button className="sync-banner__action" onClick={() => void onInitialize()} disabled={initializing}>{initializing ? 'Setting up…' : 'Initialize shared Sheet'} <ArrowUpRight size={14} /></button>}
        {mode === 'local' && !canInitialize && <button className="sync-banner__action" onClick={() => { if (window.confirm('Reset the local entries? This clears only this browser’s local ledger.')) onReset(); }}>Reset local entries <RotateCcw size={14} /></button>}
      </div>
      {mode === 'error' && <p className="connection-error" role="alert">{error}</p>}
      {toast && <p className="ledger-toast" role="status">{toast}</p>}

      {showForm && <ExpenseForm members={members} expense={editing} busy={busy} actor={actor} onActor={setActor} onSave={saveExpense} onClose={() => { setShowForm(false); setEditing(undefined); }} />}

      <section className="balance-section" aria-labelledby="balance-heading">
        <div className="balance-section__head">
          <div><h2 id="balance-heading">Where everyone stands</h2><p>Positive means they should get money back. Negative means they owe.</p></div>
          <div className="currency-total-group"><span className="currency-total"><small>USD total</small><strong>{formatMoney(usdTotal, 'USD')}</strong></span><span className="currency-total"><small>HKD total</small><strong>{formatMoney(hkdTotal, 'HKD')}</strong></span></div>
        </div>
        <div className="balances-list">
          {members.map((member, index) => {
            const usd = usdBalances.get(member.id) ?? 0;
            const hkd = hkdBalances.get(member.id) ?? 0;
            return (
              <div className="balance-row" key={member.id}>
                <div className="traveler-mark" aria-hidden="true">{member.name.slice(0, 1).toUpperCase()}</div>
                <div className="balance-row__name"><strong>{member.name}</strong><span>{index === 0 ? 'Trip organizer' : 'Traveler'}</span></div>
                <div className={`balance-amount${usd > 0 ? ' money-positive' : usd < 0 ? ' money-negative' : ''}`}><small>USD</small><strong>{formatMoney(usd, 'USD', true)}</strong><span>{usd > 0 ? 'to collect' : usd < 0 ? 'owes' : 'settled'}</span></div>
                <div className={`balance-amount${hkd > 0 ? ' money-positive' : hkd < 0 ? ' money-negative' : ''}`}><small>HKD</small><strong>{formatMoney(hkd, 'HKD', true)}</strong><span>{hkd > 0 ? 'to collect' : hkd < 0 ? 'owes' : 'settled'}</span></div>
              </div>
            );
          })}
        </div>
        <div className="balance-rule"><span>Currency stays separate.</span><p>USD and HKD are balanced independently; there is no automatic exchange-rate conversion.</p></div>
      </section>

      <section className="ledger-section" aria-labelledby="ledger-heading">
        <div className="ledger-section__head">
          <div><h2 id="ledger-heading">Recent transactions</h2><p>Open “Show the math” on any entry to inspect its exact split.</p></div>
          <div className="ledger-tools">
            <label className="record-as"><span>Recording as</span><select value={actor} onChange={(event) => setActor(event.target.value)}>{members.map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}</select></label>
            <div className="filter-group" aria-label="Filter transactions by currency"><button className={currencyFilter === 'ALL' ? 'filter-button filter-button--active' : 'filter-button'} onClick={() => setCurrencyFilter('ALL')}>All</button><button className={currencyFilter === 'USD' ? 'filter-button filter-button--active' : 'filter-button'} onClick={() => setCurrencyFilter('USD')}>USD</button><button className={currencyFilter === 'HKD' ? 'filter-button filter-button--active' : 'filter-button'} onClick={() => setCurrencyFilter('HKD')}>HKD</button></div>
          </div>
        </div>
        <div className="transaction-list">
          {filteredExpenses.length === 0 ? <div className="empty-ledger"><WalletCards size={23} /><strong>No transactions yet</strong><span>Add the first trip cost and choose who shared it.</span></div> : filteredExpenses.map((expense) => {
            const payer = members.find((member) => member.id === expense.payerId)?.name ?? 'Traveler';
            const beneficiaryNames = members.filter((member) => expense.beneficiaryIds.includes(member.id)).map((member) => member.name);
            const expanded = expandedId === expense.id;
            return (
              <article className={`transaction${expanded ? ' transaction--open' : ''}`} key={expense.id}>
                <div className="transaction-main">
                  <div className="transaction-date"><span>{formatDate(expense.date, 'weekday')}</span><strong>{formatDate(expense.date, 'short')}</strong></div>
                  <div className="transaction-description"><strong>{expense.description}</strong><span>{expense.category} <i /> Paid by {payer}</span><small>For {beneficiaryNames.join(', ') || 'no one selected'}</small></div>
                  <strong className="transaction-amount">{formatMoney(expense.amountCents, expense.currency)}</strong>
                  <button className="calculation-toggle" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? '' : expense.id)}><span>{expanded ? 'Hide the math' : 'Show the math'}</span><ChevronDown size={16} /></button>
                  <div className="transaction-actions"><button className="icon-button" aria-label={`Edit ${expense.description}`} onClick={() => { setEditing(expense); setShowForm(true); }} disabled={busy}><FilePlus2 size={16} /></button><button className="icon-button icon-button--danger" aria-label={`Remove ${expense.description}`} onClick={() => void deleteExpense(expense)} disabled={busy}><Trash2 size={16} /></button></div>
                </div>
                {expanded && <ExpenseBreakdown expense={expense} members={members} history={history} />}
              </article>
            );
          })}
        </div>
      </section>

      <section className="group-section" aria-labelledby="group-heading">
        <div className="group-section__head"><div><h2 id="group-heading">The travel group</h2><p>Add another person any time. Everyone in the group can be the payer or a beneficiary.</p></div><button className="button button--quiet" onClick={() => { setShowMemberForm((current) => !current); setMemberError(''); }}><Users size={16} /> {showMemberForm ? 'Close' : 'Add traveler'} <Plus size={15} /></button></div>
        <div className="group-roster">{members.map((member) => <div className="group-roster__member" key={member.id}><span className="traveler-mark traveler-mark--small">{member.name.slice(0, 1).toUpperCase()}</span><strong>{member.name}</strong></div>)}</div>
        {showMemberForm && <form className="add-member-form" onSubmit={(event) => void addMember(event)}><label className="field"><span>Traveler name</span><input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Name" maxLength={48} autoFocus /></label><button className="button button--primary" type="submit" disabled={busy}><Plus size={15} /> Add to group</button></form>}
        {memberError && <p className="form-error" role="alert">{memberError}</p>}
        <p className="roster-note"><Check size={14} /> This is a link-shared ledger. The “Recording as” name is self-reported, not verified by sign-in.</p>
      </section>
    </div>
  );
}
