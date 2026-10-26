import { useState } from "react";
import { Button } from "@/components/ui/button";
import { canSwitchLang, useLang } from "@/lib/i18n";

// A phone or tablet: nothing to aim with and no keys to climb with. Most visitors from a social
// post arrive this way, so they get told plainly, with the link ready to send to a computer.
export function isTouchOnly() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return !window.matchMedia("(pointer: fine)").matches && window.matchMedia("(pointer: coarse)").matches;
}

export default function MobileGate({ onDismiss }) {
  const { lang, t, setLang } = useLang();
  const [copied, setCopied] = useState(false);
  const url = typeof location !== "undefined" ? location.origin + location.pathname : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // some in-app browsers refuse the clipboard; the link is shown to copy by hand
    }
  };

  return (
    <div data-testid="mobile-gate" className="fixed inset-0 z-[60] flex items-center justify-center bg-paper px-5">
      <div className="w-full max-w-[380px] text-center">
        <p className="font-display text-xl font-semibold tracking-[0.3em] text-foreground">STAIRSTACK</p>
        <svg viewBox="0 0 64 40" className="mx-auto mt-5 h-[56px] w-[90px]" aria-hidden="true">
          <rect x="6" y="3" width="52" height="30" rx="2.5" className="fill-card stroke-slate-400" strokeWidth="1.6" />
          <path d="M2 37h60" className="stroke-slate-400" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M14 27h10v-5h8v-5h8v-5h10" className="fill-none stroke-ochre" strokeWidth="2.2" />
        </svg>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">{t("mobile.title")}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{t("mobile.lead")}</p>
        <p className="mt-4 select-all break-all rounded-md border border-border bg-card px-3 py-2 font-mono text-[12px] text-foreground">
          {url}
        </p>
        <Button className="mt-3 w-full" data-testid="mobile-copy" onClick={copy}>
          {copied ? t("mobile.copied") : t("mobile.copy")}
        </Button>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" className="font-mono text-[11px] text-muted-foreground underline" onClick={onDismiss}>
            {t("mobile.anyway")}
          </button>
          {canSwitchLang ? (
            <button
              type="button"
              className="font-mono text-[11px] text-muted-foreground underline"
              onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            >
              {t("bar.lang")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
