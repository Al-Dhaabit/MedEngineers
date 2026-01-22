import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function TermsOfService() {
    return (
        <main className="min-h-screen bg-background text-foreground py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--brand-teal)] opacity-5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[var(--brand-teal)] opacity-5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm text-[var(--brand-teal)] hover:text-white transition-colors duration-200 group"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>
                </div>

                <div className="border border-white/10 bg-black/20 backdrop-blur-xl rounded-2xl p-8 md:p-12 shadow-2xl">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Terms of Service
                    </h1>
                    <p className="text-gray-400 mb-12 text-lg">
                        Effective Date: January 22, 2026
                    </p>

                    <div className="space-y-12 text-gray-300">
                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">1) Acceptance of Terms</h2>
                            <p className="leading-relaxed">
                                By accessing or using MedHack to register for the MedHack event, you agree to be bound by these Terms of Service. If you do not agree, you may not use the service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">2) Eligibility</h2>
                            <ul className="list-disc pl-5 space-y-2 text-gray-400">
                                <li>You must have a Google account to register.</li>
                                <li>Users under 13 years of age are not eligible to use this service.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">3) Google Sign-In</h2>
                            <p className="leading-relaxed">
                                Registration requires signing in with your Google account. Users who do not sign in cannot access or submit the registration form and will not be registered for the event.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">4) Use of the Service</h2>
                            <p className="leading-relaxed mb-4">
                                MedHack provides access to an embedded Google Form for event registration. All data submitted through the form is processed and stored by Google Forms under the form owner’s account.
                            </p>
                            <p className="text-white font-medium mb-2">You may not:</p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-400">
                                <li>Attempt to bypass Google authentication</li>
                                <li>Submit fraudulent or duplicate registrations</li>
                                <li>Use the service for any unlawful purpose</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">5) Data Handling</h2>
                            <p className="leading-relaxed">
                                MedHack does not store form responses. Minimal authentication/session data may be temporarily stored solely to complete the registration process. All other data is stored and managed by Google according to their Terms of Service and Privacy Policy.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">6) No Liability</h2>
                            <p className="leading-relaxed mb-4">MedHack does not assume any responsibility for:</p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-400">
                                <li>Submission errors caused by Google Forms</li>
                                <li>Data storage, security, or processing handled by Google</li>
                                <li>Registration outcomes or event participation issues</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">7) Termination</h2>
                            <p className="leading-relaxed">
                                Access may be suspended or denied if Google authentication fails, or if the service is misused.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">8) Changes to Terms</h2>
                            <p className="leading-relaxed">
                                We may update these Terms of Service at any time. The “Effective Date” will be updated when changes are posted.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">9) Contact</h2>
                            <p className="leading-relaxed">
                                For questions about these Terms, contact:{" "}
                                <a href="mailto:info@medhack.org" className="text-[var(--brand-teal)] hover:underline">
                                    info@medhack.org
                                </a>
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}
