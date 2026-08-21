-- Migração 004 — Multi-tema + código da auditoria + sigla das casas
--
-- IMPORTANTE: FECHE o portal (todas as abas do index.html) antes de rodar.
-- Com o portal aberto, o Postgres dá "deadlock detected" porque a migração
-- precisa travar as tabelas que o app está consultando.
--
-- Rode UM BLOCO DE CADA VEZ, aguardando o "Success" de cada.

-- ===================== BLOCO 1 (altera colunas — travam as tabelas) =====================
alter table padrao_areas       alter column tipo type text;
alter table auditorias         alter column tipo type text;
alter table nao_conformidades  alter column tipo type text;

-- ===================== BLOCO 2 (tabela de temas) =======================================
create table if not exists temas (
  codigo  text primary key,
  nome    text not null,
  modo    text not null default 'unidade',   -- 'unidade' | 'funcionario'
  ordem   int  not null default 0,
  ativo   boolean not null default true
);
alter table temas enable row level security;
create policy temas_sel on temas for select to authenticated using (true);
create policy temas_all on temas for all to authenticated using (is_master()) with check (is_master());
insert into temas (codigo, nome, modo, ordem) values
  ('DOS', 'Dealer Operating Standard', 'unidade', 0),
  ('DCS', 'Dealer Customer Service',   'funcionario', 1)
on conflict (codigo) do nothing;

-- ===================== BLOCO 3 (sigla das casas + código) ==============================
alter table unidades add column if not exists sigla text;
update unidades set sigla = upper(substring(translate(nome,' ',''),1,3)) where sigla is null;
update unidades set sigla = 'RJ' where id in ('equipo:rio','csc:rio');
alter table auditorias add column if not exists codigo_fmt text;
