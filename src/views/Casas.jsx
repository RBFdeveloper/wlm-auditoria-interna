import React, { useState } from "react";
import { AlertTriangle, Search, Check } from "lucide-react";
import { UNITS, GRUPOS_ALL } from "../constants";
import { unitsOfGrupo, unitStats } from "../utils";

function Casas({ audits, ncs, units = UNITS, siglas = {}, canEdit, onSigla, onOpen }) {
  const [tipo, setTipo] = useState("todas"); // todas | concessionaria | csc
  const [q, setQ] = useState("");
  const allowedSet = new Set(units.map((u) => u.id));
  const grupos = GRUPOS_ALL.filter((g) => tipo === "csc" ? g.id === "csc" : tipo === "concessionaria" ? g.id !== "csc" : true);
  return (
    <div className="card">
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input placeholder="Buscar casa" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg">
          {[["todas", "Todas"], ["concessionaria", "Concessionárias"], ["csc", "CSC"]].map(([k, l]) => (
            <button key={k} className={tipo === k ? "on" : ""} onClick={() => setTipo(k)}>{l}</button>
          ))}
        </div>
      </div>

      {canEdit && <div className="hint" style={{ marginTop: 0, marginBottom: 12 }}>A <b>sigla</b> de cada casa entra no código da auditoria (ex.: DTO<b>RJ</b>01/26). Clique na sigla para editar.</div>}

      {grupos.map((g) => {
        const us = unitsOfGrupo(g.id).filter((u) => allowedSet.has(u.id) && u.nome.toLowerCase().includes(q.toLowerCase()));
        if (!us.length) return null;
        return (
          <div key={g.id} className="grupo-block">
            <div className="grupo-h">{g.nome}<span className="grupo-count">{us.length} casas</span></div>
            <div className="casa-grid">
              {us.map((u) => {
                const s = unitStats(u.id, audits, ncs);
                const col = s.taxa === null ? "var(--dim)" : s.taxa >= 90 ? "var(--ok)" : s.taxa >= 70 ? "var(--warn)" : "var(--no)";
                return (
                  <div key={u.id} className="casa-card">
                    <button className="casa-open" onClick={() => onOpen(u.id)}>
                      <div className="casa-top">
                        <span className="casa-nome">{u.nome}</span>
                        {u.tipo === "csc" && <span className="csc-tag">CSC</span>}
                      </div>
                      <div className="casa-taxa" style={{ color: col }}>
                        {s.taxa === null ? "—" : `${s.taxa}%`}
                      </div>
                      <div className="casa-bar"><i style={{ width: `${s.taxa || 0}%`, background: col }} /></div>
                      <div className="casa-foot">
                        <span>{s.total} audit.</span>
                        {s.abertas > 0
                          ? <span className="casa-nc"><AlertTriangle size={12} /> {s.abertas} NC</span>
                          : <span className="casa-ok"><Check size={12} /> ok</span>}
                      </div>
                    </button>
                    <div className="casa-sigla">
                      sigla
                      {canEdit
                        ? <input defaultValue={siglas[u.id] || ""} maxLength={6} key={u.id + (siglas[u.id] || "")}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => { const v = e.target.value.trim().toUpperCase(); if (v !== (siglas[u.id] || "")) onSigla(u.id, v); }} />
                        : <b>{siglas[u.id] || "—"}</b>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { Casas };
