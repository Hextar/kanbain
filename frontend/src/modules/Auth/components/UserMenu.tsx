"use client";

import { useState, type ReactNode } from "react";
import { LogOut, Settings } from "lucide-react";
import Avatar from "@uiKit/Avatar";
import PopoverPanel, { Popover } from "@uiKit/PopoverPanel";
import { useSettingsDialog } from "@modules/Settings/components/SettingsProvider";
import { useAuth } from "./AuthProvider";

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function UserMenu() {
  const { session, signOut } = useAuth();
  const { openSettings } = useSettingsDialog();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function handleOpenSettings() {
    setOpen(false);
    openSettings();
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <Popover open={open} onClose={() => setOpen(false)}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${session.user.name} account menu`}
        className="flex size-8 cursor-pointer items-center justify-center rounded-md hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Avatar
          className="bg-purple-500/20 text-purple-200"
          initials={initialsFor(session.user.name)}
        />
      </button>
      {open ? (
        <PopoverPanel className="w-64 p-1" role="menu">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-white">
              {session.user.name}
            </p>
            <p className="truncate text-xs text-zinc-500">{session.user.email}</p>
            <p className="mt-1 truncate text-xs text-zinc-600">
              {session.organization.name}
            </p>
          </div>
          <div className="my-1 h-px bg-white/8" role="separator" />
          <MenuItem
            disabled={signingOut}
            icon={<Settings aria-hidden size={14} />}
            onClick={handleOpenSettings}
          >
            Settings
          </MenuItem>
          <MenuItem
            disabled={signingOut}
            icon={<LogOut aria-hidden size={14} />}
            onClick={() => void handleSignOut()}
          >
            Sign out
          </MenuItem>
        </PopoverPanel>
      ) : null}
    </Popover>
  );
}

function MenuItem({
  children,
  disabled,
  icon,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white disabled:cursor-default disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}
