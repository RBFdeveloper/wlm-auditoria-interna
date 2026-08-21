-- Migração 005 — Garante a tabela temas + renomeia DCS→DTO + auditoria por processo
-- Versão à prova de repetição (idempotente). FECHE o portal antes. Pode rodar de uma vez.

-- garante a tabela temas (caso a migração 004 tenha revertido por erro de policy)
create table if not exists temas (
  codigo text primary key,
  nome   text not null,
  modo   text not null default 'unidade',
  ordem  int  not null default 0,
  ativo  boolean not null default true
);
alter table temas enable row level security;
drop policy if exists temas_sel on temas;
drop policy if exists temas_all on temas;
create policy temas_sel on temas for select to authenticated using (true);
create policy temas_all on temas for all to authenticated using (is_master()) with check (is_master());

-- garante o DOS
insert into temas (codigo, nome, modo, ordem)
values ('DOS', 'Dealer Operating Standard', 'unidade', 0)
on conflict (codigo) do nothing;

-- DTO (renomeia o antigo DCS, se existir; senão cria)
update temas set codigo='DTO', nome='DTO — Auditoria Interna', modo='escolha' where codigo='DCS';
insert into temas (codigo, nome, modo, ordem)
values ('DTO', 'DTO — Auditoria Interna', 'escolha', 1)
on conflict (codigo) do nothing;

-- renomeia as referências DCS -> DTO
update padrao_areas       set tipo='DTO' where tipo='DCS';
update auditorias         set tipo='DTO' where tipo='DCS';
update nao_conformidades  set tipo='DTO' where tipo='DCS';

-- auditoria por processo
alter table auditoria_itens    add column if not exists processo text;
alter table nao_conformidades  add column if not exists processo text;
