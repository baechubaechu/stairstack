import ControlCard from "@/components/game/ControlCard";
import MouseDiagram from "@/components/game/diagrams/MouseDiagram";
import KeyboardDiagram from "@/components/game/diagrams/KeyboardDiagram";
import RotationDiagram from "@/components/game/diagrams/RotationDiagram";
import TurnBackDiagram from "@/components/game/diagrams/TurnBackDiagram";
import FaceTurnCard from "@/components/game/FaceTurnCard";
import { ROTATE_STEP_DEG } from "@/lib/game/constants";
import { useLang } from "@/lib/i18n";

// The four control cards — mouse, keyboard, turning the face, a refused turn — shown on the start
// screen and again in the pause menu.
export default function ControlsGuide({ className = "" }) {
  const { t } = useLang();
  const mouse = [
    { key: t("controls.aim"), text: t("controls.aimText") },
    { key: t("controls.rotate"), text: t("controls.rotateText", { deg: ROTATE_STEP_DEG }) },
    { key: t("controls.drop"), text: t("controls.dropText") },
  ];
  const keys = [
    { key: t("controls.walk"), text: t("controls.walkText") },
    { key: t("controls.jump"), text: t("controls.jumpText") },
    { key: t("controls.pause"), text: t("controls.pauseText") },
  ];
  return (
    <div className={`grid gap-3 md:grid-cols-2 xl:grid-cols-4 ${className}`}>
      <ControlCard title={t("controls.mouse")} diagram={<MouseDiagram />} items={mouse} />
      <ControlCard title={t("controls.keyboard")} diagram={<KeyboardDiagram />} items={keys} />
      <FaceTurnCard title={t("controls.turn")} diagram={<RotationDiagram />} footnote={t("controls.turnFoot")}>
        {t("controls.turnText")}
      </FaceTurnCard>
      <FaceTurnCard title={t("controls.refused")} diagram={<TurnBackDiagram />} footnote={t("controls.refusedFoot")}>
        {t("controls.refusedText")}
      </FaceTurnCard>
    </div>
  );
}
