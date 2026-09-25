import React, { useState } from "react";
import { Search, Trash2, Pencil, UserPlus, FileSpreadsheet, FileText } from "lucide-react";
import { UNITS } from "../constants";
import { unitById, initials } from "../utils";
import { Empty } from "../ui/common";
import { exportarTreinamentosCSV, exportarTreinamentosPDF } from "../lib/relatorios";

function Colaboradores({ colaboradores, units = UNITS, isMaster, onNew, onEdit, onDel }) {
  const [q, setQ] = useState("");
  const [uf, setUf] = useState("todas");
  const allowedSet = new Set(units.map((u) => u.id));
  const list = colaboradores.filter((c) =>
    allowedSet.has(c.unidadeId) &&
    (uf === "todas" || c.unidadeId === uf) &&
    (c.nome.toLowerCase().includes(q.toLowerCase()) ||
     (c.departamento || "").toLowerCase().includes(q.toLowerCase()) ||
     (c.cargo || "").toLowerCase().includes(q.toLowerCase())));
  const casasComColab = units.filter((u) => colaboradores.some((c) => c.unidadeId === u.id));
  return (
    <div className="card">
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input placeholder="Buscar por nome, cargo ou departamento" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="tb-right">
          <select className="mini-select" value={uf} onChange={(e) => setUf(e.target.value)}>
            <option value="todas">Todas as casas</option>
            {casasComColab.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          {isMaster && (
            <>
              <button className="btn ghost" title="Exporta os colaboradores listados abaixo (respeita busca e filtro de casa)"
                onClick={() => exportarTreinamentosCSV(list, units)}>
                <FileSpreadsheet size={15} /> Exportar treinamentos (Excel)
              </button>
              <button className="btn ghost" title="Exporta os colaboradores listados abaixo (respeita busca e filtro de casa)"
                onClick={() => exportarTreinamentosPDF(list, units)}>
                <FileText size={15} /> Exportar treinamentos (PDF)
              </button>
            </>
          )}
          <button className="btn primary" onClick={onNew}><UserPlus size={16} /> Novo colaborador</button>
        </div>
      </div>
      {list.length === 0 ? (
        <Empty>Nenhum colaborador cadastrado. <button className="link" onClick={onNew}>Cadastrar o primeiro</button>.</Empty>
      ) : (
        <table className="tbl">
          <thead><tr><th>Nome</th><th>Cargo</th><th>Departamento</th><th>Casa</th><th className="acoes">Ações</th></tr></thead>
          <tbody>
            {list.map((c) => {
              const u = unitById(c.unidadeId, units);
              return (
                <tr key={c.id}>
                  <td className="strong"><span className="u-ava">{initials(c.nome)}</span>{c.nome}
                    {c.atividades?.length > 0 && <div className="colab-ativ">{c.atividades.join(" · ")}</div>}
                  </td>
                  <td>{c.cargo || <span className="dim">—</span>}</td>
                  <td className="dim">{c.departamento || "—"}</td>
                  <td className="dim">{u ? u.nome : "—"}</td>
                  <td className="acoes">
                    <div className="row-actions">
                      <button className="btn ghost sm" title="Editar" onClick={() => onEdit(c)}><Pencil size={13} /> Editar</button>
                      <button className="mini-del" title="Remover" onClick={() => confirm(`Remover ${c.nome}?`) && onDel(c.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="hint">Colaboradores são as pessoas auditadas no DTO (por colaborador). No cadastro você marca os processos do DTO em que cada um deve ser auditado. LGPD: guardamos só nome, cargo e departamento.</div>
    </div>
  );
}

export { Colaboradores };
