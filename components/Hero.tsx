export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-zinc-950 py-24 sm:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]"></div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
            MedHack 2026: <br />
            <span className="text-indigo-600 dark:text-indigo-400">Innovate for Health</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            Join the brightest minds in medicine and engineering for a 48-hour hackathon. 
            Build the future of healthcare technology.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a
              href="#registration"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
            >
              Get Tickets
            </a>
            <a href="#details" className="text-sm font-semibold leading-6 text-zinc-900 dark:text-white">
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
