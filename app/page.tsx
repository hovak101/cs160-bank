import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { FeaturesBar } from "@/components/landing/features-bar";
import { ProductCards } from "@/components/landing/product-cards";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <FeaturesBar />
        <ProductCards />
      </main>
      <Footer />
    </div>
  );
}
