import React, { useState } from "react";
import { Search, X, ChevronRight, FileText, Trash2 } from "lucide-react";
import { AUD_STATUS, UNITS } from "../constants";
import { unitById, fmtDate } from "../utils";
import { Empty, StatusPill } from "../ui/common";

function Auditorias({ audits, canAudit, units = UNITS, isMaster, onNew, onExec, onPdf, onDelete }) {
  const [ftipo, setFtipo] = useState("todos");
  const [fstatus, setFstatus] = useState("todos");
  const [q, setQ] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const temasDisp = [...new Set(audits.map((a) => a.tipo))];
  const list = audits.filter((a) => {
    const u = unitById(a.unidadeId, units);
    const texto = q.toLowerCase();
    const buscaOk = !texto ||
      (a.codigoFmt || "").toLowerCase().includes(texto) ||
      a.setor.toLowerCase().includes(texto) ||
      (a.auditor || "").toLowerCase().includes(texto) ||
      (u && u.nome.toLowerCase().includes(texto));
    return (ftipo === "todos" || a.tipo === ftipo) &&
      (fstatus === "todos" || a.status === fstatus) &&
      (!de || a.data >= de) && (!ate || a.data <= ate) &&
      buscaOk;
  });
  const limpar = () => { setFtipo("todos"); setFstatus("todos"); setQ(""); setDe(""); setAte(""); };
  const temFiltro = ftipo !== "todos" || fstatus !== "todos" || q || de || ate;

  return (
    <div className="card">
      <div className="filtros">
        <div className="search wide">
          <Search size={16} />
          <input placeholder="Buscar por código, casa, setor ou auditor" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="mini-select" value={ftipo} onChange={(e) => setFtipo(e.target.value)}>
          <option value="todos">Todos os temas</option>
          {temasDisp.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="mini-select" value={fstatus} onChange={(e) => setFstatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
          <option value="planejada">Planejada</option>
        </select>
        <div className="date-range">
          <input type="date" value={de} onChange={(e) => setDe(e.target.value)} title="De" />
          <span>até</span>
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} title="Até" />
        </div>
        {temFiltro && <button className="btn ghost sm" onClick={limpar}><X size={14} /> Limpar</button>}
      </div>
      <div className="filtros-info">{list.length} de {audits.length} diagnósticos</div>

      {list.length === 0 ? (
        <Empty>Nenhum diagnóstico encontrado.{canAudit && !temFiltro && <> <button className="link" onClick={onNew}>Criar o primeiro</button>.</>}</Empty>
      ) : (
        <table className="tbl">
          <thead><tr>
            <th>Código</th><th>Tema</th><th>Casa</th><th>Setor</th><th>Data</th>
            <th>Resultado</th><th>Status</th><th className="acoes">Ações</th>
          </tr></thead>
          <tbody>
            {list.map((a) => {
              const av = a.itens.filter((i) => i.resultado === "conforme" || i.resultado === "nao_conforme");
              const ok = av.filter((i) => i.resultado === "conforme").length;
              const taxa = av.length ? Math.round((ok / av.length) * 100) : null;
              const isOPEG = a.tipo === "OPEG";
              const classifCls = { "Ouro": "ouro", "Prata": "prata", "Bronze": "bronze", "Sem classificação": "sem" }[a.classificacao] || "sem";
              const u = unitById(a.unidadeId, units);
              return (
                <tr key={a.id}>
                  <td className="cod-cell">{a.codigoFmt || <span className="dim">—</span>}</td>
                  <td><span className="tag-tipo" data-t={a.tipo}>{a.tipo}</span></td>
                  <td className="strong">{u ? u.nome : <span className="dim">—</span>}{u?.tipo === "csc" && <span className="csc-tag">CSC</span>}
                    {(a.departamento || a.responsavelNome) && <div className="aud-sub">{a.departamento || ""}{a.responsavelNome ? ` · ${a.responsavelNome}` : ""}</div>}
                  </td>
                  <td>{a.setor && a.setor !== "—" ? a.setor : <span className="dim">—</span>}</td>
                  <td className="dim">{fmtDate(a.data)}</td>
                  <td>{isOPEG
                    ? (a.pontuacao != null
                        ? <span className={`classif-badge ${classifCls}`}>{a.pontuacao} pts · {a.classificacao}</span>
                        : <span className="dim">—</span>)
                    : (taxa === null ? <span className="dim">—</span>
                        : <span className="mini-meter"><i style={{ width: `${taxa}%`, background: taxa >= 90 ? "var(--ok)" : taxa >= 70 ? "var(--warn)" : "var(--no)" }} /><b>{taxa}%</b></span>)}</td>
                  <td>{a.status ? <StatusPill map={AUD_STATUS} k={a.status} /> : <span className="dim">—</span>}</td>
                  <td className="acoes">
                    <div className="row-actions">
                      {a.status === "concluida" && (
                        <button className="btn ghost sm" onClick={() => onPdf(a)} title="Baixar relatório PDF"><FileText size={14} /> PDF</button>
                      )}
                      <button className="btn ghost sm" onClick={() => onExec(a.id)}>
                        {!canAudit ? "Ver" : a.status === "concluida" ? "Revisar" : "Executar"} <ChevronRight size={14} />
                      </button>
                      {isMaster && (
                        <button className="mini-del" title="Apagar diagnóstico"
                          onClick={() => {
                            if (confirm(`Apagar o diagnóstico ${a.codigoFmt || ""}?\n\nIsso remove permanentemente o diagnóstico, seus itens e as não conformidades geradas por ele. Não dá pra desfazer.`)) {
                              onDelete(a.id);
                            }
                          }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export { Auditorias };
