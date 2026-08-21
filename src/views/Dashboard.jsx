import React from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie, Tooltip } from "recharts";
import { AUD_STATUS } from "../constants";
import { unitById, fmtDate } from "../utils";
import { SectionTitle, Empty, StatusPill } from "../ui/common";

function Dashboard({ m, audits, ncs }) {
  const recent = [...audits].slice(0, 4);
  const status = m.taxa >= 90 ? "Dentro da meta" : m.taxa >= 70 ? "Atenção" : "Crítico";
  const statusCol = m.taxa >= 90 ? "var(--ok)" : m.taxa >= 70 ? "var(--warn)" : "var(--no)";
  return (
    <div className="grid-dash">
      {/* hero: painel de conformidade */}
      <section className="card hero">
        <div className="hero-gauge">
          <div className="hero-eyebrow">Conformidade geral</div>
          <Gauge value={m.taxa} />
          <div className="hero-status" style={{ color: statusCol }}>
            <span className="dot" style={{ background: statusCol }} />{status}
          </div>
        </div>
        <div className="hero-readouts">
          <Readout label="Diagnósticos" value={m.totalAud} sub={`${m.concluidas} concluídos`} />
          <Readout label="NCs abertas" value={m.abertas} accent="var(--no)" />
          <Readout label="Em tratamento" value={m.trat} accent="var(--warn)" />
          <Readout label="Resolvidas" value={m.resolv} accent="var(--ok)" />
        </div>
      </section>

      <section className="card">
        <SectionTitle>Conformidade por área</SectionTitle>
        <div style={{ height: 226 }}>
          <ResponsiveContainer>
            <BarChart data={m.barData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <XAxis dataKey="area" tick={{ fontSize: 11, fill: "#5B6673" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#5B6673" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(0,0,0,.04)" }} formatter={(v) => [`${v}%`, "Conformidade"]} />
              <Bar dataKey="taxa" radius={[4, 4, 0, 0]}>
                {m.barData.map((d, i) => (
                  <Cell key={i} fill={d.taxa >= 90 ? "var(--ok)" : d.taxa >= 70 ? "var(--warn)" : "var(--no)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <SectionTitle>NCs por status</SectionTitle>
        <div style={{ height: 226, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {m.pieData.length ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={m.pieData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3}>
                  {m.pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
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
