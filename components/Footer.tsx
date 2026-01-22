import Link from "next/link";

export function Footer() {
    return (
        <footer className="w-full py-8 px-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <Link href="/" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        MedHack
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                        &copy; {new Date().getFullYear()} MedHack. All rights reserved.
                    </p>
                </div>

                <div className="flex flex-col md:items-end gap-2">
                    <h3 className="text-[10px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-1">
                        Legal
                    </h3>
                    <div className="flex flex-col md:flex-row gap-3 md:gap-6">
                        <Link
                            href="/privacy"
                            className="text-xs text-zinc-600 hover:text-[var(--brand-teal)] dark:text-zinc-400 dark:hover:text-[var(--brand-teal)] transition-colors"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="/terms"
                            className="text-xs text-zinc-600 hover:text-[var(--brand-teal)] dark:text-zinc-400 dark:hover:text-[var(--brand-teal)] transition-colors"
                        >
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
