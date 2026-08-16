"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.register({ username, password });
      if (res.message) toast(res.message, "success");
      router.push("/login");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
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
          {"<"}CREATE ACCOUNT{">"}
        </h1>
        <p className="text-center text-[7px] text-[var(--text-muted)] mb-5">
          START YOUR FACTORY EMPIRE
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="register-username" className="text-[8px] text-[var(--text-muted)] mb-1 block">USERNAME</label>
            <input
              id="register-username"
              type="text"
              placeholder="choose a username..."
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pixel-input"
              required
            />
          </div>
          <div>
            <label htmlFor="register-password" className="text-[8px] text-[var(--text-muted)] mb-1 block">PASSWORD</label>
            <input
              id="register-password"
              type="password"
              placeholder="choose a password..."
              autoComplete="new-password"
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
            {loading ? "[ CREATING... ]" : "[ REGISTER ]"}
          </button>
        </form>
        <div className="mt-4 text-center text-[8px] text-[var(--text-muted)]">
          HAVE AN ACCOUNT?{" "}
          <Link href="/login" className="text-[var(--accent-primary)] hover:underline">
            [SIGN IN]
          </Link>
        </div>
      </div>
      <Link href="/" className="text-[8px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
        [ BACK TO TITLE ]
      </Link>
    </div>
  );
}
