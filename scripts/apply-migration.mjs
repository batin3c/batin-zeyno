// Apply a SQL migration via Supabase Management API.
//
// Usage: node scripts/apply-migration.mjs supabase/migrations/0018_drop_planner.sql
//
// Reads .env.local for SUPABASE_ACCESS_TOKEN and project ref derived from
// NEXT_PUBLIC_SUPABASE_URL.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
const get = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.+)$", "m"));
  return m ? m[1].replace(/^['"]|['"]$/g, "").trim() : "";
};
const ACCESS_TOKEN = get("SUPABASE_ACCESS_TOKEN");
const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
if (!ACCESS_TOKEN || !SUPABASE_URL) {
  console.error("missing SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}
const ref = new URL(SUPABASE_URL).hostname.split(".")[0];

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/apply-migration.mjs <path-to-sql>");
  process.exit(1);
}
const sql = fs.readFileSync(path.join(ROOT, file), "utf8");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);
const text = await res.text();
if (!res.ok) {
  console.error(`failed: ${res.status} ${res.statusText}`);
  console.error(text);
  process.exit(1);
}
console.log(`applied ${file}`);
console.log(text.slice(0, 800));
