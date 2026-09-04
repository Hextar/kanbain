"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@uiKit/Button";
import Card from "@uiKit/Card";
import { FieldLabel, FormMessage } from "@uiKit/Field";
import Input from "@uiKit/Input";
import { resetPassword } from "../api/session";

type ResetPasswordFormProps = {
  token: string;
};

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
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
      setError(caught instanceof Error ? caught.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md" size="md">
      <h1 className="text-lg font-semibold text-white">Choose a new password</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Use at least 8 characters. You will be signed in after saving.
      </p>
      {missingToken ? (
        <FormMessage className="mt-6">
          This reset link is missing or invalid.{" "}
          <Link className="cursor-pointer text-purple-300 hover:text-purple-200" href="/forgot-password">
            Request a new one
          </Link>
          .
        </FormMessage>
      ) : (
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="password">New password</FieldLabel>
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
            {pending ? "Saving…" : "Save password"}
          </Button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-zinc-500">
        <Link className="cursor-pointer text-purple-300 hover:text-purple-200" href="/login">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
