#!/usr/bin/env python3
# Gera schema.sql completo (DDL + RLS + seed) para o Supabase.
import unicodedata, re

GRUPOS = [
    ("equipo", "Equipo", ["Rio", "Barra Mansa", "Campos"]),
    ("quinta_roda", "Quinta Roda", ["Sumaré", "Araçatuba", "Bauru", "Ferreira", "Marília"]),
    ("itaipu", "Itaipu", ["Contagem", "Juiz de Fora", "Montes Claros", "Patos de Minas", "Reforma", "São Gonçalo", "Perdões", "Betim", "Formiga"]),
    ("itaipu_norte", "Itaipu Norte", ["Paragominas", "Marabá", "Ourilândia", "Oriximiná", "S Leste", "Macapá", "Carajás", "Juruti"]),
    ("supermac", "Supermac", ["Manaus", "Boa Vista"]),
]
CSC_CASAS = ["Rio"]

STANDARDS = {
    "DOS": ("Dealer Operating Standard", [
        ("Instalações & Imagem", [("1.1","Identidade visual conforme manual da marca"),("1.2","Sinalização externa e interna padronizada"),("1.3","Recepção e showroom em conformidade")]),
        ("Processo de Vendas", [("2.1","Abordagem e qualificação do cliente"),("2.2","Proposta e test drive documentados"),("2.3","Entrega técnica do veículo registrada")]),
        ("Pós-venda / Serviços", [("3.1","Recepção da oficina e agendamento"),("3.2","Ordem de serviço e diagnóstico padronizados"),("3.3","Controle de qualidade na entrega")]),
        ("Peças", [("4.1","Gestão e disponibilidade de estoque"),("4.2","Atendimento ao balcão de peças")]),
        ("Pessoas & Treinamento", [("5.1","Certificação técnica da equipe"),("5.2","Plano de desenvolvimento ativo")]),
        ("Satisfação do Cliente", [("6.1","Pesquisa e tratamento de feedback")]),
    ]),
    "DCS": ("Dealer Communication Standard", [
        ("Sistemas & Comunicação", [("1.1","Uso do sistema para claims de garantia"),("1.2","Fluxo de informação fábrica–concessionária")]),
        ("Dados & Relatórios", [("2.1","Registro de vendas e serviços no sistema"),("2.2","Integridade e qualidade dos dados")]),
        ("Garantia", [("3.1","Processo de abertura de garantia"),("3.2","Documentação e evidências anexadas")]),
    ]),
}

def slug(s):
    s = unicodedata.normalize("NFD", s).encode("ascii","ignore").decode()
    return re.sub(r"[^a-z0-9]+","-", s.lower()).strip("-")

def q(s): return s.replace("'", "''")

