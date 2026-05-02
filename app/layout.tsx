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
  description: "yer keşfet, hesap böl, küre boya — gruplara özel tatil günlüğü",
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
  openGraph: {
    title: "baze",
    description: "yer keşfet, hesap böl, küre boya",
    type: "website",
    locale: "tr_TR",
    siteName: "baze",
  },
  twitter: {
    card: "summary_large_image",
    title: "baze",
    description: "yer keşfet, hesap böl, küre boya",
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

// cached for 60s, invalidated per-group via updateTag(`globe-data:${groupId}`)
// in country/city actions. The cache key includes groupId AND we attach a
// per-group tag so a mutation in group A no longer flushes group B's cache.
async function loadGlobeData(groupId: string) {
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
      // album view is drag-reorderable; sort_order is the manual override,
      // added_at is the tiebreaker (newest first for any city not yet moved)
      .order("sort_order", { ascending: true })
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
}

function getGlobeData(groupId: string) {
  return unstable_cache(
    () => loadGlobeData(groupId),
    ["globe-data", groupId],
    { revalidate: 60, tags: [`globe-data:${groupId}`] }
  )();
}

async function GlobeShell() {
  // The try/catch only wraps awaited fetches (auth lookup + cached query),
  // not render. If any of those throw, we silently render nothing rather
  // than blowing up the whole layout. The lint rule about JSX-in-try/catch
  // doesn't apply because <PersistentGlobe /> is constructed AFTER the
  // try block exits successfully.
  let data: Awaited<ReturnType<typeof getGlobeData>> | null = null;
  try {
    const me = await getCurrentMember();
    if (!me) return null;
    const groupId = await getActiveGroupId();
    // user is between login and group selection — no globe to show yet
    if (!groupId) return null;
    data = await getGlobeData(groupId);
  } catch {
    return null;
  }
  return (
    <PersistentGlobe
      visited={data.visited}
      photos={data.photos}
      cities={data.cities}
      cityPhotos={data.cityPhotos}
    />
  );
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
