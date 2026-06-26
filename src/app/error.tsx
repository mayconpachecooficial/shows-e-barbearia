"use client";

import { useEffect, useState } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [details, setDetails] = useState("");

  useEffect(() => {
    setDetails(error.message || "Erro inesperado");
  }, [error]);

  const clearLocalData = () => {
    localStorage.removeItem("barbearia-pro-data");
    localStorage.removeItem("barbearia-pro-backup");
    localStorage.removeItem("barbearia-pro-last-backup");
    window.location.reload();
  };

  return (
    <main className="grid min-h-screen place-items-center bg-coal px-4 text-ivory">
      <section className="w-full max-w-lg rounded-lg border border-line bg-panel p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
        <p className="text-sm font-semibold text-gold">BRAVOS BARBEARIA</p>
        <h1 className="mt-2 text-2xl font-semibold">Não foi possível carregar</h1>
        <p className="mt-3 text-sm text-muted">
          Tente recarregar. Se continuar, limpe os dados locais para buscar novamente as informações do banco.
        </p>
        {details ? <p className="mt-4 rounded-md border border-line bg-coal p-3 text-xs text-muted">{details}</p> : null}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button onClick={reset} className="h-11 rounded-md bg-gold px-4 font-semibold text-coal">
            Tentar novamente
          </button>
          <button onClick={clearLocalData} className="h-11 rounded-md border border-line px-4 font-semibold text-ivory">
            Limpar dados locais
          </button>
        </div>
      </section>
    </main>
  );
}
