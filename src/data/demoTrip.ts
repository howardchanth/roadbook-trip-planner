import type { Expense, Traveler, TripProfile } from '../types';

export const demoMembers: Traveler[] = [
  { id: 'alex', name: 'Alex Morgan' },
  { id: 'casey', name: 'Casey Lee' },
  { id: 'jordan', name: 'Jordan Kim' },
];

export const demoTrip: TripProfile = {
  id: 'sample-pacific-northwest',
  title: 'Pacific Northwest loop',
  subtitle: 'A sample roadbook · nine days on the road',
  startDate: '2027-10-14',
  lastTripDate: '2027-10-22',
  returnArrivalDate: '2027-10-23',
  budget: { low: 3200, target: 4200, high: 5200, currency: 'USD', note: 'Sample group estimate · flights excluded' },
  days: [
    { id: 'sample-1', date: '2027-10-14', title: 'Meet in Seattle', city: 'Seattle', region: 'Washington', drive: 'Airport transfer', plan: ['Meet at the hotel', 'Pick up the rental car'], stay: 'Sample hotel · not booked', meals: [{ label: 'Dinner', suggestion: 'Choose a nearby spot after arrival' }] },
    { id: 'sample-2', date: '2027-10-15', title: 'Seattle city day', city: 'Seattle', region: 'Washington', drive: 'Local transit', plan: ['Explore one neighborhood', 'Keep the afternoon flexible'], stay: 'Sample hotel · not booked', meals: [{ label: 'Lunch', suggestion: 'Market lunch near the day’s stops' }, { label: 'Dinner', suggestion: 'Neighborhood dinner' }] },
    { id: 'sample-3', date: '2027-10-16', title: 'Olympic Peninsula', city: 'Port Angeles', region: 'Washington', drive: 'Coastal road · timings to confirm', plan: ['Take the ferry west', 'Stop at viewpoints'], stay: 'Sample hotel · not booked', meals: [{ label: 'Lunch', suggestion: 'Seafood on the coast' }] },
    { id: 'sample-4', date: '2027-10-17', title: 'Mount Rainier', city: 'Ashford', region: 'Washington', drive: 'Long drive · confirm route', plan: ['Leave after breakfast', 'Evening at leisure'], stay: 'Sample hotel · not booked', meals: [{ label: 'Dinner', suggestion: 'Dinner near the lodge' }] },
    { id: 'sample-5', date: '2027-10-18', title: 'Columbia River Gorge', city: 'Hood River', region: 'Oregon', drive: 'Multi-hour drive', plan: ['Arrive in the Gorge', 'Catch the last light at a viewpoint'], stay: 'Choose a gateway-town stay', meals: [{ label: 'Lunch', suggestion: 'Pack a picnic for the drive' }] },
    { id: 'sample-6', date: '2027-10-19', title: 'Gorge day', city: 'Hood River', region: 'Oregon', drive: 'Local driving and walking', plan: ['Visit waterfall viewpoints', 'Keep the day flexible'], stay: 'Choose a gateway-town stay', meals: [{ label: 'Meals', suggestion: 'Check current opening hours' }] },
    { id: 'sample-7', date: '2027-10-20', title: 'High desert', city: 'Bend', region: 'Oregon', drive: 'Long drive · confirm route', plan: ['Cross to the high desert', 'Watch the evening light'], stay: 'Sample hotel · not booked', meals: [{ label: 'Lunch', suggestion: 'Pack food for the road' }] },
    { id: 'sample-8', date: '2027-10-21', title: 'Crater Lake & return', city: 'Portland', region: 'Oregon', drive: 'Park stops, then return north', plan: ['Morning at the lake', 'Return toward the city'], stay: 'Sample hotel · not booked', meals: [{ label: 'Lunch', suggestion: 'Picnic near the park' }] },
    { id: 'sample-9', date: '2027-10-22', title: 'Departure day', city: 'Portland', region: 'Oregon', drive: 'Hotel to airport', plan: ['Check out', 'Head to the airport'], stay: 'Overnight flight', meals: [{ label: 'Airport', suggestion: 'Allow time for car return and check-in' }] },
  ],
  flights: [
    { id: 'sample-outbound', traveler: 'Travel group', route: 'Home → Seattle', detail: 'Add airline, times, and confirmation when booked.', status: 'Planning placeholder', kind: 'outbound' },
    { id: 'sample-return', traveler: 'Travel group', route: 'Portland → Home', detail: 'Add airline, times, and confirmation when booked.', status: 'Planning placeholder', kind: 'return' },
  ],
  route: [
    { id: 'seattle', name: 'Seattle', shortName: 'Seattle', lat: 47.6062, lon: -122.3321, dayIndex: 0 },
    { id: 'olympic', name: 'Olympic Peninsula', shortName: 'Olympic', lat: 48.1181, lon: -123.4307, dayIndex: 2 },
    { id: 'rainier', name: 'Mount Rainier', shortName: 'Rainier', lat: 46.8523, lon: -121.7603, dayIndex: 3 },
    { id: 'gorge', name: 'Columbia River Gorge', shortName: 'Gorge', lat: 45.7253, lon: -121.7300, dayIndex: 4 },
    { id: 'bend', name: 'Bend', shortName: 'Bend', lat: 44.0582, lon: -121.3153, dayIndex: 6 },
    { id: 'portland', name: 'Portland', shortName: 'Portland', lat: 45.5152, lon: -122.6784, dayIndex: 8 },
  ],
  alerts: [],
};

const demoTime = '2026-09-20T12:00:00.000Z';

export const demoExpenses: Expense[] = [
  { id: 'demo-hotel', date: '2027-10-14', description: 'Hotel deposit · sample', category: 'Lodging', amountCents: 18360, currency: 'USD', payerId: 'alex', beneficiaryIds: ['alex', 'casey', 'jordan'], createdAt: demoTime, createdBy: 'Alex Morgan' },
  { id: 'demo-dinner', date: '2027-10-15', description: 'Dinner · sample', category: 'Meals', amountCents: 7800, currency: 'USD', payerId: 'casey', beneficiaryIds: ['alex', 'casey', 'jordan'], createdAt: demoTime, createdBy: 'Casey Lee' },
  { id: 'demo-fuel', date: '2027-10-16', description: 'Fuel · sample', category: 'Transport', amountCents: 4275, currency: 'USD', payerId: 'jordan', beneficiaryIds: ['alex', 'jordan'], createdAt: demoTime, createdBy: 'Jordan Kim' },
  { id: 'demo-tickets', date: '2027-10-17', description: 'Museum tickets · sample', category: 'Activities', amountCents: 24000, currency: 'HKD', payerId: 'casey', beneficiaryIds: ['alex', 'casey', 'jordan'], createdAt: demoTime, createdBy: 'Casey Lee' },
];
