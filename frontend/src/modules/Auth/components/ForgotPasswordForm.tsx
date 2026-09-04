"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError } from "@api/env";
import Button from "@uiKit/Button";
import Card from "@uiKit/Card";
import { FieldLabel, FormMessage } from "@uiKit/Field";
import Input from "@uiKit/Input";
import { requestPasswordReset } from "../api/session";

type ForgotPasswordFormProps = {
  initialEmail?: string;
};

export default function ForgotPasswordForm({
  initialEmail = "",
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 429) {
        setError("Too many attempts. Try again shortly.");
      } else {
        setError(caught instanceof Error ? caught.message : "Something went wrong");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md" size="md">
      <h1 className="text-lg font-semibold text-white">Forgot password</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Enter your email and we will send a reset link if an account exists.
      </p>
      {sent ? (
        <FormMessage className="mt-6" tone="success">
          If an account exists for that email, we sent a message with next
          steps.
        </FormMessage>
      ) : (
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              autoComplete="email"
              autoFocus
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button disabled={pending} type="submit">
            {pending ? "Sending…" : "Send reset link"}
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
