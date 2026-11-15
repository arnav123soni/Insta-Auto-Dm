import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "InstaReply - Instagram Automation Platform",
  description: "Automate Instagram comments, private replies, and conversions with ease.",
};

export default function HomePage() {
  redirect("/dashboard");
}
