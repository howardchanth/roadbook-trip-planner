export type Currency = 'USD' | 'HKD';

export interface Traveler {
  id: string;
  name: string;
}

export interface FoodStop {
  label: string;
  suggestion: string;
  detail?: string;
  url?: string;
}

export interface TripDay {
  id: string;
  date: string;
  title: string;
  city: string;
  region: string;
  drive: string;
  plan: string[];
  stay: string;
  stayNote?: string;
  meals: FoodStop[];
  status?: 'tentative' | 'watch';
}

export interface FlightPlan {
  id: string;
  traveler: string;
  route: string;
  detail: string;
  status: string;
  kind: 'outbound' | 'return';
}

export interface RouteStop {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  dayIndex: number;
}

export interface TripProfile {
  id: string;
  title: string;
  subtitle: string;
  startDate: string;
  lastTripDate: string;
  returnArrivalDate: string;
  budget: { low: number; target: number; high: number; currency: Currency; note: string };
  days: TripDay[];
  flights: FlightPlan[];
  route: RouteStop[];
  alerts: Array<{ title: string; body: string; url: string; sourceLabel: string; checkedOn: string }>;
  sheetUrl?: string;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  amountCents: number;
  currency: Currency;
  payerId: string;
  beneficiaryIds: string[];
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface HistoryEntry {
  id: string;
  requestId?: string;
  at: string;
  actor: string;
  action: 'created' | 'edited' | 'deleted' | 'initialized' | 'added' | 'removed';
  entity?: 'expense' | 'itinerary-day' | 'trip' | 'member';
  entityId?: string;
  before?: Expense | TripDay;
  after?: Expense | TripDay;
}

export interface TripSnapshot {
  trip: TripProfile;
  members: Traveler[];
  expenses: Expense[];
  history: HistoryEntry[];
}

export interface TripSource {
  trip: TripProfile;
  members: Traveler[];
}
