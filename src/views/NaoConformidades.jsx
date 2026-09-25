import React, { useState } from "react";
import { ClipboardList, FileText, Building2, Contact, ShieldCheck, Search } from "lucide-react";
import { NC_STATUS, SEV, UNITS } from "../constants";
import { unitById, fmtDate } from "../utils";
import { Empty, StatusPill } from "../ui/common";

function NaoConformidades({ ncs, audits = [], responsaveis = [], units = UNITS, canTreat, onTreat }) {
  const [fst, setFst] = useState("todos");
  const [fcasa, setFcasa] = useState("todas");
  const [q, setQ] = useState("");
  const audById = (id) => audits.find((a) => a.id === id);
  const respDaCasa = (unidadeId) => {
    const nomes = responsaveis.filter((u) => u.responsavelUnidades?.includes(unidadeId)).map((u) => u.nome);
    return nomes.length ? nomes.join(", ") : "sem responsável definido";
  };
  // casas presentes nas NCs
  const casasNC = [...new Set(ncs.map((n) => audById(n.auditoriaId)?.unidadeId).filter(Boolean))];
  const list = ncs.filter((n) => {
    const a = audById(n.auditoriaId);
    const texto = q.trim().toLowerCase();
    const buscaOk = !texto ||
      (a && unitById(a.unidadeId, units)?.nome.toLowerCase().includes(texto)) ||
      (a?.codigoFmt || "").toLowerCase().includes(texto);
    return (fst === "todos" || n.status === fst) && (fcasa === "todas" || a?.unidadeId === fcasa) && buscaOk;
  });
  return (
    <div className="card">
      <div className="filtros">
        <div className="search">
          <Search size={16} />
          <input placeholder="Buscar por casa ou código do diagnóstico" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg">
          {["todos", "aberta", "em_tratamento", "resolvida"].map((s) => (
            <button key={s} className={fst === s ? "on" : ""} onClick={() => setFst(s)}>
              {s === "todos" ? "Todas" : NC_STATUS[s].label}
            </button>
          ))}
        </div>
        {casasNC.length > 1 && (
          <select className="mini-select" value={fcasa} onChange={(e) => setFcasa(e.target.value)}>
            <option value="todas">Todas as casas</option>
            {casasNC.map((id) => <option key={id} value={id}>{unitById(id, units)?.nome || id}</option>)}
          </select>
        )}
      </div>
      <div className="filtros-info">{list.length} não conformidade(s)</div>
      {list.length === 0 ? (
        <Empty>Nenhuma não conformidade neste filtro.</Empty>
      ) : (
        <div className="nc-list">
          {list.map((n) => {
            const a = audById(n.auditoriaId);
            const u = a && unitById(a.unidadeId, units);
            return (
              <div key={n.id} className="nc-item">
                <div className="nc-left">
                  <div className="nc-head">
                    <span className="tag-tipo" data-t={n.tipo}>{n.tipo}</span>
                    <span className="nc-code">{n.codigo}</span>
                    <span className="sev" style={{ color: SEV[n.severidade].color, borderColor: SEV[n.severidade].color }}>
                      {SEV[n.severidade].label}
                    </span>
                    {a?.codigoFmt && <span className="nc-orig">{a.codigoFmt}</span>}
                    {u && <span className="nc-casa"><Building2 size={11} /> {u.nome}</span>}
                    {n.colaboradorNome && <span className="nc-casa"><Contact size={11} /> {n.colaboradorNome}</span>}
                    {n.processo && <span className="nc-casa"><ClipboardList size={11} /> {n.processo}</span>}
                  </div>
                  <div className="nc-req">{n.requisito || <span className="dim">—</span>}</div>
                  <div className="nc-desc">{n.descricao || <span className="dim">Sem descrição</span>}</div>
                  {u && (
                    <div className="nc-resp-casa"><ShieldCheck size={12} /> Responsável pela casa: {respDaCasa(u.id)}</div>
                  )}
                  {n.planoAcao && (
                    <div className="nc-plan">
                      <FileText size={13} /> {n.planoAcao}
                      {n.responsavel && <span className="nc-resp"> · {n.responsavel}</span>}
                      {n.prazo && <span className="nc-resp"> · prazo {fmtDate(n.prazo)}</span>}
                    </div>
                  )}
                </div>
                <div className="nc-right">
                  <StatusPill map={NC_STATUS} k={n.status} />
                  {canTreat
                    ? <button className="btn ghost sm" onClick={() => onTreat(n.id)}>Tratar</button>
                    : n.status !== "resolvida" && <span className="nc-wait">Aguardando</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { NaoConformidades };
