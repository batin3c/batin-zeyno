import type { Category } from "@/lib/types";

export const LIBRARIES: ("places")[] = ["places"];

export type Draft = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  google_place_id?: string;
  google_maps_url?: string;
  google_photo_urls: string[];
  category: Category;
  note: string;
  visit_date: string;
  rating: number | null;
  rating_count: number | null;
};

export const EMPTY: Draft = {
  name: "",
  address: "",
  lat: null,
  lng: null,
  google_photo_urls: [],
  category: "other",
  note: "",
  visit_date: "",
  rating: null,
  rating_count: null,
};

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function draftToFormData(tripId: string, draft: Draft): FormData {
  const fd = new FormData();
  fd.set("trip_id", tripId);
  fd.set("name", draft.name);
  fd.set("address", draft.address);
  fd.set("lat", String(draft.lat));
  fd.set("lng", String(draft.lng));
  if (draft.google_place_id) fd.set("google_place_id", draft.google_place_id);
  if (draft.google_maps_url) fd.set("google_maps_url", draft.google_maps_url);
  if (draft.google_photo_urls.length > 0) {
    fd.set("google_photo_urls", JSON.stringify(draft.google_photo_urls));
  }
  if (draft.rating !== null) fd.set("rating", String(draft.rating));
  if (draft.rating_count !== null)
    fd.set("rating_count", String(draft.rating_count));
  fd.set("category", draft.category);
  fd.set("note", draft.note);
  if (draft.visit_date) fd.set("visit_date", draft.visit_date);
  return fd;
}
