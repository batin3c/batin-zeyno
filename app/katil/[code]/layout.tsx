import type { Metadata } from "next";
import { db } from "@/lib/supabase";
import type { Group } from "@/lib/types";

// Lets WhatsApp / iMessage / Twitter render a real preview when someone
// shares an invite link, instead of the generic "baze" card.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode ?? "").trim().toUpperCase();

  let groupName: string | null = null;
  try {
    const { data: group } = await db
      .from("groups")
      .select("name")
      .eq("invite_code", code)
      .maybeSingle();
    groupName = (group as Pick<Group, "name"> | null)?.name ?? null;
  } catch {
    groupName = null;
  }

  const title = groupName
    ? `${groupName} grubuna katıl`
    : "baze'ye katıl";
  const description = groupName
    ? `${groupName} grubuna katılmak için davet edildin — yer keşfet, hesap böl, küre boya.`
    : "baze'ye katılmak için davet edildin.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "tr_TR",
      siteName: "baze",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function JoinByCodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
