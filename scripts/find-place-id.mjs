// ============================================================
// scripts/find-place-id.mjs — one-time helper
// ============================================================
// Finds the Google Place ID ("ChIJ…") for the shop via Places API
// (New) Text Search, so it can be saved as GOOGLE_PLACE_ID.
//
//   GOOGLE_PLACES_API_KEY=... node scripts/find-place-id.mjs
//
// Prints every candidate with its distance from the known shop
// coordinates (same ones as /contact) plus rating/review count, so
// the right match is easy to confirm (expected: ~0 m, 5.0, 61+).
// One Text Search call; nothing is written anywhere.
// ============================================================

const QUERY = 'Uri Herbs Workshop, Chiang Mai';
const SHOP = { lat: 18.794052, lng: 98.9915941 };

const key = process.env.GOOGLE_PLACES_API_KEY;
if (!key) {
  console.error('Set GOOGLE_PLACES_API_KEY first.');
  process.exit(1);
}

const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': key,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount',
  },
  body: JSON.stringify({
    textQuery: QUERY,
    languageCode: 'en',
    locationBias: { circle: { center: { latitude: SHOP.lat, longitude: SHOP.lng }, radius: 500 } },
  }),
});

const json = await res.json();
if (!res.ok) {
  console.error(`Text Search failed (${res.status}):`, json?.error?.message ?? json);
  process.exit(1);
}

// Haversine distance in meters.
function meters(a, b) {
  const R = 6371000, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const places = json.places ?? [];
if (places.length === 0) {
  console.error('No results.');
  process.exit(1);
}
for (const p of places) {
  const d = p.location ? meters(SHOP, { lat: p.location.latitude, lng: p.location.longitude }) : '?';
  console.log(
    `${p.id}  | ${p.displayName?.text} | ${d} m away | rating ${p.rating ?? '-'} (${p.userRatingCount ?? 0} reviews)\n    ${p.formattedAddress ?? ''}`,
  );
}
