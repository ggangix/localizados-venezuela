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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
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
  const isMobile = useIsMobile();

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
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg transition active:scale-95";
  const iconSize = "h-3.5 w-3.5";
  const stickyIconSize = "h-4 w-4";

  if (variant === "compact") {
    const showMobileMinimal = isMobile && canNativeShare;

    return (
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {showMobileMinimal ? (
          <button
            type="button"
            onClick={() => void nativeShare()}
            className={`${iconBtn} bg-brand-600 text-white hover:bg-brand-700`}
            aria-label="Compartir"
          >
            <Share2 className={iconSize} />
          </button>
        ) : (
          <>
            {canNativeShare && !isMobile && (
              <button
                type="button"
                onClick={() => void nativeShare()}
                className={`${iconBtn} bg-brand-600 text-white hover:bg-brand-700`}
                aria-label="Compartir"
              >
                <Share2 className={iconSize} />
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
              <SiWhatsapp className={iconSize} />
            </a>
            <button
              type="button"
              onClick={() => void copyLink()}
              className={`${iconBtn} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
              aria-label="Copiar enlace"
            >
              {copied ? (
                <Check className={`${iconSize} text-emerald-600`} />
              ) : (
                <Copy className={iconSize} />
              )}
            </button>
          </>
        )}
      </div>
    );
  }

  const wrapperClass =
    variant === "sticky"
      ? "fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      : "rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4";

  return (
    <section className={wrapperClass} aria-label={label}>
      {variant !== "sticky" && (
        <h2 className="mb-3 text-sm font-semibold text-slate-700">{label}</h2>
      )}

      {canNativeShare && (
        <button
          type="button"
          onClick={() => void nativeShare()}
          className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] sm:h-12 sm:text-base"
        >
          <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
          Compartir
        </button>
      )}

      <div
        className={
          variant === "sticky"
            ? "grid grid-cols-5 gap-1.5"
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
              variant === "sticky" ? "h-11 min-w-0 flex-1" : "h-10 w-full sm:h-12"
            }`}
          >
            <Icon
              className={`shrink-0 ${variant === "sticky" ? stickyIconSize : "h-4 w-4 sm:h-5 sm:w-5"}`}
            />
            {variant !== "sticky" && (
              <span className="text-[10px] font-medium leading-none">{name}</span>
            )}
          </a>
        ))}
        <button
          type="button"
          onClick={() => void copyLink()}
          className={`${iconBtn} flex-col gap-0.5 border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 ${
            variant === "sticky" ? "h-11 min-w-0 flex-1" : "h-10 w-full sm:h-12"
          }`}
        >
          {copied ? (
            <Check
              className={`text-emerald-600 ${variant === "sticky" ? stickyIconSize : "h-4 w-4 sm:h-5 sm:w-5"}`}
            />
          ) : (
            <Copy
              className={
                variant === "sticky" ? stickyIconSize : "h-4 w-4 sm:h-5 sm:w-5"
              }
            />
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
