// src/lib/db.js
// Camada de dados do portal. Fala com o Supabase e entrega os dados já no
// formato que os componentes usam (camelCase), para o App mudar o mínimo.
import { createClient } from "@supabase/supabase-js";
import { supabase, SUPA_URL, SUPA_ANON } from "./supabaseClient";
import { slug } from "../constants";
import { prepararFotoParaUpload } from "./imagem";

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

/* ---------- Estrutura da rede (grupos/unidades) ---------- */
export async function listGrupos() {
  const { data, error } = await supabase.from("grupos").select("id, nome").order("nome");
  if (error) throw error;
  return (data || []).map((g) => ({ id: g.id, nome: g.nome }));
}
export async function listUnidades() {
  const [{ data: grp, error: e1 }, { data: uni, error: e2 }] = await Promise.all([
    supabase.from("grupos").select("id, nome"),
    supabase.from("unidades").select("id, nome, grupo_id, tipo, sigla").order("nome"),
  ]);
  if (e1) throw e1; if (e2) throw e2;
  const nomeDoGrupo = Object.fromEntries((grp || []).map((g) => [g.id, g.nome]));
  return (uni || []).map((u) => ({
    id: u.id, nome: u.nome, grupoId: u.grupo_id,
    grupoNome: u.tipo === "csc" ? "CSC · Controladoria" : (nomeDoGrupo[u.grupo_id] || u.grupo_id),
    tipo: u.tipo, sigla: u.sigla || "",
  }));
}

// Cria uma concessão (grupo) nova. O id é gerado do nome com a MESMA regra slug
// usada em constants.js — não é recebido de fora, pra não haver duas fontes de regra.
export async function createGrupo({ nome }) {
  const id = slug(nome);
  const { data: existente, error: e0 } = await supabase.from("grupos").select("id").eq("id", id).maybeSingle();
  if (e0) throw e0;
  if (existente) throw new Error(`Já existe uma concessão com esse nome ("${nome}").`);
  const { error } = await supabase.from("grupos").insert({ id, nome });
  if (error) {
    if (error.code === "23505") throw new Error(`Já existe uma concessão com esse nome ("${nome}").`);
    if (error.code === "42501") throw new Error("Você não tem permissão para criar concessões (só o Master pode).");
    throw new Error(error.message || "Não foi possível criar a concessão.");
  }
  return { id, nome };
}
// Cria uma casa (unidade) nova. O id segue a regra atual: "<grupoId>:<slug(nome)>"
// para concessionária; para CSC usa o mesmo prefixo fixo "csc:" que a CSC Rio já usa
// hoje, mas grava o grupo_id REAL escolhido (não "csc" — esse id não existe em `grupos`).
export async function createUnidade({ nome, grupoId, tipo = "concessionaria", sigla = "" }) {
  const id = tipo === "csc" ? `csc:${slug(nome)}` : `${grupoId}:${slug(nome)}`;
  const { data: existente, error: e0 } = await supabase.from("unidades").select("id").eq("id", id).maybeSingle();
  if (e0) throw e0;
  if (existente) throw new Error(`Já existe uma casa com esse nome nessa concessão ("${nome}").`);
  const { error } = await supabase.from("unidades")
    .insert({ id, nome, grupo_id: grupoId, tipo, sigla: (sigla || "").toUpperCase() || null });
  if (error) {
    if (error.code === "23505") throw new Error(`Já existe uma casa com esse nome nessa concessão ("${nome}").`);
    if (error.code === "42501") throw new Error("Você não tem permissão para criar casas (só o Master pode).");
    throw new Error(error.message || "Não foi possível criar a casa.");
  }
  return { id, nome, grupoId, tipo, sigla: (sigla || "").toUpperCase() };
}

