# DOS Audit — Portal de Auditoria Interna (WLM)

Plataforma de auditorias internas da rede WLM (Scania). Suporta múltiplos temas
de auditoria (DOS, DTO, 5S, INMETRO e outros), com modos diferentes por tema:

- **DOS / 5S** → auditados **por departamento**
- **DTO** → auditado **por colaborador** (cada um pelas atividades que executa)
- **INMETRO** → auditado **por casa** (checklist geral)

Backend em **Supabase** (Postgres + Auth + Storage + RLS). Frontend em **React + Vite**.

---

## Como rodar (desenvolvimento)

Pré-requisito: Node.js 18+.

```bash
npm install
cp .env.example .env      # preencha com a URL e a anon key do seu projeto Supabase
npm run dev               # sobe em http://localhost:5173
```

Gerar versão de produção:

```bash
npm run build             # gera a pasta dist/
npm run preview           # testa o build localmente
```

## Variáveis de ambiente (.env)

| Variável                  | Descrição                                         |
|---------------------------|---------------------------------------------------|
| `VITE_SUPABASE_URL`       | URL do projeto Supabase (Project Settings > API)  |
| `VITE_SUPABASE_ANON_KEY`  | Chave anon public (pública — protegida pela RLS)  |

> A anon key é pública por design. A segurança vem da **RLS** no banco.
> A **service_role** NUNCA entra no frontend — fica só nos secrets da Edge Function.

---

## Estrutura de pastas

```
src/
├── main.jsx              # ponto de entrada (monta o App)
├── App.jsx              # componente raiz: estado global, navegação, orquestração
├── styles.css          # todos os estilos (CSS global)
├── constants.js        # rede (grupos/casas), papéis, departamentos, cargos, status, logo
├── utils.js            # funções puras (métricas, escopo, datas, helpers de tema)
├── lib/
│   ├── supabaseClient.js  # cliente Supabase (lê o .env)
│   ├── db.js              # camada de dados (todas as queries ao Supabase)
│   └── pdf.js             # geração do relatório PDF (jsPDF)
├── ui/
│   └── common.jsx      # componentes de UI reutilizáveis (Modal, Field, StatusPill, ...)
├── auth/
│   └── Auth.jsx        # Login e troca de senha no 1º acesso
├── views/              # as telas (uma por arquivo)
│   ├── Dashboard.jsx
│   ├── Casas.jsx
│   ├── Auditorias.jsx
│   ├── NaoConformidades.jsx
│   ├── Padroes.jsx
│   ├── Colaboradores.jsx
│   ├── Usuarios.jsx
│   └── ScopeSelector.jsx
└── modals/             # os modais (formulários e execução)
    ├── NovaAuditoria.jsx
    ├── ExecutarAuditoria.jsx
    ├── TratarNC.jsx
    ├── NovoUsuario.jsx
    ├── NovoColaborador.jsx
    └── NovoTema.jsx

supabase/               # schema e migrações SQL (rodar no SQL Editor do Supabase)
```

## Onde mexer (guia rápido para a equipe)

- **Nova tela** → criar em `src/views/`, importar e renderizar em `App.jsx`.
- **Novo campo numa query** → `src/lib/db.js` (mapeia snake_case do banco → camelCase no app).
- **Regra de negócio de tema/modo** → `src/utils.js` (`modoDoTema`, `ehColaborador`).
- **Estilos** → `src/styles.css` (usa CSS variables no topo do arquivo).
- **Rede (grupos/casas), cargos, departamentos** → `src/constants.js`.
- **Banco de dados** → arquivos em `supabase/` (schema.sql + migrações numeradas).

## Banco de dados

O schema e as migrações estão em `supabase/`. Rode no **SQL Editor** do Supabase,
na ordem: `schema.sql` e depois as `migracao-00X-*.sql` em ordem numérica.
Sempre com o portal **fechado** (evita deadlock ao alterar tabelas em uso).

## Deploy (Vercel)

1. Suba este repositório no GitHub.
2. No Vercel, importe o repositório (framework detectado: Vite).
3. Em **Settings > Environment Variables**, adicione `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`.
4. Deploy. O Vercel roda `npm run build` sozinho a cada push.
