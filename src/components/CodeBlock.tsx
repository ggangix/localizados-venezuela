"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";

type CodeBlockProps = {
  code: string;
  /** Etiqueta opcional encima del bloque (p. ej. "Petición" o "Respuesta"). */
  caption?: string;
};

export function CodeBlock({ code, caption }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia este texto:", code);
    }
  }, [code]);

  return (
    <figure className="space-y-1">
      {caption && (
        <figcaption className="text-xs font-medium text-slate-500">
          {caption}
        </figcaption>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => void copy()}
          className="focus-visible:ring-brand-400 absolute right-2 top-2 inline-flex h-9 min-w-9 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 active:scale-95"
          aria-label={copied ? "Copiado" : "Copiar"}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              <span>¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copiar</span>
            </>
          )}
        </button>
        <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 pr-24 text-sm leading-relaxed text-slate-100">
          <code className="font-mono">{code}</code>
        </pre>
      </div>
    </figure>
  );
}
