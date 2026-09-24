import type { Currency, Expense, Traveler } from '../types';

export interface SplitLine {
  traveler: Traveler;
  shareCents: number;
  netCents: number;
}

export function splitExpense(expense: Expense, members: Traveler[]): SplitLine[] {
  const beneficiaries = members.filter((member) => expense.beneficiaryIds.includes(member.id));
  if (beneficiaries.length === 0) return [];

  const baseShare = Math.floor(expense.amountCents / beneficiaries.length);
  const remainderCents = expense.amountCents - baseShare * beneficiaries.length;

  return beneficiaries.map((traveler, index) => {
    const shareCents = baseShare + (index < remainderCents ? 1 : 0);
    const paidCents = traveler.id === expense.payerId ? expense.amountCents : 0;
    return { traveler, shareCents, netCents: paidCents - shareCents };
  });
}

export function balancesByCurrency(expenses: Expense[], members: Traveler[], currency: Currency): Map<string, number> {
  const balances = new Map(members.map((member) => [member.id, 0]));
  for (const expense of expenses) {
    if (expense.currency !== currency) continue;
    const splits = splitExpense(expense, members);
    for (const line of splits) balances.set(line.traveler.id, (balances.get(line.traveler.id) ?? 0) + line.netCents);
    if (!expense.beneficiaryIds.includes(expense.payerId)) {
      balances.set(expense.payerId, (balances.get(expense.payerId) ?? 0) + expense.amountCents);
    }
  }
  return balances;
}

export function formatMoney(cents: number, currency: Currency, signed = false): string {
  const absolute = Math.abs(cents) / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absolute);
  if (!signed) return cents < 0 ? `−${formatted}` : formatted;
  if (cents > 0) return `+${formatted}`;
  if (cents < 0) return `−${formatted}`;
  return formatted;
}

export function formatAmount(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function totalForCurrency(expenses: Expense[], currency: Currency): number {
  return expenses.reduce((total, expense) => total + (expense.currency === currency ? expense.amountCents : 0), 0);
}

export function expenseNet(expense: Expense, memberId: string, members: Traveler[]): number {
  const line = splitExpense(expense, members).find((item) => item.traveler.id === memberId);
  if (line) return line.netCents;
  return expense.payerId === memberId ? expense.amountCents : 0;
}
