"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Settings } from "lucide-react";
import IconButton from "@uiKit/IconButton";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import SettingsDialog from "./SettingsDialog";

type OpenSettingsOptions = {
  forPlanner?: boolean;
};

type SettingsDialogContextValue = {
  openSettings: (options?: OpenSettingsOptions) => void;
};

const SettingsDialogContext = createContext<SettingsDialogContextValue | null>(
  null,
);

export function useSettingsDialog() {
  const context = useContext(SettingsDialogContext);
  if (!context) {
    throw new Error("useSettingsDialog must be used within SettingsProvider");
  }
  return context;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data, isError } = useSettings();
  const updateSettings = useUpdateSettings();
  const [open, setOpen] = useState(false);
  const [forPlanner, setForPlanner] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const configured = data?.openaiApiKeyConfigured === true;
  const revoked = data?.openaiApiKeyRevoked === true;

  const openSettings = useCallback((options?: OpenSettingsOptions) => {
    setForPlanner(options?.forPlanner === true);
    setApiKey("");
    setError(null);
    setNotice(null);
    setOpen(true);
  }, []);

  function close() {
    setOpen(false);
    setForPlanner(false);
    setApiKey("");
    setError(null);
    setNotice(null);
  }

  function handleApiKeyChange(value: string) {
    setApiKey(value);
    setError(null);
    setNotice(null);
  }

  async function save() {
    setError(null);
    try {
      await updateSettings.mutateAsync(apiKey.trim());
      if (forPlanner) {
        close();
        return;
      }
      setApiKey("");
      setNotice("API key saved.");
    } catch {
      setNotice(null);
      setError("Could not save the API key.");
    }
  }

  async function clear() {
    setError(null);
    try {
      await updateSettings.mutateAsync(null);
      setApiKey("");
      setNotice("API key removed. Paste a new one to save it.");
    } catch {
      setNotice(null);
      setError("Could not remove the API key.");
    }
  }

  return (
    <SettingsDialogContext.Provider value={{ openSettings }}>
      <div className="fixed top-6 right-6 z-50">
        <IconButton
          aria-label={configured ? "Settings, API key saved" : "Settings"}
          className={configured ? "text-purple-400" : "text-zinc-400"}
          size="md"
          type="button"
          variant="secondary"
          onClick={() => openSettings()}
        >
          <Settings size={20} />
        </IconButton>
      </div>
      <SettingsDialog
        apiKey={apiKey}
        configured={configured}
        error={error}
        forPlanner={forPlanner}
        hint={data?.openaiApiKeyHint}
        isPending={updateSettings.isPending}
        loadFailed={isError}
        notice={notice}
        open={open}
        revoked={revoked}
        onApiKeyChange={handleApiKeyChange}
        onClear={() => void clear()}
        onClose={close}
        onSave={() => void save()}
      />
      {children}
    </SettingsDialogContext.Provider>
  );
}
