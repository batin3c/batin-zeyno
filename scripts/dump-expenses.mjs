// One-shot backup before drop. Reads expenses + settlements via service role
// and writes JSON to docs/archive/. Run BEFORE migration 0018.
//
// Usage: node scripts/dump-expenses.mjs

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
const get = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.+)$", "m"));
  return m ? m[1].replace(/^['"]|['"]$/g, "").trim() : "";
};
const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE = get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("missing env");
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: expenses, error: eErr } = await supa
  .from("expenses")
  .select("*");
if (eErr) {
  console.error("expenses err:", eErr.message);
  process.exit(1);
}
const { data: settlements, error: sErr } = await supa
  .from("settlements")
  .select("*");
if (sErr) {
  console.error("settlements err:", sErr.message);
  process.exit(1);
}

const archiveDir = path.join(ROOT, "docs", "archive");
fs.mkdirSync(archiveDir, { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const file = path.join(archiveDir, `expenses-backup-${today}.json`);
fs.writeFileSync(
  file,
  JSON.stringify(
    {
      backed_up_at: new Date().toISOString(),
      expenses_count: expenses?.length ?? 0,
      settlements_count: settlements?.length ?? 0,
      expenses: expenses ?? [],
      settlements: settlements ?? [],
    },
    null,
    2
  )
);
console.log(
  `wrote ${file} — ${expenses?.length ?? 0} expenses, ${settlements?.length ?? 0} settlements`
);
