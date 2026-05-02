import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Fredoka, JetBrains_Mono } from "next/font/google";
import { unstable_cache } from "next/cache";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeScript } from "@/components/theme-script";
import { PersistentGlobe } from "@/components/persistent-globe";
import { db } from "@/lib/supabase";
import { getCurrentMember, getActiveGroupId } from "@/lib/dal";
import type {
  VisitedCountry,
  CountryPhoto,
  VisitedCity,
  CityPhoto,
} from "@/lib/types";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "baze",
  description: "ikimize özel tatil günlüğü",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "baze",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7ee" },
    { media: "(prefers-color-scheme: dark)", color: "#16120e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// cached for 60s, invalidated by tag from country/city actions.
// groupId is part of the cache key (unstable_cache hashes function args),
// so each group has its own cached payload. The tag stays "globe-data" —
// today mutations bust ALL groups' caches; per-group invalidation can be
// added later with updateTag.
const getGlobeData = unstable_cache(
  async (groupId: string) => {
    const [
      { data: visited },
      { data: photos },
      { data: cities },
      { data: cityPhotos },
    ] = await Promise.all([
      db
        .from("visited_countries")
        .select("*")
        .eq("group_id", groupId)
        .order("added_at", { ascending: false }),
      db
        .from("country_photos")
        .select("*")
        .eq("group_id", groupId)
        .order("added_at", { ascending: false }),
      db
        .from("visited_cities")
        .select("*")
        .eq("group_id", groupId)
        .order("added_at", { ascending: false }),
      db
        .from("city_photos")
        .select("*")
        .eq("group_id", groupId)
        .order("added_at", { ascending: false }),
    ]);
    return {
      visited: (visited ?? []) as VisitedCountry[],
      photos: (photos ?? []) as CountryPhoto[],
      cities: (cities ?? []) as VisitedCity[],
      cityPhotos: (cityPhotos ?? []) as CityPhoto[],
    };
  },
  ["globe-data"],
  { revalidate: 60, tags: ["globe-data"] }
);

async function GlobeShell() {
  try {
    const me = await getCurrentMember();
    if (!me) return null;
    const groupId = await getActiveGroupId();
    // user is between login and group selection — no globe to show yet
    if (!groupId) return null;
    const data = await getGlobeData(groupId);
    return (
      <PersistentGlobe
        visited={data.visited}
        photos={data.photos}
        cities={data.cities}
        cityPhotos={data.cityPhotos}
      />
    );
  } catch {
    return null;
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${fredoka.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <GlobeShell />
        </Suspense>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
