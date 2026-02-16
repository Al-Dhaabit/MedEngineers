import { CalendarIcon, MapPinIcon, ClockIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

export function EventDetails() {
  const details = [
    {
      name: 'Date',
      description: 'March 28, 2026',
      icon: (
        <CalendarIcon className="w-16 h-16 text-[#007b8a] group-hover:scale-110 transition-transform duration-300" />
      ),
    },
    {
      name: 'Location',
      description: 'American University of Sharjah',
      subDescription: 'Main Building, University City, Sharjah, UAE',
      icon: (
        <MapPinIcon className="w-16 h-16 text-[#007b8a] group-hover:scale-110 transition-transform duration-300" />
      ),
      button: (
        <a
          href="https://maps.app.goo.gl/z2NabdBEqknaJiQo8"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center text-sm font-medium text-[#007b8a] hover:text-white group-hover:text-white transition-colors duration-300"
        >
          View on map
          <ArrowTopRightOnSquareIcon className="ml-1 w-4 h-4" />
        </a>
      )
    },
    {
      name: 'Schedule',
      description: '9:00 AM - 6:00 PM',
      subDescription: 'Full day of workshops and activities',
      icon: (
        <ClockIcon className="w-16 h-16 text-[#007b8a] group-hover:scale-110 transition-transform duration-300" />
      ),
    },
  ];

  return (
    <section id="details" className="relative bg-black py-20 sm:py-28 overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuLWJnIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuLWJnKSIvPjwvc3ZnPg==')]" />
      </div>

      {/* Background Image with Gradient Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: 'url("/images/medhack_bg.png")',
          filter: 'grayscale(100%) brightness(0.3)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/90" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-semibold tracking-wider text-[#007b8a] uppercase mb-2 inline-block">
            Event Information
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-6">
            Event <span className="text-[#007b8a]">Details</span>
          </h2>
          <p className="text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Mark your calendars and join us for an unforgettable experience. Here's everything you need to know about the event.
          </p>
        </div>

        <div className="mt-16 sm:mt-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {details.map((item, index) => (
              <div
                key={item.name}
                className="group relative bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-800 hover:border-[#007b8a]/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,123,138,0.2)] overflow-hidden"
              >
                {/* Animated background effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#007b8a]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Icon container */}
                <div className="relative z-10 w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-gray-900/50 group-hover:border-[#007b8a]/50 transition-colors duration-300">
                  {item.icon}
                </div>

                {/* Content */}
                <div className="relative z-10 text-center">
                  <h3 className="text-2xl font-bold text-white mb-2">{item.name}</h3>
                  <p className="text-lg text-[#007b8a] font-medium mb-1">{item.description}</p>
                  {item.subDescription && (
                    <p className="text-sm text-gray-400 mb-4">{item.subDescription}</p>
                  )}
                  {item.button && item.button}
                </div>

                {/* Decorative elements */}
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-[#007b8a]/10 group-hover:bg-[#007b8a]/20 transition-all duration-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Additional CTA */}
        <div className="mt-16 text-center">
          <a
            href="#registration"
            className="inline-flex items-center px-8 py-3.5 text-lg font-bold text-white bg-[#007b8a] hover:bg-[#006a77] rounded-full transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,123,138,0.5)]"
          >
            Register Now
            <ArrowTopRightOnSquareIcon className="ml-2 w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
}
