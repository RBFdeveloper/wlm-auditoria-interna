import React, { useState } from "react";
import { Building2, User, Mail, ShieldCheck, Check } from "lucide-react";
import { UNITS, GRUPOS_ALL, ROLES } from "../constants";
import { unitsOfGrupo } from "../utils";
import { Modal, Field } from "../ui/common";

function NovoUsuario({ user = null, units = UNITS, grupos: gruposAll = GRUPOS_ALL, onClose, onCreate, onEdit }) {
  const editando = !!user;
  const [f, setF] = useState({
    nome: user?.nome || "", email: user?.email || "", papel: user?.papel || "auditor",
    escopoTipo: !user || user.escopo === "all" ? "all" : user.escopo?.grupo ? "grupo" : "unidade",
    grupo: user?.escopo?.grupo || gruposAll[0].id,
    unidade: user?.escopo?.unidades?.[0] || units[0].id,
  });
  const [respUnidades, setRespUnidades] = useState(user?.responsavelUnidades || []);
  const toggleResp = (id) => setRespUnidades((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const escopo = f.escopoTipo === "all" ? "all"
    : f.escopoTipo === "grupo" ? { grupo: f.grupo } : { unidade: f.unidade };
  const valido = f.nome.trim() && f.email.trim();
  return (
    <Modal title={editando ? "Editar usuário" : "Novo usuário"} sub="Cadastro" onClose={onClose}>
      <div className="form">
        <Field label="Nome" icon={User}>
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Nome completo" />
        </Field>
        <Field label="E-mail" icon={Mail}>
          <input type="email" value={f.email} disabled={editando}
            onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="nome@wlm.com.br" />
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
                  {gruposAll.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
              </Field>
            )}
            {f.escopoTipo === "unidade" && (
              <Field label="Casa" icon={Building2}>
                <select value={f.unidade} onChange={(e) => setF({ ...f, unidade: e.target.value })}>
                  {gruposAll.map((g) => (
                    <optgroup key={g.id} label={g.nome}>
                      {unitsOfGrupo(g.id, units).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
            )}
          </>
        )}
        <Field label={`Responsável pelas casas (${respUnidades.length})`} icon={ShieldCheck}>
          {gruposAll.map((g) => (
            <div key={g.id} className="ativ-grupo">
              <div className="ativ-grupo-h">{g.nome}</div>
              <div className="ativ-pick">
                {unitsOfGrupo(g.id, units).map((u) => (
                  <button key={u.id} type="button" className={`ativ-chip ${respUnidades.includes(u.id) ? "on" : ""}`}
                    onClick={() => toggleResp(u.id)}>
                    {respUnidades.includes(u.id) && <Check size={11} />} {u.nome}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="form-note" style={{ marginTop: 6 }}>
            Isto NÃO é o acesso do usuário — é só quem responde pelas não conformidades abertas nessas casas.
            Marque quantas fizerem sentido, independente do escopo de acesso acima.
          </div>
        </Field>
        <div className="form-note">
          {f.papel === "master"
            ? "Master tem acesso a todas as casas."
            : editando
              ? "O e-mail não pode ser alterado por aqui. A senha não muda nesta tela."
              : <>Senha inicial <b>Peg@2026</b> — o usuário troca no primeiro acesso.</>}
        </div>
      </div>
      <div className="modal-f">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" disabled={!valido}
          onClick={() => {
            const payload = {
              nome: f.nome, email: f.email, papel: f.papel,
              escopo: f.papel === "master" ? "all" : escopo,
              responsavelUnidades: respUnidades,
            };
            editando ? onEdit(user.id, payload) : onCreate(payload);
          }}>
          {editando ? "Salvar alterações" : "Criar usuário"}
        </button>
      </div>
    </Modal>
  );
}

export { NovoUsuario };
