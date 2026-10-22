import { useSpeech } from "@/components/game/speech";
import { useLang } from "@/lib/i18n";

// The foreman's radio, as a subtitle along the bottom of the plan — the player is the one up in
// the crane, so their side of the conversation runs under their own view.
export default function BossSubtitle() {
  const { t } = useLang();
  const line = useSpeech("boss");
  if (!line) return null;
  return (
    <div data-testid="boss-subtitle" className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
      <p className="max-w-[90%] rounded bg-black/75 px-3 py-1.5 text-center text-[14px] leading-snug text-white shadow-lg">
        <span className="mr-2 font-mono text-[11px] font-bold text-[#f5b04a]">{t("talk.boss")}</span>
        {line}
      </p>
    </div>
  );
}
