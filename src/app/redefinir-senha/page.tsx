"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Scissors } from "lucide-react";
import { supabase } from "@/lib/supabase";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function RedefinirSenhaPage() {
  const [status, setStatus] = useState("Validando link de recuperação...");
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
      setStatus(data.session ? "Digite sua nova senha." : "Link inválido ou expirado. Solicite outro link de recuperação.");
    });
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (password.length < 6) {
      setStatus("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("As senhas não conferem.");
      return;
    }

    if (!supabase) {
      setStatus("Supabase não está configurado.");
      return;
    }

    setStatus("Alterando senha...");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus(error.message);
      return;
    }

    setDone(true);
    setStatus("Senha alterada com sucesso. Você já pode entrar com a nova senha.");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-glow">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-md border border-gold/50 bg-gold/10 text-gold">
            <Scissors size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-ivory">Redefinir senha</h1>
            <p className="text-sm text-muted">Barbearia Pro</p>
          </div>
        </div>

        {done ? (
          <div className="rounded-md border border-gold/40 bg-gold/10 p-4 text-sm text-ivory">
            <CheckCircle2 className="mb-3 text-gold" size={24} />
            <p>{status}</p>
          </div>
        ) : ready ? (
          <form className="space-y-4" onSubmit={updatePassword}>
            <Field label="Nova senha" name="password" type="password" placeholder="Mínimo 6 caracteres" />
            <Field label="Confirmar senha" name="confirmPassword" type="password" placeholder="Repita a senha" />
            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-gold px-4 font-semibold text-coal transition hover:bg-gold-soft">
              <KeyRound size={18} />
              Alterar senha
            </button>
          </form>
        ) : null}

        <p className="mt-4 text-sm text-gold">{status}</p>
        <a href={`${basePath}/`} className="mt-5 block text-sm text-muted transition hover:text-gold">
          Voltar para login
        </a>
      </section>
    </main>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, ...input } = props;
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <input
        {...input}
        className="h-11 w-full rounded-md border border-line bg-coal px-3 text-ivory outline-none transition placeholder:text-muted focus:border-gold"
      />
    </label>
  );
}
