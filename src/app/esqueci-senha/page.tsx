"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Scissors } from "lucide-react";
import { supabase } from "@/lib/supabase";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function EsqueciSenhaPage() {
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();

    if (!email) {
      setStatus("Digite seu e-mail.");
      return;
    }

    if (!supabase) {
      setStatus("Supabase não está configurado.");
      return;
    }

    setStatus("Enviando link...");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${basePath}/redefinir-senha/`,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setSent(true);
    setStatus("Enviamos um link para alterar sua senha. Abra seu e-mail e clique no link.");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-glow">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-md border border-gold/50 bg-gold/10 text-gold">
            <Scissors size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-ivory">Esqueci a senha</h1>
            <p className="text-sm text-muted">Receba um link para alterar sua senha</p>
          </div>
        </div>

        {sent ? (
          <p className="rounded-md border border-gold/40 bg-gold/10 p-4 text-sm text-ivory">{status}</p>
        ) : (
          <form className="space-y-4" onSubmit={requestReset}>
            <Field label="E-mail" name="email" type="email" placeholder="seuemail@exemplo.com" />
            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-gold px-4 font-semibold text-coal transition hover:bg-gold-soft">
              <KeyRound size={18} />
              Enviar link
            </button>
          </form>
        )}

        {status && !sent ? <p className="mt-4 text-sm text-gold">{status}</p> : null}
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
