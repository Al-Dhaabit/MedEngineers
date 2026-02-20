import { Hero } from "@/components/Hero";
import { EventDetails } from "@/components/EventDetails";
import { RegistrationSection } from "@/components/RegistrationSection";
import { Footer } from "@/components/Footer";
// import ImageGallery from "@/components/ImageGallery";

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <Hero />
      <EventDetails />
      <RegistrationSection />
      {/* <ImageGallery /> */}
      <Footer />
    </main>
  );
}
