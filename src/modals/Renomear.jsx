import React, { useState } from "react";
import { Pencil } from "lucide-react";
import { Modal, Field } from "../ui/common";

function Renomear({ titulo, label, valorAtual, onClose, onSave }) {
  const [nome, setNome] = useState(valorAtual || "");
  const valido = nome.trim().length > 0;
  return (
    <Modal title={titulo} sub="Renomear" onClose={onClose}>
      <div className="form">
        <Field label={label} icon={Pencil}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </Field>
        <div className="form-note">O identificador interno não muda — só o nome exibido.</div>
      </div>
      <div className="modal-f">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" disabled={!valido} onClick={() => onSave(nome.trim())}>Salvar</button>
      </div>
    </Modal>
  );
}

export { Renomear };
