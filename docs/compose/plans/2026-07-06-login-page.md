# Login Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a login page with email/password authentication using Supabase Auth.

**Architecture:** Add auth helpers to `src/lib/auth.ts`, create login page at `src/app/login/page.tsx`, and protect the main route by redirecting unauthenticated users.

**Tech Stack:** Next.js 15 App Router, Supabase Auth, Tailwind CSS

---

## File Structure

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | Auth helpers (signIn, signUp, signOut, getSession, getUser) |
| `src/app/login/page.tsx` | Login page UI |
| `src/app/page.tsx` | Add auth guard redirect |

---

## Global Constraints

- Theme: dark (#080808 background, #f8f5ed text, #d8a63f gold accent)
- Supabase client already exists at `src/lib/supabase.ts`
- Follow existing code patterns in `src/app/page.tsx`
- No new dependencies

---

### Task 1: Create auth helpers

**Covers:** Auth integration

**Files:**
- Create: `src/lib/auth.ts`

**Interfaces:**
- Consumes: `supabase` client from `src/lib/supabase.ts`
- Produces: `signIn(email, password)`, `signUp(email, password)`, `signOut()`, `getUser()`, `onAuthStateChange(callback)`

- [ ] **Step 1: Create auth helpers**

```typescript
import { supabase } from "./supabase";

export const signIn = async (email: string, password: string) => {
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signUp = async (email: string, password: string) => {
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const onAuthStateChange = (callback: (event: string, session: { user: { id: string; email: string } | null } | null) => void) => {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
};
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 2: Create login page

**Covers:** Login UI

**Files:**
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `signIn` from `src/lib/auth.ts`
- Produces: Login page at `/login`

- [ ] **Step 1: Create login page**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Scissors, Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex size-14 items-center justify-center rounded-lg border border-gold/50 bg-gold/10 text-gold mb-4">
            <Scissors size={28} />
          </div>
          <h1 className="text-2xl font-semibold">BRAVOS BARBEARIA</h1>
          <p className="text-sm text-muted mt-1">Acesse sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-line bg-panel p-6">
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ivory mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-line bg-coal px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ivory mb-1.5">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-line bg-coal px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
              placeholder="Sua senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-coal transition hover:bg-gold/90 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted space-y-2">
          <Link href="/esqueci-senha" className="hover:text-gold transition">
            Esqueci minha senha
          </Link>
          <p>
            Não tem conta?{" "}
            <Link href="/cadastro" className="text-gold hover:text-gold/80 transition">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 3: Add auth guard to main page

**Covers:** Route protection

**Files:**
- Modify: `src/app/page.tsx` (lines 1-66)

**Interfaces:**
- Consumes: `getUser`, `signOut` from `src/lib/auth.ts`

- [ ] **Step 1: Add auth check to Home component**

At the top of the `Home` component in `src/app/page.tsx`, add auth state:

```tsx
// Add after the existing imports
import { getUser, signOut, onAuthStateChange } from "@/lib/auth";

// Inside the Home component, add these state variables after line 301:
const [user, setUser] = useState<{ id: string; email: string } | null>(null);
const [authLoading, setAuthLoading] = useState(true);

// Add this useEffect after the existing useEffect blocks (around line 438):
useEffect(() => {
  const checkUser = async () => {
    const currentUser = await getUser();
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }
    setUser({ id: currentUser.id, email: currentUser.email || "" });
    setAuthLoading(false);
  };
  checkUser();

  const { data: { subscription } } = onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      window.location.href = "/login";
    } else if (session?.user) {
      setUser({ id: session.user.id, email: session.user.email || "" });
    }
  });

  return () => subscription.unsubscribe();
}, []);

// Add loading state before the return (around line 762):
if (authLoading) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-muted">Carregando...</div>
    </main>
  );
}
```

- [ ] **Step 2: Add sign out button to header**

In the header section (around line 801), add a sign out button:

```tsx
// Add after the backup date span (around line 803):
<button
  onClick={async () => {
    await signOut();
    window.location.href = "/login";
  }}
  className="icon-button"
  title="Sair"
>
  Sair
</button>
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run lint**

Run: `npx next lint`
Expected: No errors

---

### Task 4: Update cadastro page

**Covers:** Registration redirect

**Files:**
- Create: `src/app/cadastro/page.tsx`

**Interfaces:**
- Consumes: `signUp` from `src/lib/auth.ts`

- [ ] **Step 1: Create cadastro page**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Scissors, Loader2 } from "lucide-react";
import { signUp } from "@/lib/auth";

export default function CadastroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
      setSuccess("Conta criada! Verifique seu email para confirmar.");
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex size-14 items-center justify-center rounded-lg border border-gold/50 bg-gold/10 text-gold mb-4">
            <Scissors size={28} />
          </div>
          <h1 className="text-2xl font-semibold">BRAVOS BARBEARIA</h1>
          <p className="text-sm text-muted mt-1">Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-line bg-panel p-6">
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ivory mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-line bg-coal px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ivory mb-1.5">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-line bg-coal px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-ivory mb-1.5">
              Confirmar senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-md border border-line bg-coal px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
              placeholder="Repita a senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-coal transition hover:bg-gold/90 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="text-gold hover:text-gold/80 transition">
            Entrar
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 5: Update esqueci-senha page

**Covers:** Password recovery

**Files:**
- Create: `src/app/esqueci-senha/page.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`

- [ ] **Step 1: Create esqueci-senha page**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Scissors, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!supabase) {
      setError("Supabase não configurado");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (resetError) throw resetError;
      setSuccess("Email de recuperação enviado! Verifique sua caixa de entrada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex size-14 items-center justify-center rounded-lg border border-gold/50 bg-gold/10 text-gold mb-4">
            <Scissors size={28} />
          </div>
          <h1 className="text-2xl font-semibold">BRAVOS BARBEARIA</h1>
          <p className="text-sm text-muted mt-1">Recupere sua senha</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-line bg-panel p-6">
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ivory mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-line bg-coal px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
              placeholder="seu@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-coal transition hover:bg-gold/90 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link href="/login" className="inline-flex items-center gap-1 text-muted hover:text-gold transition">
            <ArrowLeft size={14} />
            Voltar para o login
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 6: Final verification

**Covers:** Complete verification

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run lint**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 3: Build project**

Run: `npm run build`
Expected: Build succeeds
