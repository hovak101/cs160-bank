import Link from "next/link";
import {
  CreditCard,
  Ban,
  Zap,
  BadgeCheck,
  Sparkles,
  Percent,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function FeatureRow({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <li className="flex items-center gap-3 text-sm text-muted-foreground">
      <Icon className="w-4 h-4 shrink-0 text-teal-400" />
      {text}
    </li>
  );
}

function CoralFeatureRow({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <li className="flex items-center gap-3 text-sm text-muted-foreground">
      <Icon className="w-4 h-4 shrink-0 text-coral-500" />
      {text}
    </li>
  );
}

export function ProductCards() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Pick your account
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Both accounts come with no monthly fees and instant setup.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Checking */}
          <Card className="bg-charcoal-800 border-charcoal-700 transition-shadow hover:shadow-[0_0_40px_-8px_hsl(174_72%_42%_/_0.25)] flex flex-col">
            <CardHeader>
              <div className="mb-2">
                <CreditCard className="w-6 h-6 text-teal-400" />
              </div>
              <CardTitle className="text-xl">Checking</CardTitle>
              <CardDescription>
                Everyday spending, zero compromise.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                <FeatureRow icon={Ban} text="No monthly fees, ever" />
                <FeatureRow icon={Zap} text="Instant transfers & direct deposit" />
                <FeatureRow icon={BadgeCheck} text="FDIC insured up to $250,000" />
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" asChild>
                <Link href="/auth/sign-up">Get Checking</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Credit */}
          <Card className="bg-charcoal-800 border-coral-500/20 shadow-[0_0_40px_-8px_hsl(12_85%_60%_/_0.15)] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Sparkles className="w-6 h-6 text-coral-500" />
                <Badge
                  variant="outline"
                  className="bg-coral-500/10 text-coral-500 border-coral-500/20"
                >
                  Earn More
                </Badge>
              </div>
              <CardTitle className="text-xl">Credit</CardTitle>
              <CardDescription>
                Rewards on every purchase, no annual fee.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                <CoralFeatureRow icon={Percent} text="2% cash back on all purchases" />
                <CoralFeatureRow icon={Ban} text="No annual fee" />
                <CoralFeatureRow icon={Zap} text="Auto bill pay from checking" />
                <CoralFeatureRow icon={BadgeCheck} text="Fraud protection & zero liability" />
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-coral-500 hover:bg-coral-400 text-white"
                asChild
              >
                <Link href="/auth/sign-up">Get Credit Card</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
