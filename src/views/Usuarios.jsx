import React from "react";
import { Plus } from "lucide-react";
import { roleLabel, escopoLabel, initials } from "../utils";

function Usuarios({ users, onNew }) {
  return (
    <div className="card">
      <div className="toolbar">
        <div className="std-name">{users.length} usuários cadastrados</div>
        <button className="btn primary" onClick={onNew}><Plus size={16} /> Novo usuário</button>
      </div>
      <table className="tbl">
        <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Escopo</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="strong"><span className="u-ava">{initials(u.nome)}</span>{u.nome}</td>
              <td className="dim">{u.email}</td>
              <td><span className="role-pill" data-r={u.papel}>{roleLabel(u.papel)}</span></td>
              <td className="dim">{escopoLabel(u.escopo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="hint">Master (PEG): acesso total, cria diagnósticos, padrões e usuários. Auditor/Facilitador: executa diagnósticos nas casas do seu acesso. Toda conta nova entra com a senha padrão Peg@2026 e a troca no 1º acesso.</div>
    </div>
  );
}

export { Usuarios };