// Renomeia uma concessão. Só o "nome" muda — o id nunca é tocado (é referenciado
// por unidades.grupo_id e profiles.escopo_grupo_id).
export async function renameGrupo(id, nome) {
  const n = (nome || "").trim();
  if (!n) throw new Error("O nome não pode ficar vazio.");
  const { error } = await supabase.from("grupos").update({ nome: n }).eq("id", id);
  if (error) {
    if (error.code === "42501") throw new Error("Você não tem permissão para renomear concessões (só o Master pode).");
    throw new Error(error.message || "Não foi possível renomear a concessão.");
  }
}
// Renomeia uma casa. Só o "nome" muda — id, grupo_id, tipo e sigla ficam intactos
// (id é referenciado por auditorias, colaboradores e profiles).
export async function renameUnidade(id, nome) {
  const n = (nome || "").trim();
  if (!n) throw new Error("O nome não pode ficar vazio.");
  const { error } = await supabase.from("unidades").update({ nome: n }).eq("id", id);
  if (error) {
    if (error.code === "42501") throw new Error("Você não tem permissão para renomear casas (só o Master pode).");
    throw new Error(error.message || "Não foi possível renomear a casa.");
  }
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
  const foto = await prepararFotoParaUpload(file);
  const ext = (foto.name.split(".").pop() || "jpg");
  const path = `req/${requisitoId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("padroes").upload(path, foto, { upsert: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[uploadFotoRequisito] Supabase Storage:", error);
    throw new Error(`Falha ao enviar a foto: ${error.message || error}`);
  }
  await updateRequisito(requisitoId, { foto_path: path });
  return publicFotoUrl(path);
}

export async function uploadFotoItem(itemId, slot, file) {
  const foto = await prepararFotoParaUpload(file);
  const ext = (foto.name.split(".").pop() || "jpg");
  const path = `evid/${itemId}-${slot}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("padroes").upload(path, foto, { upsert: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[uploadFotoItem] Supabase Storage:", error);
    throw new Error(`Falha ao enviar a foto: ${error.message || error}`);
  }
  const col = slot === 2 ? "foto2_path" : "foto1_path";
  const { error: e2 } = await supabase.from("auditoria_itens").update({ [col]: path }).eq("id", itemId);
  if (e2) {
    // eslint-disable-next-line no-console
    console.error("[uploadFotoItem] update auditoria_itens:", e2);
    throw new Error(`Foto enviada, mas falhou ao salvar no diagnóstico: ${e2.message || e2}`);
  }
  return { path, url: publicFotoUrl(path) };
}
export async function removeFotoItem(itemId, slot) {
  const col = slot === 2 ? "foto2_path" : "foto1_path";
  const { error } = await supabase.from("auditoria_itens").update({ [col]: null }).eq("id", itemId);
  if (error) throw error;
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
      foto1_path: i.foto1_path || null, foto2_path: i.foto2_path || null,
      foto1: i.foto1_path ? publicFotoUrl(i.foto1_path) : null,
      foto2: i.foto2_path ? publicFotoUrl(i.foto2_path) : null,
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
  // deduplica por requisito único (código+área+sujeito): em modo departamento uma
  // área "sem departamento" (geral) entra pra qualquer departamento, e se o padrão
  // tiver alguma área sobreposta com o mesmo requisito, sem isso ele duplicaria
  // no diagnóstico.
  const vistos = new Set();
  itens = itens.filter((it) => {
    const chave = `${it.area}|${it.codigo}|${it.colaborador_id || ""}|${it.processo || ""}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
  if (itens.length) {
    const { error: e2 } = await supabase.from("auditoria_itens").insert(itens);
    if (e2) throw e2;
  }
  return aud.id;
}
// Apaga um diagnóstico e seus dependentes, na ordem que respeita as FKs mesmo que
// o ON DELETE CASCADE de auditoria_itens/nao_conformidades não esteja ativo no banco
// (o schema.sql do repo declara CASCADE nas duas, mas não temos garantia de que o
// banco vivo bate 100% com esse arquivo — já vimos divergências antes). Master only
// (RLS: aud_del é is_master(); ver nota sobre item/nc abaixo).
export async function deleteAuditoria(id) {
  const { error: e1 } = await supabase.from("nao_conformidades").delete().eq("auditoria_id", id);
  if (e1) {
    if (e1.code === "42501") throw new Error("Sem permissão para apagar as não conformidades deste diagnóstico (só o Master pode).");
    throw new Error(e1.message || "Não foi possível apagar as não conformidades deste diagnóstico.");
  }
  const { error: e2 } = await supabase.from("auditoria_itens").delete().eq("auditoria_id", id);
  if (e2) {
    if (e2.code === "42501") throw new Error("Sem permissão para apagar os itens deste diagnóstico (só o Master pode).");
    throw new Error(e2.message || "Não foi possível apagar os itens deste diagnóstico.");
  }
  const { error: e3 } = await supabase.from("auditorias").delete().eq("id", id);
  if (e3) {
    if (e3.code === "42501") throw new Error("Sem permissão para apagar diagnósticos (só o Master pode).");
    throw new Error(e3.message || "Não foi possível apagar o diagnóstico.");
  }
}
export async function saveRascunho(auditoriaId, itens) {
  const rows = itens.map((it) => ({
    id: it.id, auditoria_id: auditoriaId, area: it.area, codigo: it.codigo, requisito: it.requisito,
    resultado: it.resultado, obs: it.obs || "", peso: it.peso ?? 1,
    colaborador_id: it.colaboradorId || null, processo: it.processo || null,
  }));
  if (rows.length) {
    const { error } = await supabase.from("auditoria_itens").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
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
    const feitos = itens.filter((it) => it.resultado === "conforme").reduce((s, it) => s + (it.peso ?? 1), 0);
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
    unidadeId: c.unidade_id, atividades: c.atividades || [], treinamentos: c.treinamentos || {},
  }));
}
export async function createColaborador({ nome, cargo, departamento, unidadeId, atividades = [], treinamentos = {} }) {
  const { error } = await supabase.from("colaboradores")
    .insert({ nome, cargo, departamento, unidade_id: unidadeId, atividades, treinamentos });
  if (error) throw error;
}
export async function updateColaborador(id, { nome, cargo, departamento, unidadeId, atividades, treinamentos }) {
  const patch = {};
  if (nome !== undefined) patch.nome = nome;
  if (cargo !== undefined) patch.cargo = cargo;
  if (departamento !== undefined) patch.departamento = departamento;
  if (unidadeId !== undefined) patch.unidade_id = unidadeId;
  if (atividades !== undefined) patch.atividades = atividades;
  if (treinamentos !== undefined) patch.treinamentos = treinamentos;
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
    responsavelUnidades: p.responsavel_unidades || [],
  }));
}
// Cria o usuário. Tenta a Edge Function (fluxo ideal); se não estiver publicada,
// cai no cadastro direto (signUp) — que exige, no Supabase, "Confirm email" desligado.
export async function criarUsuario({ nome, email, papel, escopo, responsavelUnidades = [] }) {
  const escopo_tipo = escopo === "all" ? "all" : escopo?.grupo ? "grupo" : "unidade";
  const escopo_grupo_id = escopo?.grupo || null;
  const escopo_unidade_id = escopo?.unidade || null;

  // 1) tenta a Edge Function
  try {
    const { data, error } = await supabase.functions.invoke("criar-usuario", {
      body: { nome, email, papel, escopo_tipo, escopo_grupo_id, escopo_unidade_id, responsavel_unidades: responsavelUnidades },
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
    id: uid, nome, email, papel, escopo_tipo, escopo_grupo_id, escopo_unidade_id,
    responsavel_unidades: responsavelUnidades, senha_provisoria: true,
  });
  if (pe) throw pe;
  return { ok: true, id: uid, fallback: true };
}
// Lista enxuta (id, nome, responsavel_unidades) via RPC security definer — liberada
// para qualquer autenticado, sem expor e-mail/papel/escopo de outros usuários.
export async function listResponsaveis() {
  const { data, error } = await supabase.rpc("list_responsaveis");
  if (error) throw error;
  return (data || []).map((p) => ({
    id: p.id, nome: p.nome, responsavelUnidades: p.responsavel_unidades || [],
  }));
}
// Atualiza dados de um usuário existente. Não mexe em login/senha — só o profile.
export async function atualizarUsuario(id, { nome, papel, escopo, responsavelUnidades }) {
  const patch = {};
  if (nome !== undefined) patch.nome = nome;
  if (papel !== undefined) patch.papel = papel;
  if (escopo !== undefined) {
    patch.escopo_tipo = escopo === "all" ? "all" : escopo?.grupo ? "grupo" : "unidade";
    patch.escopo_grupo_id = escopo?.grupo || null;
    patch.escopo_unidade_id = escopo?.unidade || null;
  }
  if (responsavelUnidades !== undefined) patch.responsavel_unidades = responsavelUnidades;
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw error;
}
