import { UNITS, GRUPOS_ALL, ROLES, PERMS } from "./constants";

const rawModo = (tipo, standards) => standards?.[tipo]?.modo || "unidade";
const modoDoTema = (tipo, standards) => {
  const m = rawModo(tipo, standards);
  return (m === "escolha" || m === "funcionario") ? "colaborador" : m;
};
const ehColaborador = (m) => m === "colaborador" || m === "escolha" || m === "funcionario";
const modoTag = (m) => ({ unidade: "casa", departamento: "depto", colaborador: "colab", funcionario: "colab", escolha: "colab", processo: "proc" }[m] || m);
const unitById = (id, unidades = UNITS) => unidades.find((u) => u.id === id);
// grupo virtual "csc": junta as unidades tipo 'csc' (não têm grupo_id 'csc' no banco).
// grupos reais: exclui as tipo 'csc' (elas já aparecem na seção CSC acima).
const unitsOfGrupo = (gid, unidades = UNITS) => gid === "csc"
  ? unidades.filter((u) => u.tipo === "csc")
  : unidades.filter((u) => u.grupoId === gid && u.tipo !== "csc");
// grupos reais (do banco, sem CSC) + grupo virtual CSC, só se houver alguma unidade tipo 'csc'.
const gruposParaExibicao = (grupos, unidades) =>
  unidades.some((u) => u.tipo === "csc") ? [...grupos, { id: "csc", nome: "CSC · Controladoria" }] : grupos;

function flattenReqs(tipo, standards) {
  if (!standards?.[tipo]) return [];
  return standards[tipo].areas.flatMap((a) =>
    a.reqs.map((r) => ({ area: a.area, codigo: r.c, requisito: r.t, instrucao: r.instrucao || "", foto: r.foto || null }))
  );
}
function findReq(standards, tipo, codigo) {
  if (!standards?.[tipo]) return null;
  for (const a of standards[tipo].areas)
    for (const r of a.reqs) if (r.c === codigo) return { ...r, area: a.area };
  return null;
}
const can = (papel, action) => PERMS[papel]?.includes(action);
const roleLabel = (p) => ROLES[p]?.label || p || "—";

function allowedUnits(user, unidades = UNITS) {
  if (!user || user.escopo === "all" || can(user.papel, "all_houses")) return unidades;
  if (user.escopo?.grupo) return unitsOfGrupo(user.escopo.grupo, unidades);
  if (user.escopo?.unidades) return unidades.filter((u) => user.escopo.unidades.includes(u.id));
  return unidades;
}
function escopoLabel(escopo, unidades = UNITS, gruposAll = GRUPOS_ALL) {
  if (escopo === "all") return "Todas as casas";
  if (escopo?.grupo) return gruposAll.find((g) => g.id === escopo.grupo)?.nome || "Grupo";
  if (escopo?.unidades) return escopo.unidades.map((id) => unitById(id, unidades)?.nome || id).join(", ");
  if (escopo?.unidade) return unitById(escopo.unidade, unidades)?.nome || "Casa";
  return "—";
}
function computeMetrics(audits, ncs) {
  const concl = audits.filter((a) => a.status === "concluida");
  const avaliado = (r) => r === "conforme" || r === "nao_conforme";
  const itens = concl.flatMap((a) => a.itens).filter((i) => avaliado(i.resultado));
  const conf = itens.filter((i) => i.resultado === "conforme").length;
  const taxa = itens.length ? Math.round((conf / itens.length) * 100) : 0;
  const porArea = {};
  concl.forEach((a) => a.itens.forEach((i) => {
    if (!avaliado(i.resultado)) return;
    porArea[i.area] = porArea[i.area] || { area: i.area, ok: 0, tot: 0 };
    porArea[i.area].tot++; if (i.resultado === "conforme") porArea[i.area].ok++;
  }));
  const barData = Object.values(porArea).map((x) => ({
    area: x.area.split(" ")[0], taxa: Math.round((x.ok / x.tot) * 100),
  }));
  const abertas = ncs.filter((n) => n.status === "aberta").length;
  const trat = ncs.filter((n) => n.status === "em_tratamento").length;
  const resolv = ncs.filter((n) => n.status === "resolvida").length;
  // OPEG: média de pontuação e contagem por classificação
  const opeg = concl.filter((a) => a.tipo === "OPEG" && a.pontuacao != null);
  const opegMedia = opeg.length ? Math.round(opeg.reduce((s, a) => s + a.pontuacao, 0) / opeg.length) : null;
  const opegClassif = { "Ouro": 0, "Prata": 0, "Bronze": 0, "Sem classificação": 0 };
  opeg.forEach((a) => { opegClassif[a.classificacao] = (opegClassif[a.classificacao] || 0) + 1; });
  return { taxa, totalAud: audits.length, concluidas: concl.length, abertas, trat, resolv, barData,
    opegMedia, opegClassif, opegCount: opeg.length,
    pieData: [
      { name: "Aberta", value: abertas, fill: "var(--no)" },
      { name: "Em tratamento", value: trat, fill: "var(--warn)" },
      { name: "Resolvida", value: resolv, fill: "var(--ok)" },
    ].filter((d) => d.value > 0) };
}

// estatística resumida por casa (para a aba Casas)
function unitStats(unidadeId, audits, ncs) {
  const uAud = audits.filter((a) => a.unidadeId === unidadeId);
  const concl = uAud.filter((a) => a.status === "concluida");
  const itens = concl.flatMap((a) => a.itens).filter((i) => i.resultado === "conforme" || i.resultado === "nao_conforme");
  const conf = itens.filter((i) => i.resultado === "conforme").length;
  const taxa = itens.length ? Math.round((conf / itens.length) * 100) : null;
  const idset = new Set(uAud.map((a) => a.id));
  const abertas = ncs.filter((n) => idset.has(n.auditoriaId) && n.status !== "resolvida").length;
  return { total: uAud.length, concluidas: concl.length, taxa, abertas };
}
function initials(nome) { return nome.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }
function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) { if (!d) return "—"; const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; }
function titleMap(v) { return { dashboard: "Visão geral", casas: "Casas", auditorias: "Diagnósticos", ncs: "Não conformidades", padroes: "Padrões", usuarios: "Usuários", colaboradores: "Colaboradores" }[v]; }
function titleEyebrow(v) { return { dashboard: "Painel", casas: "Rede WLM", auditorias: "Gestão", ncs: "Tratamento", padroes: "Referência", usuarios: "Acessos", colaboradores: "Cadastro" }[v]; }

export { rawModo, modoDoTema, ehColaborador, modoTag, unitById, unitsOfGrupo, gruposParaExibicao, flattenReqs, findReq, can, roleLabel, allowedUnits, escopoLabel, computeMetrics, unitStats, initials, today, fmtDate, titleMap, titleEyebrow };
