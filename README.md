# Barbearia Pro

Sistema web completo para gerenciamento de barbearia com dashboard financeiro, clientes, serviços, produtos, agenda, relatórios, PWA e integração com Supabase.

## Tecnologias

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- Recharts
- jsPDF

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Banco de dados Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute o arquivo `supabase/schema.sql`.
4. Copie `.env.example` para `.env.local`.
5. Preencha:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

6. Crie um usuário em Authentication com e-mail e senha.
7. Rode `npm run dev` e entre com esse usuário.

Quando o Supabase está configurado, o sistema usa `signInWithPassword`, carrega os dados das tabelas do usuário e sincroniza alterações automaticamente. Sem variáveis de ambiente, o sistema roda em modo local com backup no `localStorage`.

## Build

```bash
npm run build
```

## Publicação

O projeto está pronto para GitHub público e GitHub Pages.

1. Crie um repositório público no GitHub.
2. Envie o código para a branch `main`.
3. No GitHub, abra `Settings > Secrets and variables > Actions`.
4. Cadastre os secrets:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

5. Abra `Settings > Pages`.
6. Em `Build and deployment`, selecione `GitHub Actions`.
7. Faça push na `main`.

O workflow `.github/workflows/deploy.yml` gera o site estático em `out` e publica no GitHub Pages. Para repositórios comuns, o workflow usa automaticamente `NEXT_PUBLIC_BASE_PATH=/{nome-do-repositorio}` para o site abrir em `https://usuario.github.io/nome-do-repositorio/`.

Se o repositório for do tipo `usuario.github.io`, remova a variável `NEXT_PUBLIC_BASE_PATH` do workflow para publicar na raiz do domínio.
