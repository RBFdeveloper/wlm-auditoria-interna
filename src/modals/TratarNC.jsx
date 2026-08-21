import React, { useState } from "react";
import { NC_STATUS, SEV } from "../constants";
import { fmtDate } from "../utils";
import { Modal, Field } from "../ui/common";

function TratarNC({ nc, audit, onClose, onSave }) {
  const [f, setF] = useState({
    status: nc.status === "aberta" ? "em_tratamento" : nc.status,
    severidade: nc.severidade, planoAcao: nc.planoAcao, responsavel: nc.responsavel, prazo: nc.prazo,
  });
  return (
    <Modal title="Tratar não conformidade" sub={`${nc.tipo} · ${nc.codigo}`} onClose={onClose}>
      <div className="nc-context">
        <div className="nc-req">{nc.requisito}</div>
        <div className="nc-desc">{nc.descricao}</div>
        {audit && <div className="nc-meta-src">Origem: {audit.setor} · {fmtDate(audit.data)}</div>}
      </div>
      <div className="form">
        <div className="row-2">
          <Field label="Status">
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              {Object.entries(NC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Severidade">
            <select value={f.severidade} onChange={(e) => setF({ ...f, severidade: e.target.value })}>
              {Object.entries(SEV).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Plano de ação">
          <textarea rows={3} value={f.planoAcao} placeholder="O que será feito para corrigir…"
            onChange={(e) => setF({ ...f, planoAcao: e.target.value })} />
        </Field>
        <div className="row-2">
          <Field label="Responsável"><input value={f.responsavel}
            onChange={(e) => setF({ ...f, responsavel: e.target.value })} placeholder="Nome / função" /></Field>
          <Field label="Prazo"><input type="date" value={f.prazo}
            onChange={(e) => setF({ ...f, prazo: e.target.value })} /></Field>
        </div>
      </div>
      <div className="modal-f">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={() => onSave(f)}>Salvar tratamento</button>
      </div>
    </Modal>
  );
}

export { TratarNC };
