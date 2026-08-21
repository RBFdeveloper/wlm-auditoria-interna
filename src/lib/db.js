// src/lib/db.js
// Camada de dados do portal. Fala com o Supabase e entrega os dados já no
// formato que os componentes usam (camelCase), para o App mudar o mínimo.
import { createClient } from "@supabase/supabase-js";
import { supabase, SUPA_URL, SUPA_ANON } from "./supabaseClient";

/* ============================ AUTH ============================ */
export const auth = {
  async login(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
    return data.user;
  },
  async logout() { await supabase.auth.signOut(); },
  // profile (papel/escopo) do usuário logado, ou null
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!p) return { id: user.id, nome: user.email, email: user.email, papel: "visualizador", escopo: "all", senhaProvisoria: false };
    return {
      id: p.id, nome: p.nome, email: p.email, papel: p.papel,
      escopo: mapEscopo(p), senhaProvisoria: !!p.senha_provisoria,
    };
  },
  // define nova senha e desmarca a senha provisória
  async setPassword(nova) {
    const { error } = await supabase.auth.updateUser({ password: nova });
    if (error) throw error;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ senha_provisoria: false }).eq("id", user.id);
  },
  onChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  },
};

function mapEscopo(p) {
  if (p.escopo_tipo === "grupo") return { grupo: p.escopo_grupo_id };
  if (p.escopo_tipo === "unidade") return { unidades: [p.escopo_unidade_id] };
  return "all";
}

/* ============================ TEMAS ============================ */
export async function listTemas() {
  const { data, error } = await supabase.from("temas").select("*").eq("ativo", true).order("ordem");
  if (error) throw error;
  return (data || []).map((t) => ({ codigo: t.codigo, nome: t.nome, modo: t.modo, ordem: t.ordem }));
}
export async function createTema({ codigo, nome, modo = "unidade", ordem = 0 }) {
  const { error } = await supabase.from("temas").insert({ codigo: codigo.toUpperCase(), nome, modo, ordem });
  if (error) throw error;
}
export async function deleteTema(codigo) {
  const { error } = await supabase.from("temas").update({ ativo: false }).eq("codigo", codigo);
  if (error) throw error;
}
export async function updateTemaModo(codigo, modo) {
  const { error } = await supabase.from("temas").update({ modo }).eq("codigo", codigo);
  if (error) throw error;
}

/* ============================ PADRÕES ============================ */
export function publicFotoUrl(path) {
  return supabase.storage.from("padroes").getPublicUrl(path).data.publicUrl;
}

// Monta { [temaCodigo]: {nome, modo, areas:[{id,area,reqs:[...]}]} } dinamicamente.
export async function listStandards() {
  const [{ data: temas }, { data: areas, error: e1 }, { data: reqs, error: e2 }] = await Promise.all([
    supabase.from("temas").select("*").eq("ativo", true).order("ordem"),
    supabase.from("padrao_areas").select("*").order("ordem"),
    supabase.from("padrao_requisitos").select("*").order("ordem"),
  ]);
  if (e1) throw e1; if (e2) throw e2;
  const std = {};
  for (const t of temas || []) std[t.codigo] = { nome: t.nome, modo: t.modo, areas: [] };
  for (const a of areas || []) {
    if (!std[a.tipo]) std[a.tipo] = { nome: a.tipo, modo: "unidade", areas: [] };
    const rs = (reqs || []).filter((r) => r.area_id === a.id).map((r) => ({
      id: r.id, c: r.codigo, t: r.titulo, instrucao: r.instrucao || "", peso: r.peso ?? 1,
      foto: r.foto_path ? publicFotoUrl(r.foto_path) : null, foto_path: r.foto_path,
    }));
    std[a.tipo].areas.push({ id: a.id, area: a.nome, departamento: a.departamento || "", reqs: rs });
  }
  return std;
}
export async function addArea(tipo, nome, ordem = 0) {
  const { data, error } = await supabase.from("padrao_areas").insert({ tipo, nome, ordem }).select().single();
  if (error) throw error; return data;
}

