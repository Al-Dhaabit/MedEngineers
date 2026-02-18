"use client";

import { useAuth } from "@/lib/AuthContext";

export function Hero() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    console.log("=== USER SIGN OUT ===");

    try {
      console.log("Signing out through AuthContext...");
      await signOut();

      console.log("Reloading page to clear all local state...");
      // Force page reload to clear all state after context updates
      window.location.href = window.location.origin;

    } catch (error) {
      console.error("Sign out error:", error);
      // Force reload even if sign-out fails to ensure clean state
      window.location.href = window.location.origin;
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black [will-change:transform]">
      {/* Background Image with Dark Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url("/images/bg_image.png")' }}
      >
        <div className="absolute inset-0 bg-black/60 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
      </div>

      {/* Header Container */}
      <div className="absolute top-2 sm:top-0 left-0 right-0 z-20 px-5 sm:px-8">
        <div className="flex flex-row justify-between items-center w-full max-w-7xl mx-auto gap-4">
          {/* Top Left Logo */}
          <div className="flex items-center">
            <div className="flex flex-col border-l-2 border-[#007b8a] pl-3 py-0.5">
              <span className="text-xl sm:text-3xl font-black tracking-tight text-white leading-none">
                MED<span className="text-[#007b8a]">HACK</span>
              </span>
              <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-zinc-400 uppercase leading-none mt-0.5">
                GLOBAL
              </span>
            </div>
          </div>

          {/* Top Right Area */}
          <div className="flex items-center gap-4">
            {/* Top Right Logo Box */}
            <div className="flex items-center">
              <img
                src="/logos/aus_logo.svg"
                alt="AUS Logo"
                className="h-32 sm:h-52 w-auto object-contain"
              />
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
          <div className="w-full flex justify-center items-center px-4">
            <img
              src="/logos/Medengineers Logo-cropped.svg"
              alt="MedEngineers"
              className="w-auto h-24 xs:h-32 sm:h-40 md:h-52 lg:h-64 xl:h-80 object-contain drop-shadow-[0_0_15px_rgba(0,123,138,0.3)] [will-change:filter]"
            />
          </div>

          <div className="-mt-2 sm:-mt-11 flex flex-col sm:flex-row items-center justify-center gap-1 text-white/95 font-medium tracking-wide">
            <span className="text-4xl sm:text-3xl">🇦🇪</span>
            <span className="text-lg sm:text-xl md:text-2xl uppercase tracking-widest font-light text-center">
              Where Medicine Meets Engineering
            </span>
          </div>
        </h1>

        <div className="mt-10 sm:mt-14 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 w-full px-4">
          <a
            href="#registration"
            className="group relative px-10 py-3.5 bg-[#007b8a] text-white font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(0,123,138,0.5)] text-lg w-full sm:w-auto text-center max-w-xs"
          >
            <span className="relative z-10">Register</span>
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
