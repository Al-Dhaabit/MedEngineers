import { CalendarIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline'; // Note: User might need to install @heroicons/react if not present, but standard svg icons are safer if we are unsure. Let's use SVG directly to avoid dependency issues for now.

function IconCalendar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-600">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
    </svg>
  )
}

function IconMapPin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-600">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  )
}

function IconClock() {
   return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-600">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
   )
}

export function EventDetails() {
  const details = [
    {
      name: 'Date',
      description: 'October 15-17, 2026',
      icon: IconCalendar,
    },
    {
      name: 'Location',
      description: 'Innovation Hub, Tech City',
      icon: IconMapPin,
    },
    {
      name: 'Duration',
      description: '48 Hours Non-stop',
      icon: IconClock,
    },
  ];

  return (
    <section id="details" className="bg-white dark:bg-zinc-950 py-16 sm:py-24 border-t border-zinc-100 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">Event Details</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Everything you need to know
          </p>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            Get ready for an immersive experience. Collaborate, code, and create solutions that matter.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {details.map((feature) => (
              <div key={feature.name} className="flex flex-col items-center text-center p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                  <feature.icon aria-hidden="true" />
                </div>
                <dt className="text-base font-semibold leading-7 text-zinc-900 dark:text-white">
                  {feature.name}
                </dt>
                <dd className="mt-1 text-base leading-7 text-zinc-600 dark:text-zinc-400">
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
