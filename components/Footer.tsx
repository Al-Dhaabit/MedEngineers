import Link from "next/link";

export function Footer() {
    return (
        <footer className="w-full py-4 px-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <div className="max-w-7xl mx-auto flex flex-row justify-between items-center">
                <div className="flex items-center gap-2">
                    <Link href="/" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        MedHack
                    </Link>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        &copy; {new Date().getFullYear()} All rights reserved.
                    </p>
                </div>

                <div className="flex items-center gap-5">
                    <Link
                        href="/privacy"
                        className="text-xs text-zinc-500 hover:text-[var(--brand-teal)] dark:text-zinc-500 dark:hover:text-[var(--brand-teal)] transition-colors"
                    >
                        Privacy
                    </Link>
                    <Link
                        href="/terms"
                        className="text-xs text-zinc-500 hover:text-[var(--brand-teal)] dark:text-zinc-500 dark:hover:text-[var(--brand-teal)] transition-colors"
                    >
                        Terms
                    </Link>
                </div>
            </div>
        </footer>
    );
}
