import type { Category } from "./types";

/**
 * Map a Google Places `types` array to our internal Category enum.
 * Google returns multiple types per place (most-specific first), so we
 * iterate in their order and pick the first one we recognize.
 */
const TYPE_TO_CATEGORY: Record<string, Category> = {
  // restaurants
  restaurant: "restaurant",
  meal_takeaway: "restaurant",
  meal_delivery: "restaurant",
  food: "restaurant",

  // cafes
  cafe: "cafe",
  bakery: "cafe",

  // bars
  bar: "bar",
  night_club: "bar",
  liquor_store: "bar",

  // hotels
  lodging: "hotel",

  // museums + culture
  museum: "museum",
  art_gallery: "museum",
  library: "museum",

  // viewpoints / monuments
  tourist_attraction: "view",
  church: "view",
  mosque: "view",
  hindu_temple: "view",
  synagogue: "view",
  cemetery: "view",
  city_hall: "view",
  courthouse: "view",
  embassy: "view",
  landmark: "view",

  // nature
  park: "nature",
  natural_feature: "nature",
  campground: "nature",
  rv_park: "nature",
  national_park: "nature",
  beach: "nature",

  // shopping
  shopping_mall: "shopping",
  store: "shopping",
  clothing_store: "shopping",
  department_store: "shopping",
  shoe_store: "shopping",
  jewelry_store: "shopping",
  book_store: "shopping",
  electronics_store: "shopping",
  furniture_store: "shopping",
  home_goods_store: "shopping",
  supermarket: "shopping",
  convenience_store: "shopping",
  florist: "shopping",
  pet_store: "shopping",
  bicycle_store: "shopping",

  // activities
  amusement_park: "activity",
  zoo: "activity",
  aquarium: "activity",
  stadium: "activity",
  bowling_alley: "activity",
  casino: "activity",
  gym: "activity",
  movie_theater: "activity",
  spa: "activity",
};

export function pickCategoryFromGoogleTypes(
  types: readonly string[] | null | undefined
): Category {
  if (!Array.isArray(types)) return "other";
  for (const t of types) {
    const c = TYPE_TO_CATEGORY[t];
    if (c) return c;
  }
  return "other";
}
