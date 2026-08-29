import { useCallback } from "react";
import { useSettingsDialog } from "../components/SettingsProvider";
import { useSettings } from "./useSettings";

export function useRequirePlannerKey() {
  const { refetch } = useSettings();
  const { openSettings } = useSettingsDialog();

  return useCallback(async () => {
    const result = await refetch();
    if (result.data?.openaiApiKeyConfigured === true) return true;
    openSettings({ forPlanner: true });
    return false;
  }, [openSettings, refetch]);
}
