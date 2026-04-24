import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import { lookupCountry } from "./country-codes";

export type CountryFeatureProps = {
  iso2: string;
  name: string;
};

let cached: FeatureCollection<Geometry, CountryFeatureProps> | null = null;

export function loadCountryFeatures(): FeatureCollection<
  Geometry,
  CountryFeatureProps
> {
  if (cached) return cached;

  const topo = worldAtlas as unknown as Topology<{
    countries: GeometryCollection;
  }>;
  const fc = feature(topo, topo.objects.countries) as FeatureCollection<
    Geometry,
    Record<string, unknown>
  >;

  const withIso: FeatureCollection<Geometry, CountryFeatureProps> = {
    type: "FeatureCollection",
    features: fc.features
      .map((f) => {
        const numericId = f.id;
        const entry = lookupCountry(numericId as string | number);
        if (!entry) return null;
        return {
          ...f,
          properties: { iso2: entry.iso2, name: entry.name },
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null),
  };

  cached = withIso;
  return cached;
}
