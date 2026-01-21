export function Hero() {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-black">
      {/* Background Image with Dark Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center "
        style={{ backgroundImage: 'url("/images/bg_image.png")' }}
      >
        <div className="absolute inset-0 bg-black/60 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
      </div>

      {/* Top Left Logo */}
      <div className="absolute top-8 left-8 z-20 flex items-center gap-2">
        <div className="flex flex-col border-l-2 border-[#007b8a] pl-2">
          <span className="text-xl font-black tracking-tighter text-white leading-none">
            MED<span className="text-[#007b8a]">HACK</span>
          </span>
          <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase leading-none">
            GLOBAL
          </span>
        </div>
      </div>

      {/* Top Right Logo Box */}
      <div className="absolute top-8 right-8 z-20 bg-white/95 px-4 py-2 rounded-sm shadow-lg flex items-center gap-3">
        <div className="text-[#8B1E1E] font-serif font-bold text-2xl border-r border-zinc-300 pr-3">
            AUS
        </div>
        <div className="flex flex-col text-[8px] leading-tight text-zinc-600 font-medium">
            <span className="text-[10px] font-semibold text-zinc-800">الجامعة الأمريكية في الشارقة</span>
            <span>American University of Sharjah</span>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-7xl px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Grid Icon Above Text */}
        <div className="mb-4 grid grid-cols-3 gap-1 opacity-80">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 bg-white rounded-full" />
          ))}
        </div>

        {/* Main Headline */}
        <h1 className="flex flex-col items-center">
          <div className="text-[12vw] sm:text-[10rem] font-black tracking-[-0.05em] leading-[0.85] uppercase select-none">
            <span className="text-[#007b8a] drop-shadow-[0_0_20px_rgba(0,123,138,0.3)]">med</span>
            <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">engineers</span>
          </div>
          
          <div className="mt-6 flex items-center gap-3 text-white/90 font-medium tracking-wide">
            <span className="text-2xl">🇦🇪</span>
            <span className="text-sm sm:text-xl uppercase tracking-widest font-light">
                Where Medicine meets Engineering
            </span>
          </div>
        </h1>

        <div className="mt-12 flex items-center justify-center gap-x-6">
          <a
            href="#registration"
            className="group relative px-8 py-3 bg-[#007b8a] text-white font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,123,138,0.4)]"
          >
            <span className="relative z-10">Get Tickets</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </a>
          <a 
            href="#details" 
            className="text-sm font-semibold leading-6 text-white hover:text-[#007b8a] transition-colors flex items-center gap-2"
          >
            Learn more <span>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
