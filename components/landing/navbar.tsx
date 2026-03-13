import Link from "next/link";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-charcoal-950/80 border-b border-charcoal-700">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <Landmark className="w-5 h-5 text-teal-400" />
          <span>
            Vitality <span className="text-teal-400">Bank</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/auth/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/sign-up">Open Account</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
