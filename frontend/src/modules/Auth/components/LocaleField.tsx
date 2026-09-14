"use client";

import { useId } from "react";
import ButtonGroup, { ButtonGroupItem } from "@uiKit/ButtonGroup";
import { FieldLabel } from "@uiKit/Field";
import { useT } from "@/i18n";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { LOCALES, type Locale } from "@/store/persist";
import { selectLocale, setLocale } from "@/store/prefsSlice";

function languageName(code: Locale) {
  return new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
}

export default function LocaleField() {
  const t = useT();
  const locale = useAppSelector(selectLocale);
  const dispatch = useAppDispatch();
  const labelId = useId();

  return (
    <div className="flex flex-col gap-1.5 px-2 py-1.5">
      <FieldLabel id={labelId}>{t("locale.label")}</FieldLabel>
      <ButtonGroup aria-labelledby={labelId} className="w-full" size="xs">
        {LOCALES.map((value) => (
          <ButtonGroupItem
            key={value}
            aria-label={languageName(value)}
            className="cursor-pointer uppercase"
            grow
            selected={locale === value}
            size="xs"
            onClick={() => dispatch(setLocale(value))}
          >
            {value}
          </ButtonGroupItem>
        ))}
      </ButtonGroup>
    </div>
  );
}
