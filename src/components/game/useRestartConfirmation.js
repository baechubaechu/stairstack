import { useEffect, useState } from "react";

export default function useRestartConfirmation(onRestart, active = true) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return undefined;
    const id = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(id);
  }, [confirming]);
  useEffect(() => { setConfirming(false); }, [active]);

  const requestRestart = () => {
    if (active && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onRestart();
  };
  return { confirming, requestRestart };
}
