import React, { useState, useEffect } from "react";
import { ClipboardList, Check, Building2, Contact } from "lucide-react";
import { DEPARTAMENTOS, UNITS, GRUPOS_ALL } from "../constants";
import { modoDoTema, unitsOfGrupo, today } from "../utils";
import { Modal, Field } from "../ui/common";

function NovaAuditoria({ onClose, onCreate, scope, units = UNITS, standards, colaboradores = [], siglas = {} }) {
  const temas = Object.keys(standards);
  const allowedSet = new Set(units.map((u) => u.id));
  const grupos = GRUPOS_ALL.filter((g) => unitsOfGrupo(g.id).some((u) => allowedSet.has(u.id)));
  const defaultUnit = scope?.level === "unidade" ? scope.id : units[0]?.id;
  const [f, setF] = useState({ tipo: temas[0] || "DOS", unidadeId: defaultUnit, data: today() });
  const [sel, setSel] = useState([]);        // colaboradores (modo colaborador)
  const [depto, setDepto] = useState("");    // departamento (modo departamento)
  const [respId, setRespId] = useState("");  // responsável (modo departamento)
  const [deptOutro, setDeptOutro] = useState("");

  const modo = modoDoTema(f.tipo, standards);
  const std = standards[f.tipo] || { areas: [] };
  const doHouse = colaboradores.filter((c) => c.unidadeId === f.unidadeId);
  const deptTags = [...new Set(std.areas.map((a) => a.departamento).filter(Boolean))];
  const deptOptions = [...new Set([...deptTags, ...DEPARTAMENTOS])];
  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const resetSubjects = () => { setDepto(""); setRespId(""); };

  // DTO (por colaborador): a auditoria já traz TODOS os colaboradores elegíveis da casa
  useEffect(() => {
    if (modo === "colaborador") setSel(doHouse.map((c) => c.id));
    else setSel([]);
    // eslint-disable-next-line
  }, [f.tipo, f.unidadeId, modo, colaboradores.length]);

  // contagem de itens que serão gerados (preview)
  const areasDoDepto = (d) => std.areas.filter((a) => a.departamento === d || !a.departamento);
  const reqsDoDepto = (d) => areasDoDepto(d).reduce((n, a) => n + a.reqs.length, 0);
  const reqsColab = (c) => {
    const areas = c.atividades?.length ? std.areas.filter((a) => c.atividades.includes(a.area)) : std.areas;
    return areas.reduce((n, a) => n + a.reqs.length, 0);
  };
  const totalReq = std.areas.reduce((n, a) => n + a.reqs.length, 0);

  const deptFinal = depto === "__outros__" ? deptOutro.trim() : depto;

  const podeCriar =
    modo === "unidade" ? totalReq > 0 :
    modo === "departamento" ? (!!deptFinal && reqsDoDepto(depto) > 0) :
    (doHouse.length > 0 && std.areas.length > 0);

  const sigla = (siglas[f.unidadeId] || "??").toUpperCase();
  const codigoPreview = `${f.tipo}${sigla}NN/${(f.data || "").slice(2, 4)}`;

  const criar = () => {
    const setor = modo === "departamento" ? (deptFinal || "—")
      : modo === "colaborador" ? "Por colaborador" : "Geral";
    const payload = { ...f, setor, modo };
    if (modo === "departamento") {
      payload.departamento = deptFinal;
      payload.responsavelNome = doHouse.find((c) => c.id === respId)?.nome || null;
    }
    if (modo === "colaborador") payload.colaboradores = doHouse.filter((c) => sel.includes(c.id));
    onCreate(payload);
  };

  return (
    <Modal title="Novo diagnóstico" sub="Planejamento" onClose={onClose}>
      <div className="form">
        <Field label="Tema do diagnóstico">
          <div className="seg full wrap">
            {temas.map((t) => (
              <button key={t} className={f.tipo === t ? "on" : ""} onClick={() => { setF({ ...f, tipo: t }); resetSubjects(); }}>{t}</button>
            ))}
          </div>
        </Field>
        <div className="codigo-preview">Código: <b>{codigoPreview}</b> <span>(NN = nº no ano)</span></div>

        <div className="modo-hint">
          {modo === "colaborador" ? <><Contact size={13} /> <b>Por colaborador</b> — cada pessoa recebe o checklist das atividades que executa.</>
            : modo === "departamento" ? <><Building2 size={13} /> <b>Por departamento</b> — o checklist vem só do departamento escolhido.</>
            : <><ClipboardList size={13} /> <b>Por casa</b> — checklist geral, automático para a unidade.</>}
        </div>

        <Field label="Casa / unidade" icon={Building2}>
          <select value={f.unidadeId} onChange={(e) => { setF({ ...f, unidadeId: e.target.value }); resetSubjects(); }}>
            {grupos.map((g) => (
              <optgroup key={g.id} label={g.nome}>
                {unitsOfGrupo(g.id).filter((u) => allowedSet.has(u.id)).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Data">
          <input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
        </Field>

        {modo === "departamento" && (
          <>
            <Field label="Departamento auditado" icon={Building2}>
              {std.areas.length === 0
                ? <div className="form-note">Este padrão ainda não tem áreas/requisitos. Cadastre em <b>Padrões → {f.tipo}</b> antes.</div>
                : <select value={depto} onChange={(e) => setDepto(e.target.value)}>
                    <option value="">Selecione…</option>
                    {deptOptions.map((d) => <option key={d} value={d}>{d} · {reqsDoDepto(d)} req.</option>)}
                    <option value="__outros__">Outros (digitar)…</option>
                  </select>}
              {depto === "__outros__" && (
                <input className="dept-outro-input" placeholder="Digite o departamento auditado"
                  value={deptOutro} onChange={(e) => setDeptOutro(e.target.value)} autoFocus />
              )}
            </Field>
            <Field label="Responsável (opcional)" icon={Contact}>
              <select value={respId} onChange={(e) => setRespId(e.target.value)}>
                <option value="">—</option>
                {doHouse.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.departamento ? ` · ${c.departamento}` : ""}</option>)}
              </select>
            </Field>
          </>
        )}

        {modo === "colaborador" && (
          <Field label={`Colaboradores desta casa (${sel.length} de ${doHouse.length})`} icon={Contact}>
            {std.areas.length === 0
              ? <div className="form-note">O <b>{f.tipo}</b> ainda não tem atividades/processos cadastrados. Vá em <b>Padrões → {f.tipo}</b> e crie as atividades (ex.: Abertura de OS, Agendamento) com seus requisitos. Depois marque-as em cada colaborador.</div>
              : doHouse.length === 0
              ? <div className="form-note">Nenhum colaborador cadastrado nesta casa. Cadastre em <b>Colaboradores</b> — o diagnóstico DTO audita todos de uma vez.</div>
              : <>
                  <div className="form-note" style={{ marginBottom: 8 }}>O diagnóstico já traz <b>todos os colaboradores</b> da casa, cada um com as atividades que você marcou no cadastro dele. Desmarque quem não deve entrar.</div>
                  <div className="colab-pick">
                    {doHouse.map((c) => (
                      <button key={c.id} type="button" className={`colab-chip ${sel.includes(c.id) ? "on" : ""}`} onClick={() => toggle(c.id)}>
                        <span className="cc-check">{sel.includes(c.id) ? <Check size={12} /> : null}</span>
                        <span className="cc-nome">{c.nome}</span>
                        <span className="cc-cargo">{c.atividades?.length ? `${c.atividades.length} atividade(s) · ${reqsColab(c)} req.` : `sem atividades · recebe todas (${reqsColab(c)})`}</span>
                      </button>
                    ))}
                  </div>
                </>}
          </Field>
        )}

        <div className="form-note">
          {modo === "colaborador"
            ? <>Cada colaborador recebe o checklist das <b>atividades</b> que executa.</>
            : modo === "departamento"
            ? (depto ? <>Serão carregados <b>{reqsDoDepto(depto)} requisitos</b> do departamento {depto}.</> : <>Escolha um departamento.</>)
            : <>Serão carregados <b>{totalReq} requisitos</b> do tema {f.tipo}.</>}
        </div>
      </div>
      <div className="modal-f">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" disabled={!podeCriar} onClick={criar}>Criar e executar</button>
      </div>
    </Modal>
  );
}

export { NovaAuditoria };
