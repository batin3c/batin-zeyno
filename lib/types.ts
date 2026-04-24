export type Member = {
  id: string;
  name: string;
  avatar_url: string | null;
  sort_order: number;
  created_at: string;
};

export type Trip = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  start_date: string | null;
  end_date: string | null;
  center_lat: number | null;
  center_lng: number | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const CATEGORIES = [
  { key: "restaurant", emoji: "🍽️", label: "Restoran" },
  { key: "cafe", emoji: "☕", label: "Kafe" },
  { key: "bar", emoji: "🍷", label: "Bar" },
  { key: "hotel", emoji: "🏨", label: "Otel" },
  { key: "museum", emoji: "🏛️", label: "Müze" },
  { key: "view", emoji: "🌅", label: "Manzara" },
  { key: "shopping", emoji: "🛍️", label: "Alışveriş" },
  { key: "nature", emoji: "🌿", label: "Doğa" },
  { key: "activity", emoji: "🎢", label: "Aktivite" },
  { key: "other", emoji: "📍", label: "Diğer" },
] as const;

export type Category = (typeof CATEGORIES)[number]["key"];

export type LocationStatus = "want" | "visited";

export type Location = {
  id: string;
  trip_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  google_place_id: string | null;
  google_maps_url: string | null;
  category: Category;
  note: string | null;
  status: LocationStatus;
  loved_by: string[];
  photo_urls: string[];
  google_photo_urls: string[];
  visit_date: string | null;
  rating: number | null;
  rating_count: number | null;
  sort_order: number;
  amount: number | null;
  currency: string | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AppConfig = {
  key: string;
  value: unknown;
  updated_at: string;
};

export type SessionPayload = {
  memberId: string;
  expiresAt: number;
};

export type VisitedCountry = {
  code: string;
  note: string | null;
  added_by: string | null;
  added_at: string;
  updated_at: string;
};

export type CountryPhoto = {
  id: string;
  code: string;
  url: string;
  added_by: string | null;
  added_at: string;
};

export type VisitedCity = {
  id: string;
  name: string;
  country_code: string | null;
  lat: number;
  lng: number;
  google_place_id: string | null;
  note: string | null;
  boundary_geojson: unknown | null;
  boundary_fetched_at: string | null;
  added_by: string | null;
  added_at: string;
  updated_at: string;
};

export type CityPhoto = {
  id: string;
  city_id: string;
  url: string;
  added_by: string | null;
  added_at: string;
};
