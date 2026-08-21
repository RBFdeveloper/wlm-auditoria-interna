import React from "react";
import { X } from "lucide-react";
import { LOGO_WLM } from "../constants";

function BrandMark() {
  return (
    <div className="mark">
      {LOGO_WLM
        ? <img src={LOGO_WLM} alt="WLM" className="mark-img" />
        : <span className="mark-txt">WLM</span>}
    </div>
  );
}
function TopAccent() { return <div className="top-accent" />; }
function WlmLogo() {
  return (
    <div className="wlm-top" title="WLM">
      {LOGO_WLM
        ? <img src={LOGO_WLM} alt="WLM" />
        : <span>WLM</span>}
    </div>
  );
}

function Modal({ title, sub, onClose, children, wide }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <div>
            <div className="modal-eyebrow">{sub}</div>
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, icon: Icon, children }) {
  return (
    <label className="field">
      <span className="field-label">{Icon && <Icon size={13} />}{label}</span>
      {children}
    </label>
  );
}
function SectionTitle({ children }) { return <div className="sec-title">{children}</div>; }
function Empty({ children }) { return <div className="empty">{children}</div>; }
function StatusPill({ map, k }) {
  const m = map[k]; const Icon = m.Icon;
  return <span className="pill" style={{ color: m.color, borderColor: m.color }}>
    {Icon && <Icon size={12} />}{m.label}
  </span>;
}

/* ============================ utils ============================ */

export { Modal, Field, SectionTitle, Empty, StatusPill, BrandMark, WlmLogo, TopAccent };
