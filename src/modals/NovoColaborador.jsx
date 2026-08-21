import React, { useState } from "react";
import { ClipboardList, Check, Building2, User } from "lucide-react";
import { DEPARTAMENTOS, CARGOS, UNITS, GRUPOS_ALL } from "../constants";
import { ehColaborador, unitsOfGrupo } from "../utils";
import { Modal, Field } from "../ui/common";

function NovoColaborador({ units = UNITS, standards = {}, colab = null, onClose, onCreate, onEdit }) {
  const editando = !!colab;
  const allowedSet = new Set(units.map((u) => u.id));
  const grupos = GRUPOS_ALL.filter((g) => unitsOfGrupo(g.id).some((u) => allowedSet.has(u.id)));
  const [f, setF] = useState({
    nome: colab?.nome || "", cargo: colab?.cargo || CARGOS[0],
    departamento: colab?.departamento || DEPARTAMENTOS[0], unidadeId: colab?.unidadeId || units[0]?.id,
  });
  const [ativ, setAtiv] = useState(colab?.atividades || []);

  // processos/atividades para marcar: de temas por colaborador E sempre do DTO/DCS,
  // independente do modo em que o tema esteja (evita ficar preso por causa do modo).
  const dtoAreas = Object.entries(standards)
    .filter(([code, s]) => ehColaborador(s.modo) || code === "DTO" || code === "DCS")
    .flatMap(([code, s]) => s.areas);
  const porDepto = {};
  dtoAreas.forEach((a) => { (porDepto[a.departamento || "Sem departamento"] ||= []).push(a.area); });
  const temProcessos = dtoAreas.length > 0;

  const toggleAtiv = (a) => setAtiv((s) => s.includes(a) ? s.filter((x) => x !== a) : [...s, a]);
  const valido = f.nome.trim() && f.unidadeId;
  return (
    <Modal title={editando ? "Editar colaborador" : "Novo colaborador"} sub="Cadastro" onClose={onClose}>
      <div className="form">
        <Field label="Nome" icon={User}>
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Nome do colaborador" />
        </Field>
        <div className="row-2">
          <Field label="Cargo">
            <select value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })}>
              {CARGOS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Departamento">
            <select value={f.departamento} onChange={(e) => setF({ ...f, departamento: e.target.value })}>
              {DEPARTAMENTOS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Casa / unidade" icon={Building2}>
          <select value={f.unidadeId} onChange={(e) => setF({ ...f, unidadeId: e.target.value })}>
            {grupos.map((g) => (
              <optgroup key={g.id} label={g.nome}>
                {unitsOfGrupo(g.id).filter((u) => allowedSet.has(u.id)).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field label={`Processos do DTO a auditar neste colaborador (${ativ.length})`} icon={ClipboardList}>
          {!temProcessos
            ? <div className="form-note">Cadastre primeiro os <b>processos do DTO</b> em <b>Padrões</b> (as áreas do DTO, com seu departamento). Depois eles aparecem aqui pra marcar.</div>
            : <>
                {Object.entries(porDepto).map(([dep, areas]) => (
                  <div key={dep} className="ativ-grupo">
                    <div className="ativ-grupo-h">{dep}</div>
                    <div className="ativ-pick">
                      {areas.map((a) => (
                        <button key={a} type="button" className={`ativ-chip ${ativ.includes(a) ? "on" : ""}`} onClick={() => toggleAtiv(a)}>
                          {ativ.includes(a) && <Check size={11} />} {a}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="form-note" style={{ marginTop: 6 }}>Marque os processos em que ele deve ser auditado. Ficam salvos e já vêm carregados quando ele entra num diagnóstico DTO. Sem marcar nenhum, ele recebe todos.</div>
              </>}
        </Field>
      </div>
      <div className="modal-f">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" disabled={!valido}
          onClick={() => editando ? onEdit(colab.id, { ...f, atividades: ativ }) : onCreate({ ...f, atividades: ativ })}>
          {editando ? "Salvar alterações" : "Cadastrar"}
        </button>
      </div>
    </Modal>
  );
}

export { NovoColaborador };
