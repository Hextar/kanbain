"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@uiKit/Card";
import { FormMessage } from "@uiKit/Field";
import { useT } from "@/i18n";
import { activateAccount } from "../api/session";

type ActivateAccountProps = {
  token: string;
};

export default function ActivateAccount({ token }: ActivateAccountProps) {
  const t = useT();
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const missingToken = token.length === 0;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void activateAccount(token)
      .then(() => {
        if (cancelled) return;
        router.push("/");
        router.refresh();
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setFailed(true);
        setApiError(caught instanceof Error ? caught.message : null);
      });
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  const message = missingToken
    ? t("auth.activateMissing")
    : failed
      ? (apiError ?? t("auth.activateInvalid"))
      : null;

  return (
    <Card className="w-full max-w-md" size="md">
      <h1 className="text-lg font-semibold text-white">{t("auth.activateTitle")}</h1>
      {message ? (
        <>
          <FormMessage className="mt-4">{message}</FormMessage>
          <p className="mt-5 text-center text-sm text-zinc-500">
            <Link className="cursor-pointer text-purple-300 hover:text-purple-200" href="/login">
              {t("auth.backToSignIn")}
            </Link>
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">{t("auth.confirmingEmail")}</p>
      )}
    </Card>
  );
}
