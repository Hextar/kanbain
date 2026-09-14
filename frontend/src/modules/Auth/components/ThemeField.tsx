"use client";

import { useId } from "react";
import ButtonGroup, { ButtonGroupItem } from "@uiKit/ButtonGroup";
import { FieldLabel } from "@uiKit/Field";
import { useT } from "@/i18n";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { THEMES, type ThemePref } from "@/store/persist";
import { selectTheme, setTheme } from "@/store/prefsSlice";

const THEME_KEY: Record<ThemePref, "theme.dark" | "theme.light" | "theme.system"> =
  {
    dark: "theme.dark",
    light: "theme.light",
    system: "theme.system",
  };

export default function ThemeField() {
  const t = useT();
  const theme = useAppSelector(selectTheme);
  const dispatch = useAppDispatch();
  const labelId = useId();

  return (
    <div className="flex flex-col gap-1.5 px-2 py-1.5">
      <FieldLabel id={labelId}>{t("theme.label")}</FieldLabel>
      <ButtonGroup aria-labelledby={labelId} className="w-full" size="xs">
        {THEMES.map((value) => (
          <ButtonGroupItem
            key={value}
            className="cursor-pointer"
            grow
            selected={theme === value}
            size="xs"
            onClick={() => dispatch(setTheme(value))}
          >
            {t(THEME_KEY[value])}
          </ButtonGroupItem>
        ))}
      </ButtonGroup>
    </div>
  );
}
