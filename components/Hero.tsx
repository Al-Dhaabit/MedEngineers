import { signOut } from "firebase/auth";
import { auth } from "@/lib/Firebase";

export function Hero() {
  // const { signOut } = useAuth(); // Removed useAuth

  const handleSignOut = async () => {
    console.log("=== USER SIGN OUT ===");

    try {
      console.log("Signing out from Firebase...");
      await signOut(auth);
      console.log("Firebase sign out completed");

      // Wait longer to ensure Firebase state is fully cleared
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify user is actually signed out before reload
      const currentUser = auth.currentUser;
      console.log("Current user after sign out:", currentUser);

      if (currentUser) {
        console.log("User still exists, forcing sign out...");
        await auth.signOut();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log("Reloading page...");
      // Force page reload to clear all state
      window.location.href = window.location.origin;

    } catch (error) {
      console.error("Sign out error:", error);
      // Still try to sign out from Firebase directly
      try {
        await auth.signOut();
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.error("Direct Firebase sign out failed:", e);
      }
      // Force reload even if sign-out fails
      window.location.href = window.location.origin;
    }
  };
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Background Image with Dark Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url("/images/bg_image.png")' }}
      >
        <div className="absolute inset-0 bg-black/60 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
      </div>

      {/* Header Container */}
      <div className="absolute top-5 sm:top-8 left-0 right-0 z-20 px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full max-w-7xl mx-auto gap-4">
          {/* Top Left Logo */}
          <div className="flex items-center">
            <div className="flex flex-col border-l-2 border-[#007b8a] pl-3 py-0.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
                MED<span className="text-[#007b8a]">HACK</span>
              </span>
              <span className="text-xs font-bold tracking-[0.2em] text-zinc-400 uppercase leading-none mt-0.5">
                GLOBAL
              </span>
            </div>
          </div>

          {/* Top Right Area */}
          <div className="flex items-center gap-4">
            {/* Top Right Logo Box */}
            <div className="bg-white/95 px-4 py-2 rounded-sm shadow-lg flex items-center gap-3">
              <div className="text-2xl text-[#8B1E1E] font-serif font-bold border-r border-zinc-300 pr-3 leading-none">
                AUS
              </div>
              <div className="flex flex-col text-xs leading-tight text-zinc-600 font-medium">
                <span className="text-xs font-semibold text-zinc-800">الجامعة الأمريكية في الشارقة</span>
                <span className="text-[11px]">American University of Sharjah</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl px-5 sm:px-8 text-center flex flex-col items-center mt-20 sm:mt-0">
        {/* Grid Icon Above Text - Only show on larger screens */}
        <div className="hidden sm:grid mb-8 grid-cols-3 gap-1.5 opacity-80">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-2 h-2 bg-white rounded-full" />
          ))}
        </div>

        {/* Main Headline */}
        <h1 className="flex flex-col items-center px-4 w-full">
          <div className="w-full text-[15vw] xs:text-[13vw] sm:text-[7.5rem] font-black tracking-[-0.03em] leading-[0.9] uppercase select-none">
            <span className="text-[#007b8a] drop-shadow-[0_0_20px_rgba(0,123,138,0.4)]">med</span>
            <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] block sm:inline-block sm:ml-3">engineers</span>
          </div>

          <div className="mt-5 sm:mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 text-white/95 font-medium tracking-wide">
            <span className="text-4xl sm:text-3xl">🇦🇪</span>
            <span className="text-lg sm:text-xl md:text-2xl uppercase tracking-widest font-light text-center">
              Where Medicine meets Engineering
            </span>
          </div>
        </h1>

        <div className="mt-10 sm:mt-14 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 w-full px-4">
          <a
            href="#registration"
            className="group relative px-10 py-3.5 bg-[#007b8a] text-white font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(0,123,138,0.5)] text-lg w-full sm:w-auto text-center max-w-xs"
          >
            <span className="relative z-10">Get Tickets</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </a>
          <a
            href="#details"
            className="text-base sm:text-[15px] font-semibold leading-6 text-white hover:text-[#007b8a] transition-colors flex items-center gap-2 py-2 group"
          >
            Learn more <span className="inline-block transition-transform duration-200 group-hover:translate-x-1.5">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
