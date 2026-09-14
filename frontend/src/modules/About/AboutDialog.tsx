"use client";

import { useId } from "react";
import Dialog, { DialogPanel } from "@uiKit/Dialog";
import { useT } from "@/i18n";
import ProfileLinks from "./ProfileLinks";
import { DEVELOPER } from "./site";

type AboutDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function AboutDialog({ open, onClose }: AboutDialogProps) {
  const t = useT();
  const descriptionId = useId();

  return (
    <Dialog
      className="max-w-md"
      descriptionId={descriptionId}
      eyebrow="KanbAIn"
      footer={
        <ProfileLinks className="text-sm text-purple-300 hover:text-purple-200" />
      }
      open={open}
      title={t("about.title")}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-zinc-400" id={descriptionId}>
          {t("about.tagline")}
        </p>
        <DialogPanel title={t("about.developer")}>
          <div className="flex gap-3">
            <img
              alt={DEVELOPER.name}
              className="size-12 shrink-0 rounded-2xl object-cover"
              height={48}
              src={DEVELOPER.avatar}
              width={48}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{DEVELOPER.name}</p>
              <p className="text-sm text-zinc-400">{t("about.role")}</p>
              <p className="text-xs text-zinc-500">{DEVELOPER.location}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {t("about.bio")}
          </p>
        </DialogPanel>
        <DialogPanel title={t("about.privacy")}>
          <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-zinc-400">
            <p>{t("about.privacy1", { name: DEVELOPER.name })}</p>
            <p>{t("about.privacy2")}</p>
            <p>{t("about.privacy3")}</p>
            <p>{t("about.privacy4")}</p>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
