"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Scissors } from "lucide-react";
import { supabase } from "@/lib/supabase";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function ConfirmacaoPage() {
  const [message, setMessage] = useState("Confirmando sua conta...");

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      setMessage(data.session ? "Conta confirmada com sucesso. Agora você já pode entrar no sistema." : "Conta confirmada. Volte para o login e entre com seu e-mail e senha.");
    });
  }, []);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-6 text-center shadow-glow">
        <div className="mx-auto mb-6 grid size-14 place-items-center rounded-md border border-gold/50 bg-gold/10 text-gold">
          <Scissors size={28} />
        </div>
        <CheckCircle2 className="mx-auto mb-4 text-gold" size={34} />
        <h1 className="text-2xl font-semibold text-ivory">Confirmação de conta</h1>
        <p className="mt-3 text-sm text-muted">{message}</p>
        <a href={`${basePath}/`} className="mt-6 flex h-12 w-full items-center justify-center rounded-md bg-gold px-4 font-semibold text-coal transition hover:bg-gold-soft">
          Ir para login
        </a>
      </section>
    </main>
  );
}
