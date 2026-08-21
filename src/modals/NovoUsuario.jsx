import React, { useState } from "react";
import { Building2, User, Mail } from "lucide-react";
import { UNITS, GRUPOS_ALL, ROLES } from "../constants";
import { unitsOfGrupo } from "../utils";
import { Modal, Field } from "../ui/common";

function NovoUsuario({ onClose, onCreate }) {
  const [f, setF] = useState({ nome: "", email: "", papel: "auditor", escopoTipo: "all", grupo: GRUPOS_ALL[0].id, unidade: UNITS[0].id });
  const escopo = f.escopoTipo === "all" ? "all"
    : f.escopoTipo === "grupo" ? { grupo: f.grupo } : { unidade: f.unidade };
  const valido = f.nome.trim() && f.email.trim();
  return (
    <Modal title="Novo usuário" sub="Cadastro" onClose={onClose}>
      <div className="form">
        <Field label="Nome" icon={User}>
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Nome completo" />
        </Field>
        <Field label="E-mail" icon={Mail}>
          <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="nome@wlm.com.br" />
        </Field>
        <Field label="Papel">
          <select value={f.papel} onChange={(e) => setF({ ...f, papel: e.target.value })}>
            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label} — {v.desc}</option>)}
          </select>
        </Field>
        {f.papel !== "master" && (
          <>
            <Field label="Casas com acesso">
              <div className="seg full">
                <button className={f.escopoTipo === "all" ? "on" : ""} onClick={() => setF({ ...f, escopoTipo: "all" })}>Todas</button>
                <button className={f.escopoTipo === "grupo" ? "on" : ""} onClick={() => setF({ ...f, escopoTipo: "grupo" })}>Por grupo</button>
                <button className={f.escopoTipo === "unidade" ? "on" : ""} onClick={() => setF({ ...f, escopoTipo: "unidade" })}>Uma casa</button>
              </div>
            </Field>
            {f.escopoTipo === "grupo" && (
              <Field label="Grupo" icon={Building2}>
                <select value={f.grupo} onChange={(e) => setF({ ...f, grupo: e.target.value })}>
                  {GRUPOS_ALL.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
              </Field>
            )}
            {f.escopoTipo === "unidade" && (
              <Field label="Casa" icon={Building2}>
                <select value={f.unidade} onChange={(e) => setF({ ...f, unidade: e.target.value })}>
                  {GRUPOS_ALL.map((g) => (
                    <optgroup key={g.id} label={g.nome}>
                      {unitsOfGrupo(g.id).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
            )}
          </>
        )}
        <div className="form-note">
          {f.papel === "master"
            ? "Master tem acesso a todas as casas."
            : <>Senha inicial <b>Peg@2026</b> — o usuário troca no primeiro acesso.</>}
        </div>
      </div>
      <div className="modal-f">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" disabled={!valido}
          onClick={() => onCreate({ nome: f.nome, email: f.email, papel: f.papel, escopo: f.papel === "master" ? "all" : escopo })}>
          Criar usuário
        </button>
      </div>
    </Modal>
  );
}

export { NovoUsuario };
