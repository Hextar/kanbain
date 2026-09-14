"use client";

import { useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectLocale } from "@/store/prefsSlice";
import {
  DATE_FNS_LOCALE,
  translate,
  type MessageKey,
  type TFunction,
  type Vars,
} from "./translate";

export type { MessageKey, Messages, TFunction, Vars } from "./translate";
export { DATE_FNS_LOCALE, translate } from "./translate";

export function useT(): TFunction {
  const locale = useAppSelector(selectLocale);
  return useCallback(
    (key: MessageKey, vars?: Vars) => translate(locale, key, vars),
    [locale],
  );
}

export function useDateLocale() {
  return DATE_FNS_LOCALE[useAppSelector(selectLocale)];
}

export function useLocale() {
  return useAppSelector(selectLocale);
}
