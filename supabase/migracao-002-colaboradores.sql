-- Migração 002 — Colaboradores e auditoria por funcionário
-- Rode no SQL Editor do Supabase, depois do schema.sql e da migração 001.

-- ---------- Colaboradores auditáveis (LGPD: só nome, cargo, departamento) ----------
create table if not exists colaboradores (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  cargo        text,
  departamento text,
  unidade_id   text not null references unidades(id) on delete cascade,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists idx_colab_unidade on colaboradores(unidade_id);

-- ---------- Auditoria: modo (por unidade ou por funcionário) ----------
alter table auditorias        add column if not exists modo text not null default 'unidade'; -- 'unidade' | 'funcionario'
-- ---------- Item vinculado a um colaborador (null quando modo = unidade) ----------
alter table auditoria_itens   add column if not exists colaborador_id uuid references colaboradores(id) on delete cascade;
-- ---------- NC pode referenciar o colaborador avaliado ----------
alter table nao_conformidades add column if not exists colaborador_id uuid references colaboradores(id) on delete set null;
alter table nao_conformidades add column if not exists colaborador_nome text;

-- ---------- RLS dos colaboradores ----------
alter table colaboradores enable row level security;
create policy colab_sel on colaboradores for select to authenticated
  using (can_access_unidade(unidade_id));
create policy colab_all on colaboradores for all to authenticated
  using (is_master()) with check (is_master());
