// 6-char invite codes for groups. Alphabet excludes characters that are
// easy to mis-read aloud (0/O, 1/I/L) so a friend can dictate a code over
// the phone without ambiguity.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeInviteCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
