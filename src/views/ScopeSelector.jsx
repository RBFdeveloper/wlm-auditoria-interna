import React, { useState } from "react";
import { ChevronRight, ShieldCheck, Building2 } from "lucide-react";
import { UNITS, GRUPOS_ALL } from "../constants";
import { unitById, unitsOfGrupo } from "../utils";

function ScopeSelector({ scope, onChange, units = UNITS, grupos: gruposAll = GRUPOS_ALL }) {
  const [open, setOpen] = useState(false);
  const [exp, setExp] = useState(null); // grupo expandido
  const allowedSet = new Set(units.map((u) => u.id));
  const grupos = gruposAll.filter((g) => unitsOfGrupo(g.id, units).some((u) => allowedSet.has(u.id)));
  const unitsG = (gid) => unitsOfGrupo(gid, units).filter((u) => allowedSet.has(u.id));
  const total = units.length;
  const label = scope.level === "rede" ? "Rede · minhas casas"
    : scope.level === "grupo" ? (gruposAll.find((g) => g.id === scope.id)?.nome || "Grupo")
    : (unitById(scope.id, units)?.nome || "Casa");
  const sub = scope.level === "rede" ? `${total} casas`
    : scope.level === "grupo" ? `${unitsG(scope.id).length} casas`
    : (unitById(scope.id, units)?.grupoNome || "");
  const pick = (s) => { onChange(s); setOpen(false); };
  return (
    <div className="scope">
      <button className="scope-btn" onClick={() => setOpen((o) => !o)}>
        <Building2 size={16} />
        <div className="scope-txt"><b>{label}</b><span>{sub}</span></div>
        <ChevronRight size={15} className={`scope-chev ${open ? "o" : ""}`} />
      </button>
      {open && (
        <>
          <div className="scope-back" onClick={() => setOpen(false)} />
          <div className="scope-menu">
            <button className={`scope-row root ${scope.level === "rede" ? "on" : ""}`} onClick={() => pick({ level: "rede", id: null })}>
              <ShieldCheck size={15} /> Rede · minhas casas <span className="scope-count">{total}</span>
            </button>
            <div className="scope-div" />
            {grupos.map((g) => {
              const us = unitsG(g.id);
              const isExp = exp === g.id;
              return (
                <div key={g.id}>
                  <div className="scope-grow">
                    <button className={`scope-row ${scope.level === "grupo" && scope.id === g.id ? "on" : ""}`}
                      onClick={() => pick({ level: "grupo", id: g.id })}>
                      {g.nome} <span className="scope-count">{us.length}</span>
                    </button>
                    <button className="scope-exp" onClick={() => setExp(isExp ? null : g.id)}>
                      <ChevronRight size={14} className={isExp ? "o" : ""} />
                    </button>
                  </div>
                  {isExp && us.map((u) => (
                    <button key={u.id} className={`scope-row unit ${scope.level === "unidade" && scope.id === u.id ? "on" : ""}`}
                      onClick={() => pick({ level: "unidade", id: u.id })}>
                      {u.nome}{u.tipo === "csc" && <span className="csc-tag">CSC</span>}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export { ScopeSelector };
