"use client";

export function TicketTailorWidget() {
  return (
    <div className="tt-widget w-full flex justify-center">
      <iframe
        src="https://www.tickettailor.com/all-tickets/medhackglobal/?ref=website_widget&show_search_filter=true&show_date_filter=true&show_sort=true"
        title="Ticket Tailor Widget"
        width="100%"
        height="600"
        style={{ border: "none", overflow: "hidden", maxWidth: "100%" }}
        allow="payment"
      ></iframe>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none hidden">
        {/* Fallback for SEO or screen readers if needed, but iframe content is primary */}
      </div>
    </div>
  );
}
