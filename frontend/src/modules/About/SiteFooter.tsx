"use client";

import { useState } from "react";
import AboutDialog from "./AboutDialog";
import ProfileLinks from "./ProfileLinks";

const textClass =
  "cursor-pointer border-0 bg-transparent p-0 text-xs text-zinc-500 hover:text-white focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none";

export default function SiteFooter() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <footer className="shrink-0 border-t border-white/5 bg-[#12141c] px-4">
      <nav
        aria-label="About, privacy, and profiles"
        className="mx-auto flex h-10 max-w-3xl items-center justify-center gap-x-4 text-xs"
      >
        <button
          className={textClass}
          type="button"
          onClick={() => setAboutOpen(true)}
        >
          About
        </button>
        <button
          className={textClass}
          type="button"
          onClick={() => setAboutOpen(true)}
        >
          Privacy
        </button>
        <ProfileLinks className="text-xs text-zinc-500 hover:text-white" />
      </nav>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </footer>
  );
}
