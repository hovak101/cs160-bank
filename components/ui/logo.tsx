import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Vitality Bank brand logo. Defaults to an icon-sized mark (h-5, width auto to
 * preserve the source aspect ratio). Pass `className` to override the size,
 * e.g. <Logo className="h-4 w-auto" />.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Vitality Bank logo"
      width={162}
      height={201}
      priority
      className={cn("h-5 w-auto object-contain", className)}
    />
  );
}
