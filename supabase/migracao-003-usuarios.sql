-- Migração 003 — Senha provisória (troca no 1º acesso) e acesso por casa
-- Rode em DOIS passos (o Postgres não deixa usar valor novo de enum na mesma execução).

-- ================= PASSO 1 (rode sozinho primeiro) =================
alter type escopo_tipo add value if not exists 'unidade';

-- ================= PASSO 2 (rode depois do Passo 1 concluir) =======
alter table profiles add column if not exists senha_provisoria boolean not null default true;
alter table profiles add column if not exists escopo_unidade_id text references unidades(id);

-- Usuários que já existem não são forçados a trocar senha:
update profiles set senha_provisoria = false where senha_provisoria is null or senha_provisoria = true;
