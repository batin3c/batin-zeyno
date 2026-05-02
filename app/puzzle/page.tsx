import { redirect } from "next/navigation";

// password removed — bounce any /puzzle visit to the new pick-member screen
export default function PuzzlePage() {
  redirect("/pick-member");
}
