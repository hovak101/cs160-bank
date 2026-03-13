import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[92vh] text-center px-4 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(174_72%_42%_/_0.12),transparent_70%)]">
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
          <span className="text-foreground">Your Money,</span>
          <br />
          <span className="bg-gradient-to-r from-teal-400 to-teal-300 bg-clip-text text-transparent">
            Reimagined.
          </span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl">
          FDIC-insured banking built for how you actually live. Instant
          notifications, zero hidden fees, and accounts that work as hard as you
          do.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button size="lg" asChild>
            <Link href="/auth/sign-up">
              Open Account <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
          <span>FDIC Insured · No hidden fees · 2-minute setup</span>
        </div>
      </div>
    </section>
  );
}
