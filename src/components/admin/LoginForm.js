"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";

async function loginWithState(_prevState, formData) {
  return loginAction(formData);
}

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginWithState, null);

  return (
    <main className="login-page">
      <form className="login-form" action={formAction}>
        <h1>CMS Admin</h1>
        <p>Sign in to manage content.</p>
        {state?.error && <p className="admin-error">{state.error}</p>}
        <label>
          Username
          <input name="username" type="text" autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
