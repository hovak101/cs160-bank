import { ShieldCheck, Bell, Globe } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Bank-Grade Security",
    description: "256-bit encryption and real-time fraud monitoring protect every transaction.",
  },
  {
    icon: Bell,
    title: "Instant Notifications",
    description: "Know the moment money moves with push alerts and SMS.",
  },
  {
    icon: Globe,
    title: "Accepted Worldwide",
    description: "Use your card at 40 million locations across 200+ countries.",
  },
];

export function FeaturesBar() {
  return (
    <section className="border-y border-charcoal-700 bg-charcoal-900/50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col gap-3">
              <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 w-fit">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
