import React, { useState } from "react";
import { Building2 } from "lucide-react";
import { Modal, Field } from "../ui/common";

function NovoGrupo({ onClose, onCreate }) {
  const [nome, setNome] = useState("");
  const valido = nome.trim().length > 0;
  return (
    <Modal title="Nova concessão" sub="Estrutura da rede" onClose={onClose}>
      <div className="form">
        <Field label="Nome da concessão" icon={Building2}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Nova Regional" autoFocus />
        </Field>
        <div className="form-note">O identificador interno é gerado automaticamente a partir do nome.</div>
      </div>
      <div className="modal-f">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" disabled={!valido} onClick={() => onCreate({ nome: nome.trim() })}>
          Criar concessão
        </button>
      </div>
    </Modal>
  );
}

export { NovoGrupo };
