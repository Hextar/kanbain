"use client";

import { useState } from "react";
import LocaleField from "@modules/Auth/components/LocaleField";
import { useT } from "@/i18n";
import AboutDialog from "./AboutDialog";
import ProfileLinks from "./ProfileLinks";

const textClass =
  "cursor-pointer border-0 bg-transparent p-0 text-xs text-zinc-500 hover:text-white focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none";

export default function SiteFooter() {
  const t = useT();
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <footer className="shrink-0 border-t border-fg/5 bg-canvas px-4">
      <nav
        aria-label={t("about.privacyNav")}
        className="mx-auto flex h-auto min-h-10 max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 py-1 text-xs"
      >
        <div className="shrink-0 [&>div]:px-0 [&>div]:py-0">
          <LocaleField />
        </div>
        <button
          className={textClass}
          type="button"
          onClick={() => setAboutOpen(true)}
        >
          {t("about.title")}
        </button>
        <button
          className={textClass}
          type="button"
          onClick={() => setAboutOpen(true)}
        >
          {t("about.privacy")}
        </button>
        <ProfileLinks className="text-xs text-zinc-500 hover:text-white" />
      </nav>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </footer>
  );
}