DDL = r"""-- =====================================================================
--  PORTAL DE AUDITORIA INTERNA — WLM (padrões Scania DOS & DCS)
--  Schema Supabase (Postgres) : tabelas, RLS por papel, storage e seed.
--  Rode este arquivo no SQL Editor do Supabase (ou via CLI de migração).
-- =====================================================================

-- ---------- Extensões ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type papel_usuario as enum ('master','auditor','gestor','visualizador');
exception when duplicate_object then null; end $$;
do $$ begin
  create type tipo_padrao as enum ('DOS','DCS');
exception when duplicate_object then null; end $$;
do $$ begin
  create type tipo_unidade as enum ('concessionaria','csc');
exception when duplicate_object then null; end $$;
do $$ begin
  create type resultado_item as enum ('conforme','nao_conforme','na');
exception when duplicate_object then null; end $$;
do $$ begin
  create type status_auditoria as enum ('planejada','em_andamento','concluida');
exception when duplicate_object then null; end $$;
do $$ begin
  create type status_nc as enum ('aberta','em_tratamento','resolvida');
exception when duplicate_object then null; end $$;
do $$ begin
  create type severidade_nc as enum ('baixa','media','alta');
exception when duplicate_object then null; end $$;
do $$ begin
  create type escopo_tipo as enum ('all','grupo');
exception when duplicate_object then null; end $$;

-- ---------- Estrutura da rede ----------
create table if not exists grupos (
  id    text primary key,
  nome  text not null
);

create table if not exists unidades (
  id        text primary key,
  nome      text not null,
  grupo_id  text not null references grupos(id) on delete restrict,
  tipo      tipo_unidade not null default 'concessionaria'
);

-- ---------- Usuários (profile ligado ao auth.users do Supabase) ----------
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nome            text not null,
  email           text,
  papel           papel_usuario not null default 'visualizador',
  escopo_tipo     escopo_tipo not null default 'all',
  escopo_grupo_id text references grupos(id),
  created_at      timestamptz not null default now()
);

-- ---------- Padrões (DOS/DCS) — editados pelo Master ----------
create table if not exists padrao_areas (
  id        uuid primary key default gen_random_uuid(),
  tipo      tipo_padrao not null,
  nome      text not null,
  ordem     int not null default 0
);

create table if not exists padrao_requisitos (
  id         uuid primary key default gen_random_uuid(),
  area_id    uuid not null references padrao_areas(id) on delete cascade,
  codigo     text not null,
  titulo     text not null,
  instrucao  text default '',
  foto_path  text,            -- caminho no Storage (bucket 'padroes')
  ordem      int not null default 0
);

-- ---------- Auditorias ----------
create table if not exists auditorias (
  id           uuid primary key default gen_random_uuid(),
  codigo       serial,
  tipo         tipo_padrao not null,
  unidade_id   text not null references unidades(id),
  setor        text not null,
  auditor      text,                       -- nome livre (ou use auditor_id)
  auditor_id   uuid references profiles(id),
  data         date not null default current_date,
  status       status_auditoria not null default 'em_andamento',
  created_by   uuid references profiles(id) default auth.uid(),
  created_at   timestamptz not null default now()
);

create table if not exists auditoria_itens (
  id            uuid primary key default gen_random_uuid(),
  auditoria_id  uuid not null references auditorias(id) on delete cascade,
  area          text not null,
  codigo        text not null,
  requisito     text not null,
  resultado     resultado_item not null default 'na',
  obs           text default ''
);

-- ---------- Não conformidades ----------
create table if not exists nao_conformidades (
  id            uuid primary key default gen_random_uuid(),
  auditoria_id  uuid not null references auditorias(id) on delete cascade,
  tipo          tipo_padrao not null,
  area          text not null,
  codigo        text not null,
  requisito     text not null,
  descricao     text default '',
  severidade    severidade_nc not null default 'media',
  status        status_nc not null default 'aberta',
  plano_acao    text default '',
  responsavel   text default '',
  prazo         date,
  created_at    timestamptz not null default now()
);

create index if not exists idx_aud_unidade on auditorias(unidade_id);
create index if not exists idx_item_aud    on auditoria_itens(auditoria_id);
create index if not exists idx_nc_aud      on nao_conformidades(auditoria_id);

-- =====================================================================
--  Funções auxiliares de permissão
-- =====================================================================
create or replace function auth_papel() returns papel_usuario
  language sql stable security definer set search_path = public as $$
  select papel from profiles where id = auth.uid();
$$;

create or replace function is_master() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'master' from profiles where id = auth.uid()), false);
$$;

-- pode acessar (ler) dados de uma unidade?
create or replace function can_access_unidade(u_id text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    left join unidades u on u.id = u_id
    where p.id = auth.uid()
      and (
        p.papel = 'master'
        or p.escopo_tipo = 'all'
        or (p.escopo_tipo = 'grupo' and p.escopo_grupo_id = u.grupo_id)
      )
  );
$$;

-- =====================================================================
--  Row Level Security
-- =====================================================================
alter table grupos              enable row level security;
alter table unidades            enable row level security;
alter table profiles            enable row level security;
alter table padrao_areas        enable row level security;
alter table padrao_requisitos   enable row level security;
alter table auditorias          enable row level security;
alter table auditoria_itens     enable row level security;
alter table nao_conformidades   enable row level security;

-- grupos / unidades: todos autenticados leem; só master escreve
create policy grupos_sel on grupos for select to authenticated using (true);
create policy grupos_all on grupos for all to authenticated using (is_master()) with check (is_master());
create policy unid_sel   on unidades for select to authenticated using (true);
create policy unid_all   on unidades for all to authenticated using (is_master()) with check (is_master());

-- padrões: todos leem; só master escreve
create policy area_sel on padrao_areas for select to authenticated using (true);
create policy area_all on padrao_areas for all to authenticated using (is_master()) with check (is_master());
create policy req_sel  on padrao_requisitos for select to authenticated using (true);
create policy req_all  on padrao_requisitos for all to authenticated using (is_master()) with check (is_master());

-- profiles: usuário lê o próprio; master lê/gerencia todos
create policy prof_sel_self   on profiles for select to authenticated using (id = auth.uid() or is_master());
create policy prof_ins_self   on profiles for insert to authenticated with check (id = auth.uid() or is_master());
create policy prof_upd        on profiles for update to authenticated using (id = auth.uid() or is_master()) with check (id = auth.uid() or is_master());
create policy prof_master_all on profiles for all to authenticated using (is_master()) with check (is_master());

-- auditorias: vê quem tem acesso à casa; cria/edita master ou auditor com acesso
create policy aud_sel on auditorias for select to authenticated
  using (can_access_unidade(unidade_id));
create policy aud_ins on auditorias for insert to authenticated
  with check (auth_papel() in ('master','auditor') and can_access_unidade(unidade_id));
create policy aud_upd on auditorias for update to authenticated
  using (auth_papel() in ('master','auditor') and can_access_unidade(unidade_id))
  with check (can_access_unidade(unidade_id));
create policy aud_del on auditorias for delete to authenticated using (is_master());

-- itens: herdam o acesso da auditoria-pai
create policy item_sel on auditoria_itens for select to authenticated
  using (exists (select 1 from auditorias a where a.id = auditoria_id and can_access_unidade(a.unidade_id)));
create policy item_ins on auditoria_itens for insert to authenticated
  with check (exists (select 1 from auditorias a where a.id = auditoria_id
             and auth_papel() in ('master','auditor') and can_access_unidade(a.unidade_id)));
create policy item_upd on auditoria_itens for update to authenticated
  using (exists (select 1 from auditorias a where a.id = auditoria_id
             and auth_papel() in ('master','auditor') and can_access_unidade(a.unidade_id)));

-- NCs: vê quem acessa a casa; trata master ou gestor; cria via auditor/master
create policy nc_sel on nao_conformidades for select to authenticated
  using (exists (select 1 from auditorias a where a.id = auditoria_id and can_access_unidade(a.unidade_id)));
create policy nc_ins on nao_conformidades for insert to authenticated
  with check (exists (select 1 from auditorias a where a.id = auditoria_id
             and auth_papel() in ('master','auditor') and can_access_unidade(a.unidade_id)));
create policy nc_upd on nao_conformidades for update to authenticated
  using (exists (select 1 from auditorias a where a.id = auditoria_id
             and auth_papel() in ('master','gestor') and can_access_unidade(a.unidade_id)))
  with check (true);

-- =====================================================================
--  Criação automática de profile no signup (papel inicial: visualizador)
-- =====================================================================
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, papel)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), new.email, 'visualizador')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
--  Storage: bucket das fotos de referência dos padrões
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('padroes','padroes', true)
on conflict (id) do nothing;

-- leitura pública das fotos; upload/alteração só master
create policy padroes_read on storage.objects for select
  using (bucket_id = 'padroes');
create policy padroes_write on storage.objects for insert to authenticated
  with check (bucket_id = 'padroes' and is_master());
create policy padroes_update on storage.objects for update to authenticated
  using (bucket_id = 'padroes' and is_master());
create policy padroes_delete on storage.objects for delete to authenticated
  using (bucket_id = 'padroes' and is_master());

-- =====================================================================
--  SEED — estrutura da rede e padrões DOS/DCS
-- =====================================================================
"""

