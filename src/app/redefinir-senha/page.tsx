"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Scissors, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    const handleAuth = async () => {
      if (!supabase) {
        setError("Supabase não configurado");
        setCheckingToken(false);
        return;
      }

      const hash = window.location.hash;
      if (!hash) {
        setError("Link inválido ou expirado");
        setCheckingToken(false);
        return;
      }

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (!accessToken || !refreshToken || type !== "recovery") {
        setError("Link inválido ou expirado");
        setCheckingToken(false);
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError("Link inválido ou expirado");
        setCheckingToken(false);
        return;
      }

      setValidToken(true);
      setCheckingToken(false);
    };

    handleAuth();
  }, []);

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
      const { error: updateError } = await supabase!.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;
      setSuccess("Senha redefinida com sucesso!");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-gold mx-auto" />
          <p className="mt-4 text-muted">Verificando link...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex size-14 items-center justify-center rounded-lg border border-gold/50 bg-gold/10 text-gold mb-4">
            <Scissors size={28} />
          </div>
          <h1 className="text-2xl font-semibold">BRAVOS BARBEARIA</h1>
          <p className="text-sm text-muted mt-1">Redefinir senha</p>
        </div>

        {!validToken ? (
          <div className="rounded-lg border border-line bg-panel p-6 text-center">
            <p className="text-red-400 text-sm">{error || "Link inválido ou expirado"}</p>
            <Link href="/esqueci-senha" className="mt-4 inline-block text-sm text-gold hover:text-gold/80 transition">
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-line bg-panel p-6">
            {error && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-400 flex items-center gap-2">
                <CheckCircle size={16} />
                {success}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ivory mb-1.5">
                Nova senha
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
                Confirmar nova senha
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
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </button>
          </form>
        )}

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
