"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Scissors, UserPlus } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function CadastroPage() {
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!name || !email || password.length < 6) {
      setStatus("Preencha nome, e-mail e uma senha com pelo menos 6 caracteres.");
      return;
    }

    if (!supabase) {
      setStatus("Supabase não está configurado.");
      return;
    }

    setStatus("Criando conta...");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}${basePath}/confirmacao/`,
      },
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setSent(true);
    setStatus("Enviamos um e-mail de confirmação. Clique no link para ativar sua conta.");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-glow">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-md border border-gold/50 bg-gold/10 text-gold">
            <Scissors size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-ivory">Criar conta</h1>
            <p className="text-sm text-muted">Barbearia Pro</p>
          </div>
        </div>

        {sent ? (
          <div className="rounded-md border border-gold/40 bg-gold/10 p-4 text-sm text-ivory">
            <CheckCircle2 className="mb-3 text-gold" size={24} />
            <p>{status}</p>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={createAccount}>
            <Field label="Nome completo" name="name" placeholder="Seu nome" />
            <Field label="E-mail" name="email" type="email" placeholder="seuemail@exemplo.com" />
            <Field label="Senha" name="password" type="password" placeholder="Mínimo 6 caracteres" />
            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-gold px-4 font-semibold text-coal transition hover:bg-gold-soft">
              <UserPlus size={18} />
              Criar conta
            </button>
          </form>
        )}

        {status && !sent ? <p className="mt-4 text-sm text-gold">{status}</p> : null}
        <a href={`${basePath}/`} className="mt-5 block text-sm text-muted transition hover:text-gold">
          Voltar para login
        </a>
        <p className="mt-5 text-xs text-muted">
          {isSupabaseConfigured ? "Você receberá um link para confirmar sua conta." : "Supabase não configurado para cadastro real."}
        </p>
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
