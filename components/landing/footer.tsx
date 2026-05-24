import { Suspense } from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/ui/logo";
import { CurrentYear } from "./current-year";

export function Footer() {
  return (
    <footer className="border-t border-charcoal-700 bg-charcoal-950 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Logo className="h-5 w-auto" />
            <span>
              Vitality <span className="text-teal-400">Bank</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/privacy" className="px-3 hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Separator orientation="vertical" className="h-4 bg-charcoal-700" />
            <Link href="/terms" className="px-3 hover:text-foreground transition-colors">
              Terms
            </Link>
            <Separator orientation="vertical" className="h-4 bg-charcoal-700" />
            <Link href="/contact" className="px-3 hover:text-foreground transition-colors">
              Contact
            </Link>
          </nav>
        </div>

        <p className="mt-6 text-xs text-muted-foreground text-center sm:text-left">
          Vitality Bank is a financial technology company, not a bank. Banking
          services provided by partner institutions. Deposits are FDIC insured
          up to $250,000. &copy; <Suspense fallback="2025"><CurrentYear /></Suspense> Vitality Bank, Inc.
          All rights reserved.
        </p>
      </div>
    </footer>
  );
}
