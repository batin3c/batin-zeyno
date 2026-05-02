import { redirect } from "next/navigation";

// auth replaced /pick-member with /giris (email + password)
export default function PickMemberPage() {
  redirect("/giris");
}