def gen_seed():
    out = []
    # grupos
    out.append("insert into grupos (id, nome) values")
    rows = [f"  ('{g[0]}', '{q(g[1])}')" for g in GRUPOS]
    out.append(",\n".join(rows) + "\non conflict (id) do nothing;\n")
    # unidades
    out.append("insert into unidades (id, nome, grupo_id, tipo) values")
    urows = []
    for gid, gnome, casas in GRUPOS:
        for nome in casas:
            uid = f"{gid}:{slug(nome)}"
            urows.append(f"  ('{uid}', '{q(nome)}', '{gid}', 'concessionaria')")
    for nome in CSC_CASAS:
        uid = f"csc:{slug(nome)}"
        # grupo do CSC: usa o próprio grupo da casa se existir; aqui vinculamos ao grupo 'equipo' (Rio) como exemplo
        urows.append(f"  ('{uid}', 'CSC {q(nome)}', 'equipo', 'csc')")
    out.append(",\n".join(urows) + "\non conflict (id) do nothing;\n")

    # padrões: áreas + requisitos
    out.append("-- Padrões DOS/DCS (áreas e requisitos)")
    out.append("do $$\ndeclare a_id uuid;\nbegin")
    for tipo, (nome, areas) in STANDARDS.items():
        for ai, (area, reqs) in enumerate(areas):
            out.append(f"  insert into padrao_areas (tipo, nome, ordem) values ('{tipo}', '{q(area)}', {ai}) returning id into a_id;")
            for ri, (cod, titulo) in enumerate(reqs):
                out.append(f"  insert into padrao_requisitos (area_id, codigo, titulo, ordem) values (a_id, '{cod}', '{q(titulo)}', {ri});")
    out.append("end $$;\n")
    return "\n".join(out)

with open("/mnt/user-data/outputs/supabase/schema.sql","w") as f:
    f.write(DDL + "\n" + gen_seed() + "\n")

print("schema.sql gerado com sucesso")
