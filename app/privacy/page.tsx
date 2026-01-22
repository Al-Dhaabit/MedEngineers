import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function PrivacyPolicy() {
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
                        Privacy Policy
                    </h1>
                    <p className="text-gray-400 mb-12 text-lg">
                        Effective Date: January 22, 2026
                    </p>

                    <div className="space-y-12 text-gray-300">
                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">1) Overview</h2>
                            <p className="leading-relaxed">
                                MedHack (“we,” “us,” or “our”) provides a website that allows users to register for the MedHack event by submitting a Google Form embedded on our site. To submit the form, users must sign in with their Google account.
                            </p>
                            <p className="leading-relaxed mt-4">
                                This Privacy Policy explains how MedHack accesses, uses, and shares information, including any Google user data obtained through Google APIs.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">2) Information We Collect</h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-medium text-white mb-2">A. Google Account Sign-In (Google OAuth)</h3>
                                    <p className="leading-relaxed">
                                        When you sign in with Google to register, Google provides MedHack with limited information necessary for authentication, such as:
                                    </p>
                                    <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                                        <li>Google account identifier</li>
                                        <li>Basic profile information (name and email) only if requested by the OAuth scope</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-white mb-2">B. Form Responses</h3>
                                    <p className="leading-relaxed">
                                        Your registration details are submitted directly to Google Forms and stored under the form owner’s Google account. MedHack does not store these responses on its own servers.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-white mb-2">C. Technical/Log Data</h3>
                                    <p className="leading-relaxed">
                                        We may collect minimal technical data (timestamps, request metadata) solely to ensure the registration process works correctly and to prevent duplicate submissions.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">3) How We Use Information</h2>
                            <p className="leading-relaxed mb-4">Information is used only to:</p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-400">
                                <li>Authenticate users for registration via Google Sign-In</li>
                                <li>Submit and verify registration through the embedded Google Form</li>
                                <li>Ensure proper functioning and security of the registration process</li>
                            </ul>
                            <p className="leading-relaxed mt-4">
                                MedHack does not use Google user data for advertising, profiling, or selling.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">4) Google User Data and Limited Use</h2>
                            <p className="leading-relaxed mb-4">
                                MedHack complies with Google’s API Services User Data Policy, including Limited Use requirements:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-400">
                                <li>Google user data is accessed only to enable registration through Google Sign-In</li>
                                <li>We do not serve ads using Google user data</li>
                                <li>We do not sell or transfer Google user data for unrelated purposes</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">5) Data Storage</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                                    <h3 className="font-semibold text-white mb-2">MedHack servers</h3>
                                    <p className="text-sm text-gray-400">
                                        Only minimal session/authentication data (e.g., temporary tokens) may be stored temporarily to complete the registration flow.
                                    </p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                                    <h3 className="font-semibold text-white mb-2">Google Forms</h3>
                                    <p className="text-sm text-gray-400">
                                        All registration responses are stored securely in Google’s infrastructure, under the form owner’s account.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">6) Sharing and Disclosure</h2>
                            <p className="leading-relaxed mb-4">
                                We do not share your Google user data with third parties for marketing purposes. Data may only be shared:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-400">
                                <li>With Google, to authenticate and submit registration</li>
                                <li>With service providers supporting MedHack’s website infrastructure (limited technical access only)</li>
                                <li>If required by law or to protect safety and security</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">7) Required Google Sign-In</h2>
                            <p className="leading-relaxed">
                                To register for MedHack, you must sign in with a Google account. Users who do not sign in will be unable to access the registration form and will not be registered for the event.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">8) Data Retention</h2>
                            <ul className="list-disc pl-5 space-y-2 text-gray-400">
                                <li><strong className="text-white">Session/authentication data:</strong> retained only as long as needed to complete the registration process</li>
                                <li><strong className="text-white">Form responses:</strong> stored by Google according to the form owner’s settings</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">9) Children’s Privacy</h2>
                            <p className="leading-relaxed">
                                MedHack is not intended for children under 13. We do not knowingly collect information from children under 13.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">10) International Users</h2>
                            <p className="leading-relaxed">
                                By accessing MedHack from outside the country of operation, you acknowledge that your information may be processed in other jurisdictions where Google operates.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">11) Changes to This Policy</h2>
                            <p className="leading-relaxed">
                                We may update this Privacy Policy at any time. The “Effective Date” will be updated whenever changes are posted.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">12) Contact</h2>
                            <p className="leading-relaxed">
                                For questions about this Privacy Policy or data handling, contact:{" "}
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
