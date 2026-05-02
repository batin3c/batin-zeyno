export type Member = {
  id: string;
  name: string;
  surname: string | null;
  email: string;
  avatar_url: string | null;
  sort_order: number;
  created_at: string;
  is_active: boolean;
  color: string | null;
  // password_hash is intentionally NOT in this type — it's server-only and
  // never sent down to the client. Server reads via raw db.from('members').
};

export type Group = {
  id: string;
  name: string;
  color: string | null;
  invite_code: string;
  created_by: string | null;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  member_id: string;
  role: "owner" | "member";
  joined_at: string;
};

export type Trip = {
  id: string;
  group_id: string;
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
  /** null while pattern matched a group but the user hasn't picked their identity yet */
  memberId: string | null;
  /** active group for this session — set by puzzle pattern match */
  activeGroupId: string | null;
  expiresAt: number;
};

export type VisitedCountry = {
  group_id: string;
  code: string;
  note: string | null;
  added_by: string | null;
  added_at: string;
  updated_at: string;
};

export type CountryPhoto = {
  id: string;
  group_id: string;
  code: string;
  url: string;
  added_by: string | null;
  added_at: string;
};

import type { GeoJsonGeometry } from "./osm";

export type VisitedCity = {
  id: string;
  group_id: string;
  name: string;
  country_code: string | null;
  lat: number;
  lng: number;
  google_place_id: string | null;
  note: string | null;
  boundary_geojson: GeoJsonGeometry | null;
  boundary_fetched_at: string | null;
  added_by: string | null;
  added_at: string;
  updated_at: string;
  sort_order: number;
  cover_photo_id: string | null;
};

export type CityPhoto = {
  id: string;
  group_id: string;
  city_id: string;
  url: string;
  added_by: string | null;
  added_at: string;
};

export type ExpenseSplitMode = "half" | "full" | "custom";

export type Expense = {
  id: string;
  group_id: string;
  trip_id: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string;
  split_mode: ExpenseSplitMode;
  /** when split_mode='custom', maps memberId → that member's share in `currency` */
  shares: Record<string, number> | null;
  location_id: string | null;
  spent_at: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type Settlement = {
  id: string;
  group_id: string;
  trip_id: string;
  from_member: string;
  to_member: string;
  amount: number;
  currency: string;
  settled_at: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};
