import { redirect } from "next/navigation";

export default function HomePage() {
  // For now, redirect to login
  // Later: check auth and redirect based on role
  redirect("/welcome");
}
