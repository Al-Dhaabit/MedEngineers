import { Hero } from "@/components/Hero";
import { EventDetails } from "@/components/EventDetails";
import { RegistrationSection } from "@/components/RegistrationSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Hero />
      <EventDetails />
      <RegistrationSection />
    </main>
  );
}
