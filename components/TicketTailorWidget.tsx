"use client";

type TicketTailorWidgetProps = {
  email?: string;
  eventId?: string;
};

export function TicketTailorWidget({ email, eventId = "2168432" }: TicketTailorWidgetProps) {
  // Construct the URL with the parameters from the script snippet
  // Default eventId is 2168432 (Competitor)
  // New eventId provided for Attendee is 2208897
  const baseUrl = `https://www.tickettailor.com/events/medhackglobal/${eventId}/select-date?ref=website_widget&show_search_filter=true&show_date_filter=true&show_sort=true`;
  
  // Add email pre-fill if available
  const targetUrl = `${baseUrl}${email ? `&preset_data=1#p[email]=${encodeURIComponent(email)}` : ""}`;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <iframe
          src={targetUrl}
          title="Ticket Tailor Checkout"
          width="100%"
          height="650"
          className="w-full"
          style={{ border: "none" }}
          allow="payment"
        ></iframe>
      </div>
    </div>
  );
}