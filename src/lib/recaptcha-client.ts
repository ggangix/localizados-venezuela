export const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ??
  "6LdGKTYtAAAAAMYmSkp2uNbq0VrPCoMJQgJUwWw9";

const RECAPTCHA_ACTION = "contribuir";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export function loadRecaptchaScript(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector('script[data-recaptcha="v3"]')) return;

  const script = document.createElement("script");
  script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
  script.async = true;
  script.dataset.recaptcha = "v3";
  document.head.appendChild(script);
}

export async function getRecaptchaToken(): Promise<string> {
  await waitForRecaptcha();

  return new Promise((resolve, reject) => {
    window.grecaptcha!.ready(async () => {
      try {
        const token = await window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, {
          action: RECAPTCHA_ACTION,
        });
        resolve(token);
      } catch (err) {
        reject(err);
      }
    });
  });
}

function waitForRecaptcha(timeoutMs = 10_000): Promise<void> {
  if (window.grecaptcha) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.grecaptcha) {
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error("reCAPTCHA no cargó a tiempo"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}
