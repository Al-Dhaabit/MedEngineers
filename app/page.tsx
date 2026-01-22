import { Hero } from "@/components/Hero";
import { EventDetails } from "@/components/EventDetails";
import { RegistrationSection } from "@/components/RegistrationSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <Hero />
      <EventDetails />
      <RegistrationSection />
      <Footer />
    </main>
  );
}
