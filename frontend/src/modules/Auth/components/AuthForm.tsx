"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@api/env";
import Button from "@uiKit/Button";
import Card from "@uiKit/Card";
import { FieldLabel, FormMessage } from "@uiKit/Field";
import Input from "@uiKit/Input";
import { login, register, resendActivation } from "../api/session";

type AuthFormProps = {
  mode: "login" | "signup";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [debugActivationUrl, setDebugActivationUrl] = useState<string | null>(
    null,
  );
  const [resent, setResent] = useState(false);
  const isSignup = mode === "signup";
  const forgotHref = email.trim()
    ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
    : "/forgot-password";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUnverified(false);
    setResent(false);
    setPending(true);
    try {
      if (isSignup) {
        const created = await register({
          email,
          password,
          name: name.trim() || undefined,
        });
        setCheckEmail(true);
        setDebugActivationUrl(created.debugActivationUrl ?? null);
        setPending(false);
        return;
      }
      await login({ email, password });
      router.push("/");
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "unverified") {
        setUnverified(true);
        setError(caught.message);
      } else if (caught instanceof ApiError && caught.status === 429) {
        setError("Too many attempts. Try again shortly.");
      } else {
        setError(caught instanceof Error ? caught.message : "Something went wrong");
      }
      setPending(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    setPending(true);
    try {
      await resendActivation(email);
      setResent(true);
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

  if (checkEmail) {
    return (
      <Card className="w-full max-w-md" size="md">
        <h1 className="text-lg font-semibold text-white">Check your email</h1>
        <p className="mt-2 text-sm text-zinc-500">
          We sent an activation link to{" "}
          <span className="text-zinc-300">{email}</span>. Open it to finish
          creating your workspace.
        </p>
        {debugActivationUrl ? (
          <p className="mt-3 text-sm">
            <Link
              className="cursor-pointer text-purple-300 hover:text-purple-200"
              href={debugActivationUrl}
            >
              Activate account
            </Link>
            <span className="text-zinc-600"> (mock API)</span>
          </p>
        ) : null}
        {resent ? (
          <FormMessage className="mt-4" tone="success">
            Activation email sent again.
          </FormMessage>
        ) : null}
        {error ? <FormMessage className="mt-4">{error}</FormMessage> : null}
        <Button
          className="mt-5"
          disabled={pending}
          kind="outline"
          type="button"
          variant="secondary"
          onClick={() => void handleResend()}
        >
          {pending ? "Sending…" : "Resend email"}
        </Button>
        <p className="mt-5 text-center text-sm text-zinc-500">
          <Link className="cursor-pointer text-purple-300 hover:text-purple-200" href="/login">
            Back to sign in
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md" size="md">
      <h1 className="text-lg font-semibold text-white">
        {isSignup ? "Create your workspace" : "Sign in to KanbAIn"}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {isSignup
          ? "Email and password, or continue with Google."
          : "Use your email or Google account."}
      </p>
      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        {isSignup ? (
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              autoComplete="name"
              id="name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </div>
        ) : null}
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
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            {isSignup ? null : (
              <Link
                className="cursor-pointer text-[11px] font-medium text-purple-300 hover:text-purple-200"
                href={forgotHref}
              >
                Forgot password?
              </Link>
            )}
          </div>
          <Input
            autoComplete={isSignup ? "new-password" : "current-password"}
            id="password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        {error ? <FormMessage>{error}</FormMessage> : null}
        {unverified ? (
          <Button
            disabled={pending}
            kind="outline"
            type="button"
            variant="secondary"
            onClick={() => void handleResend()}
          >
            {pending ? "Sending…" : "Resend activation email"}
          </Button>
        ) : null}
        {resent ? (
          <FormMessage tone="success">Activation email sent again.</FormMessage>
        ) : null}
        <Button disabled={pending} type="submit">
          {pending
            ? isSignup
              ? "Creating account…"
              : "Signing in…"
            : isSignup
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>
      <div className="mt-4 flex items-center gap-3 text-xs text-zinc-600">
        <span className="h-px flex-1 bg-white/8" />
        or
        <span className="h-px flex-1 bg-white/8" />
      </div>
      <a
        className="mt-4 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-white/95 text-sm font-medium text-zinc-900 hover:bg-white"
        href="/api/auth/google"
      >
        <GoogleMark />
        Continue with Google
      </a>
      <p className="mt-5 text-center text-sm text-zinc-500">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link className="cursor-pointer text-purple-300 hover:text-purple-200" href="/login">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link className="cursor-pointer text-purple-300 hover:text-purple-200" href="/signup">
              Create an account
            </Link>
          </>
        )}
      </p>
    </Card>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.72.13-1.43.36-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.93.46 3.75 1.18 5.38l3.66-3.29Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  );
}
