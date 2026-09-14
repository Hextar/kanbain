import { de as deDate, es as esDate, fr as frDate, it as itDate, enUS } from "date-fns/locale";
import type { Locale } from "@/store/persist";
import { en, type Messages } from "./en";
import { de } from "./de";
import { es } from "./es";
import { fr } from "./fr";
import { it } from "./it";

export type { Messages };
export type Vars = Record<string, string | number>;
export type MessageKey = NestedKeyOf<Messages>;
export type TFunction = (key: MessageKey, vars?: Vars) => string;

type NestedKeyOf<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : `${K}.${NestedKeyOf<T[K]>}`;
    }[keyof T & string];

const catalogs: Record<Locale, Messages> = { en, it, fr, es, de };

export const DATE_FNS_LOCALE = {
  en: enUS,
  it: itDate,
  fr: frDate,
  es: esDate,
  de: deDate,
} as const;

function lookup(tree: unknown, path: string): string | undefined {
  let current: unknown = tree;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (full, name: string) =>
    vars[name] === undefined ? full : String(vars[name]),
  );
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Vars,
): string {
  const raw =
    lookup(catalogs[locale], key) ?? lookup(catalogs.en, key) ?? key;
  return interpolate(raw, vars);
}
