import React, { useState } from "react";
import { Building2, Tag } from "lucide-react";
import { Modal, Field } from "../ui/common";

function NovaUnidade({ grupos = [], onClose, onCreate }) {
  // o grupo virtual "CSC · Controladoria" (id "csc") não é uma linha real em `grupos`
  // — não dá pra escolher ele aqui, senão a FK grupo_id quebra.
  const gruposReais = grupos.filter((g) => g.id !== "csc");
  const [f, setF] = useState({ nome: "", grupoId: gruposReais[0]?.id || "", tipo: "concessionaria", sigla: "" });
  const valido = f.nome.trim().length > 0 && !!f.grupoId;
  return (
    <Modal title="Nova casa" sub="Estrutura da rede" onClose={onClose}>
      <div className="form">
        <Field label="Nome da casa" icon={Building2}>
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Uberlândia" autoFocus />
        </Field>
        <Field label="Concessão" icon={Building2}>
          <select value={f.grupoId} onChange={(e) => setF({ ...f, grupoId: e.target.value })}>
            {gruposReais.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
        </Field>
        <Field label="Tipo">
          <div className="seg full">
            <button className={f.tipo === "concessionaria" ? "on" : ""} onClick={() => setF({ ...f, tipo: "concessionaria" })}>Concessionária</button>
            <button className={f.tipo === "csc" ? "on" : ""} onClick={() => setF({ ...f, tipo: "csc" })}>CSC</button>
          </div>
        </Field>
        <Field label="Sigla (opcional)" icon={Tag}>
          <input value={f.sigla} maxLength={6} onChange={(e) => setF({ ...f, sigla: e.target.value.toUpperCase() })} placeholder="Ex.: UDI" />
        </Field>
        <div className="form-note">O identificador interno é gerado automaticamente a partir do nome e da concessão.</div>
      </div>
      <div className="modal-f">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" disabled={!valido}
          onClick={() => onCreate({ nome: f.nome.trim(), grupoId: f.grupoId, tipo: f.tipo, sigla: f.sigla.trim() })}>
          Criar casa
        </button>
      </div>
    </Modal>
  );
}

export { NovaUnidade };
