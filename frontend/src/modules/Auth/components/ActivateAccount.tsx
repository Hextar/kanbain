"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@uiKit/Card";
import { FormMessage } from "@uiKit/Field";
import { activateAccount } from "../api/session";

type ActivateAccountProps = {
  token: string;
};

export default function ActivateAccount({ token }: ActivateAccountProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(
    token ? null : "This activation link is missing or invalid.",
  );

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
        setError(
          caught instanceof Error
            ? caught.message
            : "This activation link is invalid or has expired.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return (
    <Card className="w-full max-w-md" size="md">
      <h1 className="text-lg font-semibold text-white">Activate account</h1>
      {error ? (
        <>
          <FormMessage className="mt-4">{error}</FormMessage>
          <p className="mt-5 text-center text-sm text-zinc-500">
            <Link className="cursor-pointer text-purple-300 hover:text-purple-200" href="/login">
              Back to sign in
            </Link>
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">Confirming your email…</p>
      )}
    </Card>
  );
}
