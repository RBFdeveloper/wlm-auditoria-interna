import React, { useState } from "react";
import { Camera, Eye, ImagePlus, X } from "lucide-react";
import { RESULT_META } from "../constants";
import { unitById, findReq } from "../utils";
import { Modal } from "../ui/common";
import { uploadFotoItem, removeFotoItem } from "../lib/db";

function ExecutarAuditoria({ audit, standards, colaboradores = [], readOnly, onClose, onSave, onDraft }) {
  const [itens, setItens] = useState(audit.itens);
  const [zoom, setZoom] = useState(null);
  const porColaborador = audit.modo === "colaborador" || audit.modo === "funcionario";
  const porProcesso = audit.modo === "processo";
  const porSujeito = porColaborador || porProcesso;
  const nomeColab = (id) => colaboradores.find((c) => c.id === id)?.nome || "Colaborador";

  // chave/rótulo do "sujeito" avaliado (colaborador ou processo)
  const subjKey = (i) => porColaborador ? i.colaboradorId : i.processo;
  const subjLabel = (k) => porColaborador ? nomeColab(k) : k;
  const subjetos = porSujeito ? [...new Set(itens.map(subjKey).filter(Boolean))] : [];
  const [aba, setAba] = useState(subjetos[0] || null);

  const set = (i, patch) => setItens((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const [subindo, setSubindo] = useState(null);
  const subirFoto = async (it, slot, file) => {
    if (!file) return;
    setSubindo(`${it.idx}-${slot}`);
    try {
      const { path, url } = await uploadFotoItem(it.id, slot, file);
      set(it.idx, slot === 2 ? { foto2: url, foto2_path: path } : { foto1: url, foto1_path: path });
    } catch (e) { alert("Não foi possível enviar a foto. Tente novamente."); }
    setSubindo(null);
  };
  const removerFoto = async (it, slot) => {
    try {
      await removeFotoItem(it.id, slot);
      set(it.idx, slot === 2 ? { foto2: null, foto2_path: null } : { foto1: null, foto1_path: null });
    } catch (e) { alert("Não foi possível remover a foto."); }
  };
  const isOPEG = audit.tipo === "OPEG";
  const RESULTS = isOPEG ? ["atende", "nao_atende"] : ["conforme", "nao_conforme", "na"];
  const avaliadoR = (r) => isOPEG ? (r === "atende" || r === "nao_atende") : (r === "conforme" || r === "nao_conforme");
  const pend = (i) => !i.resultado || i.resultado === "pendente";
  const semC = (i) => !isOPEG && (i.resultado === "nao_conforme" || i.resultado === "na") && !(i.obs || "").trim();

  // estatísticas GERAIS (toda a auditoria)
  const av = itens.filter((i) => avaliadoR(i.resultado));
  const taxa = av.length ? Math.round((av.filter((i) => i.resultado === "conforme").length / av.length) * 100) : 0;
  const ncCount = itens.filter((i) => i.resultado === "nao_conforme").length;
  const pendentes = itens.filter(pend).length;
  const semComentario = itens.filter(semC).length;
  const podeConcluir = pendentes === 0 && semComentario === 0;
  const motivo = pendentes > 0 ? `${pendentes} item(ns) sem avaliação`
    : semComentario > 0 ? `${semComentario} item(ns) sem comentário obrigatório` : "";

  const pesoTotal = itens.reduce((s, i) => s + (i.peso ?? 1), 0);
  const pesoFeito = itens.filter((i) => i.resultado === "atende").reduce((s, i) => s + (i.peso ?? 1), 0);
  const pontos = pesoTotal ? Math.round((pesoFeito / pesoTotal) * 100) : 0;
  const classif = pontos >= 90 ? "Ouro" : pontos >= 80 ? "Prata" : pontos >= 70 ? "Bronze" : "Sem classificação";

  // itens visíveis (filtrados pela aba do sujeito, se for o caso)
  const visiveis = itens.map((it, idx) => ({ ...it, idx }))
    .filter((it) => !porSujeito || subjKey(it) === aba);
  const areas = visiveis.reduce((acc, it) => { (acc[it.area] = acc[it.area] || []).push(it); return acc; }, {});

  // progresso por sujeito (para os badges das abas)
  const progSubj = (k) => {
    const its = itens.filter((i) => subjKey(i) === k);
    const feitos = its.filter((i) => !pend(i) && !semC(i)).length;
    return { feitos, total: its.length, ok: feitos === its.length && its.length > 0 };
  };

  const u = unitById(audit.unidadeId);
  const modoLabel = porColaborador ? "por colaborador" : porProcesso ? "por processo"
    : audit.modo === "departamento" ? `depto: ${audit.departamento || "—"}` : audit.setor;

  return (
    <Modal title={u ? u.nome : audit.setor}
      sub={`${readOnly ? "Revisar" : "Executar"} · ${audit.tipo} · ${modoLabel}${audit.responsavelNome ? " · resp: " + audit.responsavelNome : ""}`}
      onClose={onClose} wide>
      <div className="exec-bar">
        {isOPEG ? (<>
          <div className="exec-stat"><span>Pontuação</span><b>{pontos} pts</b></div>
          <div className="exec-stat"><span>Classificação</span><b>{classif}</b></div>
          <div className="exec-stat"><span>Peso atingido</span><b>{pesoFeito}/{pesoTotal}</b></div>
        </>) : (<>
          <div className="exec-stat"><span>Conformidade</span><b>{taxa}%</b></div>
          <div className="exec-stat"><span>Não conformes</span><b style={{ color: ncCount ? "var(--no)" : "inherit" }}>{ncCount}</b></div>
        </>)}
        <div className="exec-stat"><span>Respondidos</span><b>{itens.filter((i) => !pend(i)).length}/{itens.length}</b></div>
        {porSujeito && <div className="exec-stat"><span>{porColaborador ? "Colaboradores" : "Processos"}</span><b>{subjetos.length}</b></div>}
      </div>

      {porSujeito && (
        <div className="colab-tabs">
          {subjetos.map((k) => {
            const p = progSubj(k);
            return (
              <button key={k} className={`colab-tab ${aba === k ? "on" : ""}`} onClick={() => setAba(k)}>
                <span className="ct-nome">{subjLabel(k)}</span>
                <span className={`ct-badge ${p.ok ? "ok" : ""}`}>{p.feitos}/{p.total}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="exec-body">
        {Object.entries(areas).map(([area, list]) => (
          <div key={area} className="exec-area">
            <div className="exec-area-h">{area}</div>
            {list.map((it) => {
              const ref = findReq(standards, audit.tipo, it.codigo) || {};
              const precisaObs = !isOPEG && (it.resultado === "nao_conforme" || it.resultado === "na");
              const faltaObs = precisaObs && !(it.obs || "").trim();
              const isPend = pend(it);
              return (
                <div key={it.idx} className={`exec-item ${isPend ? "pend" : ""}`}>
                  <div className="exec-ref">
                    {ref.foto
                      ? <img src={ref.foto} alt="padrão" className="exec-thumb" onClick={() => setZoom(ref.foto)} />
                      : <div className="exec-thumb none"><Camera size={18} /></div>}
                  </div>
                  <div className="exec-main">
                    <div className="exec-reqline">
                      <span className="std-code">{it.codigo}</span>
                      <span className="exec-reqt">{it.requisito}</span>
                      {isOPEG && <span className="peso-tag">peso {it.peso ?? 1}</span>}
                      {isPend && <span className="pend-tag">pendente</span>}
                    </div>
                    {ref.instrucao && <div className="exec-instr"><Eye size={12} /> {ref.instrucao}</div>}
                    <div className="exec-evid">
                      {[1, 2].map((slot) => {
                        const url = slot === 1 ? it.foto1 : it.foto2;
                        const enviando = subindo === `${it.idx}-${slot}`;
                        return url ? (
                          <div key={slot} className="evid-thumb">
                            <img src={url} alt={`evidência ${slot}`} onClick={() => setZoom(url)} />
                            {!readOnly && <button className="evid-del" title="Remover foto" onClick={() => removerFoto(it, slot)}><X size={12} /></button>}
                          </div>
                        ) : readOnly ? null : (
                          <label key={slot} className={`evid-add ${enviando ? "loading" : ""}`}>
                            <ImagePlus size={15} />
                            <span>{enviando ? "enviando…" : `Foto ${slot}`}</span>
                            <input type="file" accept="image/*" hidden disabled={enviando}
                              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; subirFoto(it, slot, f); }} />
                          </label>
                        );
                      })}
                    </div>
                    {precisaObs && (
                      <input className={`exec-obs ${it.resultado === "na" ? "na" : ""} ${faltaObs ? "falta" : ""}`}
                        placeholder={it.resultado === "na"
                          ? "Justifique por que não se aplica (obrigatório)…"
                          : "Descreva a não conformidade — obrigatório (vira uma NC)…"}
                        disabled={readOnly}
                        value={it.obs} onChange={(e) => set(it.idx, { obs: e.target.value })} />
                    )}
                  </div>
                  <div className="exec-actions">
                    {RESULTS.map((r) => {
                      const meta = RESULT_META[r];
                      return (
                        <button key={r} className={`res-btn ${it.resultado === r ? "on" : ""}`} disabled={readOnly}
                          style={it.resultado === r ? { background: meta.color, borderColor: meta.color, color: "#fff" } : {}}
                          onClick={() => set(it.idx, { resultado: r })} title={meta.label}>
                          <meta.Icon size={15} />
                          {isOPEG && <span className="res-btn-txt">{meta.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="modal-f">
        {!readOnly && !podeConcluir && <div className="exec-motivo">⚠ {motivo}</div>}
        <button className="btn ghost" onClick={onClose}>Fechar</button>
        {!readOnly && onDraft && (
          <button className="btn ghost" onClick={() => onDraft(itens)} title="Guarda o progresso e fecha; você continua depois">
            Salvar rascunho
          </button>
        )}
        {!readOnly && (
          <button className="btn primary" disabled={!podeConcluir} onClick={() => onSave(itens)}>
            {isOPEG
              ? `Concluir diagnóstico · ${pontos} pts · ${classif}`
              : `Concluir diagnóstico${ncCount ? ` · gerar ${ncCount} NC${ncCount > 1 ? "s" : ""}` : ""}`}
          </button>
        )}
      </div>
      {zoom && (
        <div className="zoom-overlay" onClick={() => setZoom(null)}>
          <img src={zoom} alt="padrão" />
        </div>
      )}
    </Modal>
  );
}

export { ExecutarAuditoria };
