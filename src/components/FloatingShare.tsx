"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Share2, X } from "lucide-react";
import { SiFacebook, SiTelegram, SiWhatsapp, SiX } from "react-icons/si";
import { analytics } from "@/lib/analytics";

type Props = {
  url: string;
  title: string;
  text: string;
};

function encode(u: string) {
  return encodeURIComponent(u);
}

export function FloatingShare({ url, title, text }: Props) {
  const [open, setOpen] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  const shareMessage = `${text} ${url}`;

  const trackShare = useCallback(
    (method: Parameters<typeof analytics.share>[0]["method"]) => {
      analytics.share({ method, contentType: "site", variant: "compact" });
    },
    []
  );

  const nativeShare = useCallback(async () => {
    trackShare("native");
    setOpen(false);
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error(err);
    }
  }, [title, text, url, trackShare]);

  const copyLink = useCallback(async () => {
    trackShare("copy");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
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
      bg: "bg-[#25D366]",
    },
    {
      name: "Telegram",
      method: "telegram" as const,
      href: `https://t.me/share/url?url=${encode(url)}&text=${encode(text)}`,
      icon: SiTelegram,
      bg: "bg-[#26A5E4]",
    },
    {
      name: "X",
      method: "x" as const,
      href: `https://twitter.com/intent/tweet?text=${encode(text)}&url=${encode(url)}`,
      icon: SiX,
      bg: "bg-slate-900",
    },
    {
      name: "Facebook",
      method: "facebook" as const,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encode(url)}`,
      icon: SiFacebook,
      bg: "bg-[#1877F2]",
    },
  ];

  return (
    <div ref={containerRef} className="fixed bottom-5 right-4 z-50 md:hidden">
      {open && (
        <div className="absolute bottom-16 right-0 mb-1 w-56 rounded-2xl border border-brand-100 bg-white p-3 shadow-2xl">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Compartir este sitio
          </p>

          {canNativeShare && (
            <button
              type="button"
              onClick={() => void nativeShare()}
              className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-action-600 text-sm font-bold text-white active:bg-action-700"
            >
              <Share2 className="h-4 w-4" />
              Compartir
            </button>
          )}

          <div className="grid grid-cols-4 gap-1.5">
            {channels.map(({ name, method, href, icon: Icon, bg }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackShare(method);
                  setOpen(false);
                }}
                className={`flex h-12 w-full items-center justify-center rounded-xl text-white ${bg}`}
                aria-label={name}
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void copyLink()}
            className="mt-1.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-brand-100 bg-brand-50 text-sm font-medium text-brand-800 active:bg-brand-100"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-action-600 text-white shadow-lg transition-transform duration-200 active:scale-95"
        aria-label="Compartir este sitio"
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <Share2 className="h-6 w-6" />}
      </button>
    </div>
  );
}
