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
      setSuccess("Conta criada com sucesso!");
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
