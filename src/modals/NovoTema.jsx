import React, { useState } from "react";
import { Modal, Field } from "../ui/common";

function NovoTema({ onClose, onCreate }) {
  const [f, setF] = useState({ codigo: "", nome: "", modo: "unidade" });
  const codigoOk = /^[A-Za-z0-9]{2,10}$/.test(f.codigo.trim());
  const valido = codigoOk && f.nome.trim();
  return (
    <Modal title="Novo tema de diagnóstico" sub="PEG" onClose={onClose}>
      <div className="form">
        <div className="row-2">
          <Field label="Sigla / prefixo">
            <input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value.toUpperCase() })} placeholder="Ex.: DTO, INMETRO, 5S" maxLength={10} />
          </Field>
          <Field label="Modo de avaliação">
            <select value={f.modo} onChange={(e) => setF({ ...f, modo: e.target.value })}>
              <option value="unidade">Por casa (checklist geral · 5S, Inmetro)</option>
              <option value="departamento">Por departamento (DOS)</option>
              <option value="colaborador">Por colaborador · atividades (DTO)</option>
            </select>
          </Field>
        </div>
        <Field label="Nome completo do tema">
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Diagnóstico de Treinamento Operacional" />
        </Field>
        {f.codigo && !codigoOk && <div className="login-erro">A sigla deve ter de 2 a 10 letras/números, sem espaços.</div>}
        <div className="form-note">A sigla entra no código dos diagnósticos (ex.: <b>{(f.codigo || "DTO").toUpperCase()}RJ01/26</b>). Depois adicione as áreas, requisitos e fotos.</div>
      </div>
      <div className="modal-f">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" disabled={!valido} onClick={() => onCreate({ codigo: f.codigo.trim().toUpperCase(), nome: f.nome.trim(), modo: f.modo })}>Criar tema</button>
      </div>
    </Modal>
  );
}

export { NovoTema };
