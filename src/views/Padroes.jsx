import React, { useState } from "react";
import { Plus, ShieldCheck, Building2, ImagePlus, Trash2, Camera, Pencil } from "lucide-react";
import { DEPARTAMENTOS } from "../constants";
import { ehColaborador, modoTag } from "../utils";
import { addArea, updateArea, deleteArea, addRequisito, updateRequisito, deleteRequisito, uploadFotoRequisito } from "../lib/db";

function Padroes({ standards, canEdit, reload, onNewTema, onDelTema, onTemaModo }) {
  const temas = Object.keys(standards);
  const [tipo, setTipo] = useState(temas[0] || "DOS");
  const [busy, setBusy] = useState(false);
  const [novoTema, setNovoTema] = useState(false);
  const std = standards[tipo] || { nome: tipo, modo: "unidade", areas: [] };

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); await reload(); }
    catch (e) { alert("Erro ao salvar: " + (e.message || e)); }
    finally { setBusy(false); }
  };
  const onRenameArea = (a, nome) => { if (nome.trim() && nome !== a.area) run(() => updateArea(a.id, { nome })); };
  const onDelArea = (a) => { if (confirm(`Remover a área "${a.area}" e seus requisitos?`)) run(() => deleteArea(a.id)); };
  const onAddArea = () => run(() => addArea(tipo, "Nova área", std.areas.length));
  const onAddReq = (a, ai) => run(() => addRequisito(a.id, { codigo: `${ai + 1}.${a.reqs.length + 1}`, titulo: "Novo requisito", ordem: a.reqs.length }));
  const onEditReq = (r, patch) => run(() => updateRequisito(r.id, patch));
  const onDelReq = (r) => { if (confirm("Remover este requisito?")) run(() => deleteRequisito(r.id)); };
  const onPhoto = (r, file) => { if (file) run(() => uploadFotoRequisito(r.id, file)); };
  const onDelTemaClick = () => { if (confirm(`Arquivar o tema "${tipo}"? Os diagnósticos já feitos continuam guardados.`)) { onDelTema(tipo); setTipo(temas.find((t) => t !== tipo) || ""); } };

  return (
    <div className="card">
      <datalist id="lst-departamentos">
        {DEPARTAMENTOS.map((d) => <option key={d} value={d} />)}
      </datalist>
      <div className="toolbar">
        <div className="tema-tabs">
          {temas.map((t) => (
            <button key={t} className={`tema-tab ${tipo === t ? "on" : ""}`} onClick={() => setTipo(t)}>
              {t}<span className="tema-modo">{modoTag(standards[t].modo)}</span>
            </button>
          ))}
          {canEdit && <button className="tema-add" onClick={() => setNovoTema(true)} title="Novo tema"><Plus size={15} /></button>}
        </div>
        <div className="std-name">
          {std.nome}
          {canEdit && (
            <label className="tema-modo-sel" title="Como este tema é auditado">
              <select value={std.modo} onChange={(e) => onTemaModo(tipo, e.target.value)}>
                <option value="unidade">Por casa</option>
                <option value="departamento">Por departamento</option>
                <option value="colaborador">Por colaborador</option>
              </select>
            </label>
          )}
          {canEdit && <span className="edit-flag"><Pencil size={12} /> {busy ? "salvando…" : "modo edição"}</span>}
          {canEdit && temas.length > 1 && <button className="mini-del" title="Arquivar tema" onClick={onDelTemaClick}><Trash2 size={14} /></button>}
        </div>
      </div>

      {novoTema && <NovoTema onClose={() => setNovoTema(false)} onCreate={(t) => { onNewTema(t); setNovoTema(false); setTimeout(() => setTipo(t.codigo.toUpperCase()), 300); }} />}

      <div className={`modo-aviso modo-${std.modo}`}>
        {ehColaborador(std.modo)
          ? <>Neste tema, cada <b>área é uma atividade/rotina</b> (ex.: Abertura de OS, Agendamento) com seus requisitos. Depois, no cadastro do colaborador, você marca quais atividades ele executa.</>
          : std.modo === "departamento"
          ? <>Neste tema, marque o <b>departamento</b> de cada área. Áreas <b>sem departamento</b> valem para qualquer departamento escolhido no diagnóstico (ex.: quadro DAILY do OPEG).</>
          : <>Neste tema, o checklist é <b>geral da casa</b> — todas as áreas entram no diagnóstico automaticamente.</>}
      </div>

      <div className="std-list">
        {std.areas.map((a, ai) => (
          <div key={a.id} className="std-area">
            <div className="std-area-h">
              <ShieldCheck size={15} />
              {canEdit
                ? <input className="area-input" defaultValue={a.area} key={a.id + a.area}
                    onBlur={(e) => onRenameArea(a, e.target.value)} />
                : <span>{a.area}</span>}
              {(std.modo === "departamento" || ehColaborador(std.modo)) && (
                canEdit
                  ? <input className="depto-input" list="lst-departamentos" placeholder={ehColaborador(std.modo) ? "departamento da atividade…" : "departamento…"} defaultValue={a.departamento || ""} key={a.id + "d" + (a.departamento || "")}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v !== (a.departamento || "")) run(() => updateArea(a.id, { departamento: v })); }} />
                  : a.departamento && <span className="depto-tag"><Building2 size={11} /> {a.departamento}</span>
              )}
              {canEdit && <button className="mini-del" onClick={() => onDelArea(a)} title="Remover área"><Trash2 size={14} /></button>}
            </div>

            {a.reqs.map((r) => (
              <div key={r.id} className="req-card">
                <div className="req-photo">
                  {r.foto
                    ? <img src={r.foto} alt="referência" />
                    : <div className="req-nophoto"><Camera size={20} /><span>sem foto</span></div>}
                  {canEdit && (
                    <label className="photo-btn">
                      <ImagePlus size={13} /> {r.foto ? "Trocar" : "Anexar foto"}
                      <input type="file" accept="image/*" hidden onChange={(e) => onPhoto(r, e.target.files[0])} />
                    </label>
                  )}
                </div>
                <div className="req-body">
                  <div className="req-head">
                    <span className="std-code">{r.c}</span>
                    {canEdit
                      ? <input className="req-title-input" defaultValue={r.t} key={r.id + r.t}
                          onBlur={(e) => e.target.value.trim() && e.target.value !== r.t && onEditReq(r, { titulo: e.target.value })} />
                      : <span className="req-title">{r.t}</span>}
                    {tipo === "OPEG" && (
                      canEdit
                        ? <label className="peso-box" title="Peso deste requisito na pontuação">
                            <span>peso</span>
                            <input type="number" min="0" step="1" defaultValue={r.peso ?? 1} key={r.id + "p" + (r.peso ?? 1)}
                              onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v !== (r.peso ?? 1)) onEditReq(r, { peso: v }); }} />
                          </label>
                        : <span className="peso-tag">peso {r.peso ?? 1}</span>
                    )}
                    {canEdit && <button className="mini-del" onClick={() => onDelReq(r)} title="Remover"><Trash2 size={14} /></button>}
                  </div>
                  {canEdit
                    ? <textarea className="req-instr-input" rows={2} defaultValue={r.instrucao} key={r.id + "i"}
                        placeholder="Instrução: o que o auditor deve verificar nesta foto/atividade…"
                        onBlur={(e) => e.target.value !== r.instrucao && onEditReq(r, { instrucao: e.target.value })} />
                    : (r.instrucao && <div className="req-instr">{r.instrucao}</div>)}
                </div>
              </div>
            ))}

            {canEdit && <button className="add-line" onClick={() => onAddReq(a, ai)}><Plus size={14} /> Adicionar requisito</button>}
          </div>
        ))}
      </div>

      {canEdit
        ? <button className="btn ghost add-area" onClick={onAddArea} disabled={busy}><Plus size={15} /> Adicionar área</button>
        : <div className="hint">Padrão definido pelo Master. Cada requisito traz a foto e a instrução de referência para o auditor comparar.</div>}
    </div>
  );
}

export { Padroes };
