"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import IconButton from "@uiKit/IconButton";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import SettingsDialog from "./SettingsDialog";

export default function AppSettings() {
  const { data, isError } = useSettings();
  const updateSettings = useUpdateSettings();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const configured = data?.openaiApiKeyConfigured === true;

  function openDialog() {
    setApiKey("");
    setError(null);
    setNotice(null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
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
    <>
      <div className="fixed top-6 right-6 z-50">
        <IconButton
          aria-label={configured ? "Settings, API key saved" : "Settings"}
          className={configured ? "text-purple-400" : "text-zinc-400"}
          size="md"
          type="button"
          variant="secondary"
          onClick={openDialog}
        >
          <Settings size={20} />
        </IconButton>
      </div>
      <SettingsDialog
        apiKey={apiKey}
        configured={configured}
        error={error}
        hint={data?.openaiApiKeyHint}
        isPending={updateSettings.isPending}
        loadFailed={isError}
        notice={notice}
        open={open}
        onApiKeyChange={handleApiKeyChange}
        onClear={() => void clear()}
        onClose={close}
        onSave={() => void save()}
      />
    </>
  );
}
