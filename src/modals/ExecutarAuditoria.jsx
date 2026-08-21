import React, { useState } from "react";
import { Camera, Eye } from "lucide-react";
import { RESULT_META } from "../constants";
import { unitById, findReq } from "../utils";
import { Modal } from "../ui/common";

function ExecutarAuditoria({ audit, standards, colaboradores = [], readOnly, onClose, onSave }) {
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
  const avaliadoR = (r) => r === "conforme" || r === "nao_conforme";
  const pend = (i) => !i.resultado || i.resultado === "pendente";
  const semC = (i) => (i.resultado === "nao_conforme" || i.resultado === "na") && !(i.obs || "").trim();

  // estatísticas GERAIS (toda a auditoria)
  const av = itens.filter((i) => avaliadoR(i.resultado));
  const taxa = av.length ? Math.round((av.filter((i) => i.resultado === "conforme").length / av.length) * 100) : 0;
  const ncCount = itens.filter((i) => i.resultado === "nao_conforme").length;
  const pendentes = itens.filter(pend).length;
  const semComentario = itens.filter(semC).length;
  const podeConcluir = pendentes === 0 && semComentario === 0;
  const motivo = pendentes > 0 ? `${pendentes} item(ns) sem avaliação`
    : semComentario > 0 ? `${semComentario} item(ns) sem comentário obrigatório` : "";

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
        <div className="exec-stat"><span>Conformidade</span><b>{taxa}%</b></div>
        <div className="exec-stat"><span>Não conformes</span><b style={{ color: ncCount ? "var(--no)" : "inherit" }}>{ncCount}</b></div>
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
              const precisaObs = it.resultado === "nao_conforme" || it.resultado === "na";
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
                      {isPend && <span className="pend-tag">pendente</span>}
                    </div>
                    {ref.instrucao && <div className="exec-instr"><Eye size={12} /> {ref.instrucao}</div>}
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
                    {["conforme", "nao_conforme", "na"].map((r) => {
                      const meta = RESULT_META[r];
                      return (
                        <button key={r} className={`res-btn ${it.resultado === r ? "on" : ""}`} disabled={readOnly}
                          style={it.resultado === r ? { background: meta.color, borderColor: meta.color, color: "#fff" } : {}}
                          onClick={() => set(it.idx, { resultado: r })} title={meta.label}>
                          <meta.Icon size={15} />
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
        {!readOnly && (
          <button className="btn primary" disabled={!podeConcluir} onClick={() => onSave(itens)}>
            Concluir auditoria{ncCount ? ` · gerar ${ncCount} NC${ncCount > 1 ? "s" : ""}` : ""}
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
