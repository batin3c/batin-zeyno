// Admin-only: reset a member's password to a new random temporary value.
// Hashes with the same scrypt config as lib/password.ts (salt:hash hex).
//
// Usage: node scripts/reset-password.mjs <email> [newPassword]
//   - With one arg: generates a random 10-char temp password.
//   - With two args: sets the password to the given string.
// Reads .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

import fs from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
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
  console.error("missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("usage: node scripts/reset-password.mjs <email>");
  process.exit(1);
}

// Same constants as lib/password.ts
const KEY_LEN = 64;
const SALT_LEN = 16;

// 10-char password from an unambiguous alphabet (no I/l/1/O/0)
function makeTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  let out = "";
  for (let i = 0; i < 10; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function hashPassword(password) {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: member, error: lookupErr } = await supa
  .from("members")
  .select("id, email, name, surname, is_active")
  .ilike("email", email)
  .maybeSingle();

if (lookupErr) {
  console.error("lookup failed:", lookupErr.message);
  process.exit(1);
}
if (!member) {
  console.error(`no member found with email "${email}"`);
  process.exit(1);
}
if (!member.is_active) {
  console.error(`member ${member.email} is not active — aborting`);
  process.exit(1);
}

const customPassword = process.argv[3];
const tempPassword =
  typeof customPassword === "string" && customPassword.length > 0
    ? customPassword
    : makeTempPassword();
const password_hash = hashPassword(tempPassword);

const { error: updateErr } = await supa
  .from("members")
  .update({ password_hash })
  .eq("id", member.id);

if (updateErr) {
  console.error("update failed:", updateErr.message);
  process.exit(1);
}

console.log("");
console.log("password reset OK");
console.log(`  member: ${member.name} ${member.surname} <${member.email}>`);
console.log(`  temp password: ${tempPassword}`);
console.log("");
console.log("Share this password with the user via a secure channel.");
console.log("They should sign in and change it from their profile.");
