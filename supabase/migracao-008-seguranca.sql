-- Migração 008 — Correções de segurança (rode antes de publicar)
-- 1) can_access_unidade: passou a tratar acesso por CASA (escopo 'unidade')
--    e corrige o join que estava frouxo (era left join com condição errada).
-- 2) nc_upd: remove o papel 'gestor' (que não existe mais) e libera Auditor.

-- ---------- 1) Função de acesso por casa ----------
create or replace function can_access_unidade(u_id text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from profiles p
    join unidades u on u.id = u_id
    where p.id = auth.uid()
      and (
        p.papel = 'master'
        or p.escopo_tipo = 'all'
        or (p.escopo_tipo = 'grupo'    and p.escopo_grupo_id = u.grupo_id)
        or (p.escopo_tipo = 'unidade'  and p.escopo_unidade_id = u.id)
      )
  );
$$;

-- ---------- 2) Policy de atualização de NC (Master + Auditor) ----------
drop policy if exists nc_upd on nao_conformidades;
create policy nc_upd on nao_conformidades for update to authenticated
using (exists (
  select 1 from auditorias a
  where a.id = nao_conformidades.auditoria_id
    and auth_papel() = any (array['master','auditor']::papel_usuario[])
    and can_access_unidade(a.unidade_id)
));
