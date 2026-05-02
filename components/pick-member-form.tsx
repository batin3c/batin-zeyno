// Legacy stub — /pick-member now redirects to /giris which renders the
// real auth form (components/auth-form.tsx). This module is kept as a
// no-op so any stray imports don't break the build during the cutover;
// it can be deleted in a follow-up.
export function PickMemberForm() {
  return null;
}
