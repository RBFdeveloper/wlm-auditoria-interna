import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie, Tooltip } from "recharts";
import { AUD_STATUS } from "../constants";
import { unitById, fmtDate, computeMetrics } from "../utils";
import { SectionTitle, Empty, StatusPill } from "../ui/common";

function Dashboard({ m, audits, ncs }) {
  const temas = ["Todos", ...Array.from(new Set(audits.map((a) => a.tipo)))];
  const [tema, setTema] = useState("Todos");
  const fa = tema === "Todos" ? audits : audits.filter((a) => a.tipo === tema);
  const fn = tema === "Todos" ? ncs : ncs.filter((n) => n.tipo === tema);
  const mm = tema === "Todos" ? m : computeMetrics(fa, fn);
  const isOPEG = tema === "OPEG";

  const recent = [...fa].slice(0, 4);
  const status = mm.taxa >= 90 ? "Dentro da meta" : mm.taxa >= 70 ? "Atenção" : "Crítico";
  const statusCol = mm.taxa >= 90 ? "var(--ok)" : mm.taxa >= 70 ? "var(--warn)" : "var(--no)";
  const classifCores = { "Ouro": "#B8860B", "Prata": "#7C8B9A", "Bronze": "#A0522D", "Sem classificação": "var(--no)" };

  return (
    <>
      <div className="dash-temas">
        {temas.map((t) => (
          <button key={t} className={`dash-tema ${tema === t ? "on" : ""}`} onClick={() => setTema(t)}>{t}</button>
        ))}
      </div>
      <div className="grid-dash">
        {/* hero */}
        <section className="card hero">
          {isOPEG ? (
            <>
              <div className="hero-gauge">
                <div className="hero-eyebrow">Pontuação média OPEG</div>
                <div className="opeg-media">{mm.opegMedia != null ? <>{mm.opegMedia}<small> pts</small></> : "—"}</div>
                <div className="hero-status" style={{ color: "var(--brand)" }}>
                  <span className="dot" style={{ background: "var(--brand)" }} />{mm.opegCount} diagnóstico(s)
                </div>
              </div>
              <div className="hero-readouts">
                {["Ouro", "Prata", "Bronze", "Sem classificação"].map((c) => (
                  <Readout key={c} label={c} value={mm.opegClassif[c] || 0} accent={classifCores[c]} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="hero-gauge">
                <div className="hero-eyebrow">Conformidade {tema === "Todos" ? "geral" : tema}</div>
                <Gauge value={mm.taxa} />
                <div className="hero-status" style={{ color: statusCol }}>
                  <span className="dot" style={{ background: statusCol }} />{status}
                </div>
              </div>
              <div className="hero-readouts">
                <Readout label="Diagnósticos" value={mm.totalAud} sub={`${mm.concluidas} concluídos`} />
                <Readout label="NCs abertas" value={mm.abertas} accent="var(--no)" />
                <Readout label="Em tratamento" value={mm.trat} accent="var(--warn)" />
                <Readout label="Resolvidas" value={mm.resolv} accent="var(--ok)" />
              </div>
            </>
          )}
        </section>

        {isOPEG ? (
          <section className="card">
            <SectionTitle>Classificação dos diagnósticos OPEG</SectionTitle>
            {mm.opegCount ? (
              <div className="classif-list">
                {["Ouro", "Prata", "Bronze", "Sem classificação"].map((c) => (
                  <div key={c} className="classif-row">
                    <span className={`classif-badge ${{ "Ouro": "ouro", "Prata": "prata", "Bronze": "bronze", "Sem classificação": "sem" }[c]}`}>{c}</span>
                    <div className="classif-bar"><i style={{ width: `${mm.opegCount ? (mm.opegClassif[c] / mm.opegCount) * 100 : 0}%`, background: classifCores[c] }} /></div>
                    <b>{mm.opegClassif[c] || 0}</b>
                  </div>
                ))}
              </div>
            ) : <Empty>Nenhum diagnóstico OPEG concluído ainda.</Empty>}
          </section>
        ) : (
          <section className="card">
            <SectionTitle>Conformidade por área</SectionTitle>
            <div style={{ height: 226 }}>
              <ResponsiveContainer>
                <BarChart data={mm.barData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <XAxis dataKey="area" tick={{ fontSize: 11, fill: "#5B6673" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#5B6673" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,.04)" }} formatter={(v) => [`${v}%`, "Conformidade"]} />
                  <Bar dataKey="taxa" radius={[4, 4, 0, 0]}>
                    {mm.barData.map((d, i) => (
                      <Cell key={i} fill={d.taxa >= 90 ? "var(--ok)" : d.taxa >= 70 ? "var(--warn)" : "var(--no)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <section className="card">
          <SectionTitle>NCs por status</SectionTitle>
          <div style={{ height: 226, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {mm.pieData.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={mm.pieData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3}>
                    {mm.pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <Empty>Sem não conformidades registradas.</Empty>}
          </div>
        </section>

        <section className="card recent">
          <SectionTitle>Diagnósticos recentes</SectionTitle>
          <div className="rec-list">
            {recent.map((a) => {
              const u = unitById(a.unidadeId);
              return (
                <div key={a.id} className="rec-row">
                  <span className="tag-tipo" data-t={a.tipo}>{a.tipo}</span>
                  <div className="rec-main">
                    <div className="rec-setor">{u ? u.nome : "—"} <span className="rec-sep">·</span> <span className="rec-setorx">{a.setor}</span></div>
                    <div className="rec-meta">{a.auditor} · {fmtDate(a.data)}</div>
                  </div>
                  <StatusPill map={AUD_STATUS} k={a.status} />
                </div>
              );
            })}
            {recent.length === 0 && <Empty>Nenhum diagnóstico ainda.</Empty>}
          </div>
        </section>
      </div>
    </>
  );
}

function Readout({ label, value, sub, accent = "var(--brand)" }) {
  return (
    <div className="readout">
      <div className="readout-value" style={{ color: accent }}>{value}</div>
      <div className="readout-label">{label}</div>
      {sub && <div className="readout-sub">{sub}</div>}
    </div>
  );
}

function Gauge({ value }) {
  const a = Math.PI * (1 - value / 100);
  const r = 78, cx = 100, cy = 96;
  const x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
  const col = value >= 90 ? "var(--ok)" : value >= 70 ? "var(--warn)" : "var(--no)";
  return (
    <svg viewBox="0 0 200 118" className="gauge">
      <path d="M22 96 A78 78 0 0 1 178 96" fill="none" stroke="var(--card-line)" strokeWidth="14" strokeLinecap="round" />
      <path d={`M22 96 A78 78 0 0 1 ${x} ${y}`} fill="none" stroke={col} strokeWidth="14" strokeLinecap="round" />
      <text x="100" y="86" className="gauge-num" fill={col}>{value}<tspan className="gauge-pct">%</tspan></text>
    </svg>
  );
}

/* ============================ Auditorias ============================ */

export { Dashboard };
