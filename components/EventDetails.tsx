export function EventDetails() {
  const details = [
    {
      name: 'Date',
      description: 'March 28, 2026',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-[#007b8a]">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-8 4h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z" />
        </svg>
      ),
    },
    {
      name: 'Location',
      description: 'AUS main building',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-[#007b8a]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            <ellipse cx="12" cy="19" rx="5" ry="2" stroke="currentColor" strokeWidth="1" />
        </svg>
      ),
    },
    {
      name: 'Duration',
      description: '9:00 AM - 6:00 PM',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-[#007b8a]">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="details" className="relative bg-black py-24 sm:py-32 overflow-hidden">
      {/* Background Image with Dark Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center grayscale opacity-30"
        style={{ backgroundImage: 'url("/images/medhack_bg.png")' }}
      >
        <div className="absolute inset-0 bg-black/80 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center text-center flex flex-col items-center">
          <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.05em] uppercase text-[#007b8a] mb-4">
            Event Details
          </h2>
          <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
            Everything you need to know
          </p>
          <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Get ready for an immersive experience. Collaborate, code, and create solutions that matter.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-12 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {details.map((feature) => (
              <div key={feature.name} className="flex flex-col items-center justify-center text-center">
                <div className="mb-8 transition-transform duration-500 hover:scale-110">
                  {feature.icon}
                </div>
                <dt className="text-xl font-medium tracking-tight text-white mb-2">
                  {feature.name}
                </dt>
                <dd className="text-lg leading-7 text-zinc-500 font-light">
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
