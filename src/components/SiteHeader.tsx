import Link from "next/link";
import { DesktopNav } from "@/components/DesktopNav";
import { MobileNav } from "@/components/MobileNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-base font-bold text-brand-700 sm:text-lg">
            Localizados VE
          </Link>
          <DesktopNav />
        </div>
        <MobileNav />
      </div>
    </header>
  );
}
