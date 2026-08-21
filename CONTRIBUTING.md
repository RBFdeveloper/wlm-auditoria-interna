# Guia de contribuição — DOS Audit

Padrões para a equipe manter o projeto consistente.

## Fluxo de trabalho
1. Crie uma branch a partir da `main`: `git checkout -b feat/nome-da-feature`.
2. Faça as alterações e rode `npm run lint` e `npm run format` antes de commitar.
3. Abra um Pull Request. O CI (GitHub Actions) roda lint + build automaticamente.
4. Merge só com o CI verde.

## Scripts
- `npm run dev` — ambiente de desenvolvimento.
- `npm run build` — build de produção.
- `npm run lint` — verifica problemas de código (ESLint).
- `npm run format` — formata o código (Prettier).

## Onde fica cada coisa
- **Telas** → `src/views/` (uma por arquivo). Modais em `src/modals/`.
- **Camada de dados** (queries Supabase) → `src/lib/db.js`. É a ÚNICA porta de acesso ao banco.
- **Regras de negócio puras** (métricas, escopo, modo de tema) → `src/utils.js`.
- **Constantes** (rede, papéis, departamentos, cargos, status) → `src/constants.js`.
- **UI reutilizável** → `src/ui/common.jsx`.
- **Estilos** → `src/styles.css`.
- **Banco** → `supabase/` (schema.sql + migrações numeradas). Rodar no SQL Editor, portal fechado.

## Convenções
- Componentes em PascalCase; funções/variáveis em camelCase.
- Toda leitura/escrita no banco passa por `src/lib/db.js` (nunca chamar o Supabase direto de um componente).
- Não commitar `.env` (contém as chaves). Use `.env.example` como referência.
- Nunca colocar a `service_role` key no front — só a `anon` (pública).

## Próximos passos técnicos recomendados (evolução incremental)
- **TypeScript**: migrar arquivo por arquivo (o projeto já aceita `.ts/.tsx` ao lado de `.jsx`).
  Comece por `lib/db.js` e `utils.js` (tipar dados e retornos).
- **Testes**: adicionar Vitest para as funções de `utils.js` e `lib/`.
- **Paginação**: hoje o app carrega todas as auditorias/NCs de uma vez; ao crescer o volume,
  paginar as consultas em `lib/db.js`.
