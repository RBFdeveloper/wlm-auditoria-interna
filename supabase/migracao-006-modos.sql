-- Migração 006 — Modos por tema: DOS (departamento), DTO (colaborador), 5S/Inmetro (unidade)
-- FECHE o portal antes. Pode rodar de uma vez.

-- Áreas do padrão passam a ter um departamento (usado no DOS)
alter table padrao_areas   add column if not exists departamento text;

-- Colaboradores ganham as atividades que executam (usado no DTO)
alter table colaboradores  add column if not exists atividades text[] not null default '{}';

-- Auditoria guarda departamento e responsável (usado no DOS)
alter table auditorias     add column if not exists departamento text;
alter table auditorias     add column if not exists responsavel_nome text;

-- Fixa os modos dos temas
update temas set modo = 'departamento' where codigo = 'DOS';
update temas set modo = 'colaborador'  where codigo = 'DTO';
update temas set modo = 'unidade'      where codigo in ('5S', 'INMETRO');
