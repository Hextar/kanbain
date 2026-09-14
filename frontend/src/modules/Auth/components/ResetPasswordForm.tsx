"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@uiKit/Button";
import Card from "@uiKit/Card";
import { FieldLabel, FormMessage } from "@uiKit/Field";
import Input from "@uiKit/Input";
import { useT } from "@/i18n";
import { resetPassword } from "../api/session";

type ResetPasswordFormProps = {
  token: string;
};

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const t = useT();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const missingToken = token.length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await resetPassword(token, password);
      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t("common.somethingWentWrong"),
      );
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md" size="md">
      <h1 className="text-lg font-semibold text-white">{t("auth.resetTitle")}</h1>
      <p className="mt-1 text-sm text-zinc-500">{t("auth.resetBody")}</p>
      {missingToken ? (
        <FormMessage className="mt-6">
          {t("auth.resetMissing")}{" "}
          <Link className="cursor-pointer text-purple-300 hover:text-purple-200" href="/forgot-password">
            {t("auth.requestNewLink")}
          </Link>
        </FormMessage>
      ) : (
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="password">{t("auth.newPassword")}</FieldLabel>
            <Input
              autoComplete="new-password"
              autoFocus
              id="password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button disabled={pending} type="submit">
            {pending ? t("common.saving") : t("auth.savePassword")}
          </Button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-zinc-500">
        <Link className="cursor-pointer text-purple-300 hover:text-purple-200" href="/login">
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </Card>
  );
}
