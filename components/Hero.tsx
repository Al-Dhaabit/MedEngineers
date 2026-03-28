"use client";

import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";

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
      <div className="absolute top-10 sm:top-0 left-0 right-0 z-20 px-4 sm:px-8">
        <div className="flex flex-row justify-evenly sm:justify-between items-center w-full max-w-7xl mx-auto">
          {/* Top Left Logo */}
          <div className="flex items-center shrink-0">
            <div className="flex flex-col border-l-2 border-[#007b8a] pl-2 sm:pl-3 py-0.5">
              <span className="text-[20px] sm:text-2xl font-black tracking-tight text-white leading-none">
                MED<span className="text-[#007b8a]">HACK</span>
              </span>
              <span className="text-[8px] sm:text-xs font-bold tracking-[0.15em] sm:tracking-[0.2em] text-zinc-400 uppercase leading-none mt-0.5">
                GLOBAL
              </span>
            </div>
          </div>

          {/* IEEE Logo */}
          <div className="flex items-center shrink-0">
            <img
              src="/logos/ieee_uae_logo.jpg"
              alt="IEEE UAE Section Logo"
              className="h-8 sm:h-12 md:h-14 w-auto object-contain bg-white px-1.5 sm:px-4 py-1 sm:py-2"
            />
          </div>

          {/* AUS Logo */}
          <div className="flex items-center shrink-0">
            <img
              src="/logos/aus_logo.svg"
              alt="AUS Logo"
              className="h-28 sm:h-28 md:h-48 w-auto object-contain"
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl px-5 sm:px-8 text-center flex flex-col items-center mt-4 sm:-mt-10">


        {/* Main Headline */}
        <h1 className="flex flex-col items-center w-full">
          <div className="w-full flex justify-center items-center">
            <img
              src="/logos/Medengineers Logo-cropped.svg"
              alt="MedEngineers"
              className="w-255 h-24 xs:h-32 sm:h-40 md:h-52 lg:h-64 xl:h-82 object-contain drop-shadow-[0_0_15px_rgba(0,123,138,0.3)] [will-change:filter]"
            />
          </div>

          <div className="-mt-2 sm:-mt-11 flex flex-row items-center justify-center gap-2 sm:gap-3 text-white/95 font-medium tracking-wide">
            <span className="text-xl sm:text-3xl">🇦🇪</span>
            <span className="text-xs sm:text-xl md:text-2xl uppercase tracking-widest font-light text-center">
              Where Medicine Meets Engineering
            </span>
          </div>
        </h1>

        <div className="mt-10 sm:mt-14 flex flex-col items-center justify-center gap-6 sm:gap-8 w-full px-4 sm:px-0">
          
          <div className="flex flex-row items-center justify-center gap-3 sm:gap-8 w-full max-w-[340px] sm:max-w-none">
            <a
              href="#registration"
              className="group relative flex-1 sm:flex-none px-1 sm:px-10 py-3 sm:py-3.5 bg-[#007b8a] text-white font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,123,138,0.4)] sm:shadow-[0_0_25px_rgba(0,123,138,0.5)] text-sm sm:text-lg sm:min-w-[240px] text-center"
            >
              <span className="relative z-10 whitespace-nowrap">Register</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </a>
            
            <Link
              href="/agenda"
              className="group relative flex-1 sm:flex-none px-1 sm:px-10 py-3 sm:py-3.5 bg-white/10 text-white font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 border border-white/20 backdrop-blur-md text-sm sm:text-lg sm:min-w-[240px] text-center shadow-lg"
            >
              <span className="relative z-10 whitespace-nowrap">View Agenda</span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </div>

          <a
            href="#details"
            className="text-sm sm:text-[15px] font-semibold leading-6 text-white hover:text-[#007b8a] transition-colors flex items-center gap-2 group"
          >
            Learn more <span className="inline-block transition-transform duration-200 group-hover:translate-x-1.5">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
