"use client";

import { useState } from "react";

type UserStatus = "guest" | "pending" | "approved";

export function RegistrationSection() {
  // Mock state to demonstrate the flow. In a real app, this comes from the backend.
  const [status, setStatus] = useState<UserStatus>("guest");

  const handleLoginAndApply = () => {
    // 1. Authenticate user
    // 2. Mark as applied (move to pending)
    alert("Simulating Login & Application Submission...");
    setStatus("pending");
  };

  return (
    <section id="registration" className="py-24 bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* DEV ONLY: State Toggles to visualize the flow */}
        <div className="mb-12 flex justify-center gap-4 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-fit mx-auto">
          <span className="text-xs font-mono uppercase text-zinc-500 self-center">Dev Preview:</span>
          {(["guest", "pending", "approved"] as UserStatus[]).map((s) => (
             <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                status === s 
                  ? "bg-indigo-600 text-white" 
                  : "bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* 1. GUEST VIEW: Google Form & Application */}
        {status === "guest" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                Apply for MedHack 2026
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
                Submit your application below. 
              </p>
            </div>

            <div className="mx-auto max-w-4xl space-y-12">
              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 p-4 sm:p-10 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="aspect-[1/1] sm:aspect-[16/9] w-full bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700 relative overflow-hidden">
                    <div className="text-center p-6">
                      <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-2">[Google Form Embed Placeholder]</p>
                      <p className="text-sm text-zinc-400 dark:text-zinc-500">User populates email & details here</p>
                    </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center text-center">
                 <div className="flex items-center gap-2 mb-6">
                   <input type="checkbox" id="confirm-submit" className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600" />
                   <label htmlFor="confirm-submit" className="text-zinc-600 dark:text-zinc-400">I have submitted the Google Form above</label>
                 </div>
                 <button
                  onClick={handleLoginAndApply}
                  className="rounded-full bg-indigo-600 px-12 py-4 text-base font-bold text-white shadow-lg hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all hover:scale-105"
                >
                  Login & Complete Application
                </button>
                <p className="mt-4 text-xs text-zinc-500">
                  This will create your account and link your application.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. PENDING VIEW: Status Dashboard */}
        {status === "pending" && (
           <div className="mx-auto max-w-2xl text-center py-16 animate-in zoom-in-95 duration-500">
              <div className="mb-6 flex justify-center">
                <div className="h-20 w-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-yellow-600 dark:text-yellow-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Application Under Review
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
                Thanks for applying! Our team is reviewing your eligibility. We will notify you via email once a decision has been made.
              </p>
              <div className="mt-8 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 inline-block text-left text-sm text-zinc-500">
                <p><strong>Status:</strong> <span className="text-yellow-600 dark:text-yellow-500 font-semibold">Pending Review</span></p>
                <p><strong>Applied:</strong> {new Date().toLocaleDateString()}</p>
              </div>
           </div>
        )}

        {/* 3. APPROVED VIEW: Ticket Tailor Widget */}
        {status === "approved" && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="mx-auto max-w-2xl text-center mb-16">
                 <div className="mb-6 flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-green-600 dark:text-green-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                  Congratulations! You're In.
                </h2>
                <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
                  Your application has been approved. Secure your ticket below to confirm your spot.
                </p>
              </div>

               <div className="mx-auto max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden">
                   <div className="bg-indigo-600 px-6 py-4">
                      <h3 className="text-white font-semibold">Official Ticket Counter</h3>
                   </div>
                   <div className="p-10 text-center">
                      <div className="p-12 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-black/20">
                          <p className="text-zinc-500 dark:text-zinc-400 italic mb-4">[Ticket Tailor Widget Loads Here]</p>
                          <button 
                            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-md font-semibold hover:opacity-90"
                            onClick={() => alert("Launching Ticket Tailor Checkout...")}
                          >
                             Purchase Ticket ($25)
                          </button>
                      </div>
                   </div>
               </div>
           </div>
        )}

      </div>
    </section>
  );
}
