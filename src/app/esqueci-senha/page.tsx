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
          <h1 className="text-2xl font-semibold">SHOWS E BARBEARIA</h1>
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
