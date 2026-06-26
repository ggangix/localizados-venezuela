"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { SiFacebook, SiTelegram, SiWhatsapp, SiX } from "react-icons/si";
import { analytics } from "@/lib/analytics";

type Variant = "full" | "compact" | "sticky";

type ShareButtonsProps = {
  url: string;
  title: string;
  text: string;
  variant?: Variant;
  label?: string;
  contentType?: string;
};

function encode(u: string) {
  return encodeURIComponent(u);
}

export function ShareButtons({
  url,
  title,
  text,
  variant = "full",
  label = "Compartir",
  contentType = "page",
}: ShareButtonsProps) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
  }, []);

  const shareMessage = `${text} ${url}`;

  const trackShare = useCallback(
    (method: Parameters<typeof analytics.share>[0]["method"]) => {
      analytics.share({ method, contentType, variant });
    },
    [contentType, variant]
  );

  const nativeShare = useCallback(async () => {
    trackShare("native");
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error(err);
      }
    }
  }, [title, text, url, trackShare]);

  const copyLink = useCallback(async () => {
    trackShare("copy");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia este enlace:", url);
    }
  }, [url, trackShare]);

  const channels = [
    {
      name: "WhatsApp",
      method: "whatsapp" as const,
      href: `https://wa.me/?text=${encode(shareMessage)}`,
      icon: SiWhatsapp,
      className: "bg-[#25D366] text-white hover:bg-[#20bd5a]",
    },
    {
      name: "Telegram",
      method: "telegram" as const,
      href: `https://t.me/share/url?url=${encode(url)}&text=${encode(text)}`,
      icon: SiTelegram,
      className: "bg-[#26A5E4] text-white hover:bg-[#1e95d0]",
    },
    {
      name: "X",
      method: "x" as const,
      href: `https://twitter.com/intent/tweet?text=${encode(text)}&url=${encode(url)}`,
      icon: SiX,
      className: "bg-slate-900 text-white hover:bg-slate-800",
    },
    {
      name: "Facebook",
      method: "facebook" as const,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encode(url)}`,
      icon: SiFacebook,
      className: "bg-[#1877F2] text-white hover:bg-[#166fe5]",
    },
  ];

  const iconBtn =
    "inline-flex h-11 min-w-11 items-center justify-center rounded-xl transition active:scale-95";

  if (variant === "compact") {
    return (
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {canNativeShare && (
          <button
            type="button"
            onClick={() => void nativeShare()}
            className={`${iconBtn} bg-brand-600 text-white hover:bg-brand-700`}
            aria-label="Compartir"
          >
            <Share2 className="h-4 w-4" />
          </button>
        )}
        <a
          href={channels[0].href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackShare(channels[0].method)}
          className={`${iconBtn} ${channels[0].className}`}
          aria-label="WhatsApp"
        >
          <SiWhatsapp className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={() => void copyLink()}
          className={`${iconBtn} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
          aria-label="Copiar enlace"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }

  const wrapperClass =
    variant === "sticky"
      ? "fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";

  return (
    <section className={wrapperClass} aria-label={label}>
      {variant !== "sticky" && (
        <h2 className="mb-3 text-sm font-semibold text-slate-700">{label}</h2>
      )}

      {canNativeShare && (
        <button
          type="button"
          onClick={() => void nativeShare()}
          className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-base font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
        >
          <Share2 className="h-5 w-5" />
          Compartir
        </button>
      )}

      <div
        className={
          variant === "sticky"
            ? "grid grid-cols-5 gap-2"
            : "grid grid-cols-2 gap-2 sm:grid-cols-4"
        }
      >
        {channels.map(({ name, method, href, icon: Icon, className: channelClass }) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackShare(method)}
            className={`${iconBtn} flex-col gap-0.5 px-2 ${channelClass} ${
              variant === "sticky" ? "h-14 min-w-0 flex-1" : "h-12 w-full"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {variant !== "sticky" && (
              <span className="text-[10px] font-medium leading-none">{name}</span>
            )}
          </a>
        ))}
        <button
          type="button"
          onClick={() => void copyLink()}
          className={`${iconBtn} flex-col gap-0.5 border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 ${
            variant === "sticky" ? "h-14 min-w-0 flex-1" : "h-12 w-full"
          }`}
        >
          {copied ? (
            <Check className="h-5 w-5 text-emerald-600" />
          ) : (
            <Copy className="h-5 w-5" />
          )}
          {variant !== "sticky" && (
            <span className="text-[10px] font-medium leading-none">
              {copied ? "¡Copiado!" : "Copiar"}
            </span>
          )}
        </button>
      </div>
    </section>
  );
}
