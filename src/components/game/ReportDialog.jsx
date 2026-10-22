import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { submitFeedback } from "@/lib/telemetry";

const KINDS = ["bug", "idea", "other"];

// The report form: what kind, what happened. The run it was written in goes along with it, so a
// bug report says where in the game it happened without the player having to.
export default function ReportDialog({ context, onClose }) {
  const { t } = useLang();
  const [kind, setKind] = useState("bug");
  const [message, setMessage] = useState("");
  const [state, setState] = useState("idle"); // idle · sending · sent · limited · failed · offline

  const send = async () => {
    if (!message.trim() || state === "sending") return;
    setState("sending");
    setState(await submitFeedback(kind, message.trim(), context));
  };

  const note = {
    sent: ["text-emerald-700", t("report.sent")],
    limited: ["text-rose-600", t("report.tooMany")],
    failed: ["text-rose-600", t("report.failed")],
    offline: ["text-muted-foreground", t("report.offline")],
  }[state];

  return (
    <div
      data-testid="report-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[460px] rounded-xl border border-border bg-card p-5 shadow-2xl">
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">{t("report.title")}</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{t("report.lead")}</p>

        <div className="mt-3 flex gap-2">
          {KINDS.map((k) => (
            <Button key={k} size="sm" variant={k === kind ? "default" : "outline"} onClick={() => setKind(k)}>
              {t(`report.${k}`)}
            </Button>
          ))}
        </div>

        <textarea
          data-testid="report-message"
          autoFocus
          value={message}
          maxLength={2000}
          rows={6}
          placeholder={t("report.placeholder")}
          onChange={(e) => {
            setMessage(e.target.value);
            if (state !== "idle" && state !== "sending") setState("idle");
          }}
          className="mt-3 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-ochre"
        />
        <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span className={note ? note[0] : ""}>{note ? note[1] : ""}</span>
          <span>{message.length} / 2000</span>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("report.close")}
          </Button>
          <Button
            data-testid="report-send"
            disabled={!message.trim() || state === "sending" || state === "sent"}
            onClick={send}
          >
            {state === "sending" ? t("report.sending") : t("report.send")}
          </Button>
        </div>
      </div>
    </div>
  );
}
