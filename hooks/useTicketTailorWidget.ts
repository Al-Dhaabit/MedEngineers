import { useEffect, useRef } from 'react';

export const useTicketTailorWidget = () => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const scriptAdded = useRef(false);

  useEffect(() => {
    if (widgetRef.current && !scriptAdded.current) {
      // Create the widget container
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'tt-widget';
      
      // Create fallback content
      const fallback = document.createElement('div');
      fallback.className = 'tt-widget-fallback';
      fallback.innerHTML = `
        <p>
          <a href="https://app.tickettailor.com/event/ev_7638691" target="_blank" rel="noopener noreferrer">
            Click here to buy tickets
          </a>
          <br />
          <small>
            <a href="https://www.tickettailor.com?rf=wdg_291769" class="tt-widget-powered">
              Sell tickets online with Ticket Tailor
            </a>
          </small>
        </p>
      `;
      
      widgetContainer.appendChild(fallback);
      widgetRef.current.appendChild(widgetContainer);

      // Try iframe approach first (more reliable)
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.tickettailor.com/all-tickets/ev_7638691/?ref=website_widget&iframe=true';
      iframe.style.width = '100%';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      iframe.onload = () => {
        console.log('Ticket Tailor iframe loaded successfully');
        // Hide the fallback content
        if (fallback) {
          fallback.style.display = 'none';
        }
      };
      iframe.onerror = () => {
        console.error('Ticket Tailor iframe failed to load');
        // Show fallback content
        if (fallback) {
          fallback.style.display = 'block';
        }
      };

      widgetRef.current.appendChild(iframe);

      // Add the script as fallback
      const script = document.createElement('script');
      script.src = 'https://cdn.tickettailor.com/js/widgets/min/widget.js';
      script.async = true;
      script.setAttribute('data-url', 'https://www.tickettailor.com/all-tickets/ev_7638691/?ref=website_widget&show_search_filter=true&show_date_filter=true&show_sort=true');
      script.setAttribute('data-type', 'inline');
      script.setAttribute('data-inline-minimal', 'true');
      script.setAttribute('data-inline-show-logo', 'false');
      script.setAttribute('data-inline-bg-fill', 'false');
      script.setAttribute('data-inline-ref', 'website_widget');

      // Add timeout to show fallback if widget doesn't load
      const timeout = setTimeout(() => {
        if (widgetRef.current && !widgetRef.current.querySelector('.tt-widget-loaded')) {
          console.warn('Ticket Tailor widget timeout - showing fallback');
          widgetRef.current.innerHTML = `
            <div class="p-6 text-center">
              <p class="text-red-500 mb-4">Unable to load ticket widget</p>
              <a href="https://app.tickettailor.com/event/ev_7638691" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 class="bg-[#007b8a] text-white px-6 py-3 rounded-lg hover:bg-[#005f6a] transition-colors inline-block">
                Buy Tickets Directly
              </a>
            </div>
          `;
        }
      }, 5000); // 5 second timeout

      // Add error handling
      script.onerror = () => {
        console.error('Ticket Tailor widget failed to load');
        clearTimeout(timeout);
        if (widgetRef.current) {
          widgetRef.current.innerHTML = `
            <div class="p-6 text-center">
              <p class="text-red-500 mb-4">Unable to load ticket widget</p>
              <a href="https://app.tickettailor.com/event/ev_7638691" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 class="bg-[#007b8a] text-white px-6 py-3 rounded-lg hover:bg-[#005f6a] transition-colors inline-block">
                Buy Tickets Directly
              </a>
            </div>
          `;
        }
      };

      script.onload = () => {
        console.log('Ticket Tailor script loaded successfully');
        // Mark as loaded to prevent timeout from triggering
        setTimeout(() => {
          if (widgetRef.current) {
            const widgetElement = widgetRef.current.querySelector('.tt-widget');
            if (widgetElement) {
              widgetElement.classList.add('tt-widget-loaded');
            }
          }
        }, 1000);
      };

      widgetRef.current.appendChild(script);
      scriptAdded.current = true;

      return () => {
        // Cleanup function to remove the script when component unmounts
        clearTimeout(timeout);
        if (widgetRef.current) {
          if (script.parentNode === widgetRef.current) {
            widgetRef.current.removeChild(script);
          }
          if (iframe.parentNode === widgetRef.current) {
            widgetRef.current.removeChild(iframe);
          }
          if (widgetContainer.parentNode === widgetRef.current) {
            widgetRef.current.removeChild(widgetContainer);
          }
        }
      };
    }
  }, []);

  return widgetRef;
};
