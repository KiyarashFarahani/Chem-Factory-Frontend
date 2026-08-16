"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/toast";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.login({ username, password });
      login(res.data.token);
      if (res.message) toast(res.message, "success");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto title-bg flex flex-col items-center justify-center gap-5 p-4 page-enter">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-sm.png" alt="Chem Factory" className="h-14 w-auto" />
      <div className="pixel-panel w-full max-w-sm">
        <h1 className="text-sm mb-1 text-[var(--accent-primary)] text-center">
          {"<"}SIGN IN{">"}
        </h1>
        <p className="text-center text-[7px] text-[var(--text-muted)] mb-5">
          ENTER YOUR FACTORY CREDENTIALS
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="login-username" className="text-[8px] text-[var(--text-muted)] mb-1 block">USERNAME</label>
            <input
              id="login-username"
              type="text"
              placeholder="enter username..."
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pixel-input"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="text-[8px] text-[var(--text-muted)] mb-1 block">PASSWORD</label>
            <input
              id="login-password"
              type="password"
              placeholder="enter password..."
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pixel-input"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="pixel-btn pixel-btn--primary w-full mt-2 hover-lift"
          >
            {loading ? "[ LOGGING IN... ]" : "[ LOGIN ]"}
          </button>
        </form>
        <div className="mt-4 text-center text-[8px] text-[var(--text-muted)]">
          NO ACCOUNT?{" "}
          <Link href="/register" className="text-[var(--accent-primary)] hover:underline">
            [REGISTER]
          </Link>
        </div>
      </div>
      <Link href="/" className="text-[8px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
        [ BACK TO TITLE ]
      </Link>
    </div>
  );
}
