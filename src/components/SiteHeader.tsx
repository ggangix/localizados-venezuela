import Link from "next/link";
import { Search } from "lucide-react";
import { DesktopNav } from "@/components/DesktopNav";
import { MobileNav } from "@/components/MobileNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl text-base font-bold text-brand-900 outline-none transition-colors hover:text-brand-700 focus:ring-4 focus:ring-brand-200 sm:text-lg"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Search className="h-5 w-5" aria-hidden="true" />
            </span>
            Localizados VE
          </Link>
          <DesktopNav />
        </div>
        <MobileNav />
      </div>
    </header>
  );
}