/* ---------- Siglas das casas (para o código) ---------- */
export async function listSiglas() {
  const { data, error } = await supabase.from("unidades").select("id, sigla");
  if (error) throw error;
  return Object.fromEntries((data || []).map((u) => [u.id, u.sigla || ""]));
}
export async function updateSigla(unidadeId, sigla) {
  const { error } = await supabase.from("unidades").update({ sigla: (sigla || "").toUpperCase() }).eq("id", unidadeId);
  if (error) throw error;
}
export async function updateArea(id, patch) {
  const { error } = await supabase.from("padrao_areas").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteArea(id) {
  const { error } = await supabase.from("padrao_areas").delete().eq("id", id);
  if (error) throw error;
}
export async function addRequisito(area_id, { codigo, titulo, instrucao = "", ordem = 0 }) {
  const { data, error } = await supabase.from("padrao_requisitos")
    .insert({ area_id, codigo, titulo, instrucao, ordem }).select().single();
  if (error) throw error; return data;
}
export async function updateRequisito(id, patch) {
  const { error } = await supabase.from("padrao_requisitos").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteRequisito(id) {
  const { error } = await supabase.from("padrao_requisitos").delete().eq("id", id);
  if (error) throw error;
}
export async function uploadFotoRequisito(requisitoId, file) {
  const ext = (file.name.split(".").pop() || "jpg");
  const path = `req/${requisitoId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("padroes").upload(path, file, { upsert: true });
  if (error) throw error;
  await updateRequisito(requisitoId, { foto_path: path });
  return publicFotoUrl(path);
}

/* ============================ AUDITORIAS ============================ */
function mapAudit(row) {
  return {
    id: row.id, codigo: row.codigo, codigoFmt: row.codigo_fmt || null, tipo: row.tipo, unidadeId: row.unidade_id,
    setor: row.setor, auditor: row.auditor, responsavel: row.setor,
    data: row.data, status: row.status, modo: row.modo || "unidade",
    departamento: row.departamento || null, responsavelNome: row.responsavel_nome || null,
    pontuacao: row.pontuacao ?? null, classificacao: row.classificacao || null,
    itens: (row.itens || []).map((i) => ({
      id: i.id, area: i.area, codigo: i.codigo, requisito: i.requisito,
      resultado: i.resultado, obs: i.obs || "", colaboradorId: i.colaborador_id || null, processo: i.processo || null,
      peso: i.peso ?? 1,
    })),
  };
}
export async function listAuditorias() {
  const { data, error } = await supabase
    .from("auditorias").select("*, itens:auditoria_itens(*)")
    .order("data", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAudit);
}
// p: { tipo, unidadeId, setor, auditor, data, standards, modo, colaboradores?, processos?, sigla }
export async function createAuditoria({
  tipo, unidadeId, setor, auditor, data, standards, modo = "unidade",
  colaboradores = [], sigla = "", departamento = null, responsavelNome = null,
}) {
  // sequência: nº de auditorias deste tema, nesta casa, neste ano
  const ano = (data || "").slice(0, 4) || String(new Date().getFullYear());
  const { count } = await supabase.from("auditorias")
    .select("*", { count: "exact", head: true })
    .eq("tipo", tipo).eq("unidade_id", unidadeId)
    .gte("data", `${ano}-01-01`).lte("data", `${ano}-12-31`);
  const seq = (count || 0) + 1;
  const codigoFmt = `${tipo}${(sigla || "").toUpperCase()}${String(seq).padStart(2, "0")}/${ano.slice(2)}`;

  const { data: aud, error } = await supabase.from("auditorias")
    .insert({
      tipo, unidade_id: unidadeId, setor, auditor, data, status: "em_andamento",
      modo, codigo_fmt: codigoFmt, departamento, responsavel_nome: responsavelNome,
    })
    .select().single();
  if (error) throw error;

  const areasDoModo = (atividades) => {
    let areas = standards[tipo].areas;
    if (modo === "departamento" && departamento) areas = areas.filter((a) => a.departamento === departamento || !a.departamento);
    if (modo === "colaborador" && atividades && atividades.length) areas = areas.filter((a) => atividades.includes(a.area));
    return areas;
  };
  const reqsDe = (areas) => areas.flatMap((a) => a.reqs.map((r) => ({ area: a.area, codigo: r.c, requisito: r.t, peso: r.peso ?? 1 })));

  let itens;
  if (modo === "colaborador" || modo === "funcionario") {
    itens = colaboradores.flatMap((c) =>
      reqsDe(areasDoModo(c.atividades)).map((r) => ({ auditoria_id: aud.id, colaborador_id: c.id, ...r, resultado: "pendente", obs: "" })));
  } else {
    itens = reqsDe(areasDoModo()).map((r) => ({ auditoria_id: aud.id, ...r, resultado: "pendente", obs: "" }));
  }
  if (itens.length) {
    const { error: e2 } = await supabase.from("auditoria_itens").insert(itens);
    if (e2) throw e2;
  }
  return aud.id;
}
export async function saveExecucao(auditoriaId, tipo, itens, colaboradorNome = {}) {
  // salva TODOS os itens numa única chamada (rápido) em vez de um a um
  const rows = itens.map((it) => ({
    id: it.id, auditoria_id: auditoriaId, area: it.area, codigo: it.codigo, requisito: it.requisito,
    resultado: it.resultado, obs: it.obs || "",
    colaborador_id: it.colaboradorId || null, processo: it.processo || null, peso: it.peso ?? 1,
  }));
  if (rows.length) {
    const { error } = await supabase.from("auditoria_itens").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
  const patchAud = { status: "concluida" };
  if (tipo === "OPEG") {
    const total = itens.reduce((s, it) => s + (it.peso ?? 1), 0);
    const feitos = itens.filter((it) => it.resultado === "atende").reduce((s, it) => s + (it.peso ?? 1), 0);
    const pontos = total > 0 ? Math.round((feitos / total) * 100) : 0;
    patchAud.pontuacao = pontos;
    patchAud.classificacao = pontos >= 90 ? "Ouro" : pontos >= 80 ? "Prata" : pontos >= 70 ? "Bronze" : "Sem classificação";
  }
  await supabase.from("auditorias").update(patchAud).eq("id", auditoriaId);
  const { data: existentes } = await supabase.from("nao_conformidades")
    .select("codigo, colaborador_id, processo").eq("auditoria_id", auditoriaId);
  const key = (c, cid, proc) => `${c}|${cid || ""}|${proc || ""}`;
  const jaTem = new Set((existentes || []).map((n) => key(n.codigo, n.colaborador_id, n.processo)));
  const novas = itens
    .filter((it) => it.resultado === "nao_conforme" && !jaTem.has(key(it.codigo, it.colaboradorId, it.processo)))
    .map((it) => ({
      auditoria_id: auditoriaId, tipo, area: it.area, codigo: it.codigo, requisito: it.requisito,
      descricao: it.obs || "Requisito não atendido.", severidade: "media", status: "aberta",
      colaborador_id: it.colaboradorId || null, colaborador_nome: colaboradorNome[it.colaboradorId] || null,
      processo: it.processo || null,
    }));
  if (novas.length) {
    const { error } = await supabase.from("nao_conformidades").insert(novas);
    if (error) throw error;
  }
}

/* ============================ COLABORADORES ============================ */
export async function listColaboradores() {
  const { data, error } = await supabase.from("colaboradores").select("*").eq("ativo", true).order("nome");
  if (error) throw error;
  return (data || []).map((c) => ({
    id: c.id, nome: c.nome, cargo: c.cargo || "", departamento: c.departamento || "",
    unidadeId: c.unidade_id, atividades: c.atividades || [],
  }));
}
export async function createColaborador({ nome, cargo, departamento, unidadeId, atividades = [] }) {
  const { error } = await supabase.from("colaboradores")
    .insert({ nome, cargo, departamento, unidade_id: unidadeId, atividades });
  if (error) throw error;
}
export async function updateColaborador(id, { nome, cargo, departamento, unidadeId, atividades }) {
  const patch = {};
  if (nome !== undefined) patch.nome = nome;
  if (cargo !== undefined) patch.cargo = cargo;
  if (departamento !== undefined) patch.departamento = departamento;
  if (unidadeId !== undefined) patch.unidade_id = unidadeId;
  if (atividades !== undefined) patch.atividades = atividades;
  const { error } = await supabase.from("colaboradores").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteColaborador(id) {
  const { error } = await supabase.from("colaboradores").update({ ativo: false }).eq("id", id);
  if (error) throw error;
}

/* ============================ NÃO CONFORMIDADES ============================ */
function mapNC(row) {
  return {
    id: row.id, auditoriaId: row.auditoria_id, tipo: row.tipo, area: row.area,
    codigo: row.codigo, requisito: row.requisito, descricao: row.descricao || "",
    severidade: row.severidade, status: row.status, planoAcao: row.plano_acao || "",
    responsavel: row.responsavel || "", prazo: row.prazo || "",
    colaboradorNome: row.colaborador_nome || null, processo: row.processo || null,
  };
}
export async function listNCs() {
  const { data, error } = await supabase.from("nao_conformidades")
    .select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapNC);
}
export async function tratarNC(id, patch) {
  const dbPatch = {
    status: patch.status, severidade: patch.severidade,
    plano_acao: patch.planoAcao, responsavel: patch.responsavel,
    prazo: patch.prazo || null,
  };
  const { error } = await supabase.from("nao_conformidades").update(dbPatch).eq("id", id);
  if (error) throw error;
}

/* ============================ USUÁRIOS ============================ */
export async function listUsuarios() {
  const { data, error } = await supabase.from("profiles").select("*").order("nome");
  if (error) throw error;
  return (data || []).map((p) => ({
    id: p.id, nome: p.nome, email: p.email, papel: p.papel, escopo: mapEscopo(p),
  }));
}
// Cria o usuário. Tenta a Edge Function (fluxo ideal); se não estiver publicada,
// cai no cadastro direto (signUp) — que exige, no Supabase, "Confirm email" desligado.
export async function criarUsuario({ nome, email, papel, escopo }) {
  const escopo_tipo = escopo === "all" ? "all" : escopo?.grupo ? "grupo" : "unidade";
  const escopo_grupo_id = escopo?.grupo || null;
  const escopo_unidade_id = escopo?.unidade || null;

  // 1) tenta a Edge Function
  try {
    const { data, error } = await supabase.functions.invoke("criar-usuario", {
      body: { nome, email, papel, escopo_tipo, escopo_grupo_id, escopo_unidade_id },
    });
    if (!error && data && !data.error) return data;
  } catch (_) { /* segue para o fallback */ }

  // 2) fallback: cadastra num cliente isolado (não mexe na sessão do master)
  const tmp = createClient(SUPA_URL, SUPA_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: su, error: se } = await tmp.auth.signUp({
    email, password: "Peg@2026", options: { data: { nome } },
  });
  if (se) throw se;
  const uid = su.user?.id;
  if (!uid) throw new Error("Cadastro criado, mas exige confirmação de e-mail. Desative 'Confirm email' no Supabase (Authentication → Providers → Email).");

  // grava papel/escopo no profile (o master tem permissão via RLS)
  const { error: pe } = await supabase.from("profiles").upsert({
    id: uid, nome, email, papel, escopo_tipo, escopo_grupo_id, escopo_unidade_id, senha_provisoria: true,
  });
  if (pe) throw pe;
  return { ok: true, id: uid, fallback: true };
}
