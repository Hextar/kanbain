"use client";

import { useId } from "react";
import Dialog, { DialogPanel } from "@uiKit/Dialog";
import ProfileLinks from "./ProfileLinks";
import { DEVELOPER } from "./site";

type AboutDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function AboutDialog({ open, onClose }: AboutDialogProps) {
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
      title="About"
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-zinc-400" id={descriptionId}>
          An AI-first Kanban board. You describe a project; the planner puts the
          work on the board.
        </p>
        <DialogPanel title="Developer">
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
              <p className="text-sm text-zinc-400">{DEVELOPER.role}</p>
              <p className="text-xs text-zinc-500">{DEVELOPER.location}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {DEVELOPER.bio}
          </p>
        </DialogPanel>
        <DialogPanel title="Privacy">
          <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-zinc-400">
            <p>
              A personal project run by {DEVELOPER.name}. No ads, and no selling
              of your data.
            </p>
            <p>
              An account stores your name, email, and either a password hash or
              a Google account id. Boards and the brief you type stay in your
              workspace. Sign-in uses an httpOnly session cookie.
            </p>
            <p>
              An OpenAI key saved in Settings is encrypted on the server and
              never returned to the browser. The planner sends your brief to
              OpenAI with that key. Google sign-in shares your Google email and
              name with this app.
            </p>
            <p>
              No analytics suite. Ask about your data or request deletion via
              GitHub or LinkedIn.
            </p>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
