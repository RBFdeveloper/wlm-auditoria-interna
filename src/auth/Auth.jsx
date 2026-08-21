import React, { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { APP_VERSION, LOGO_WLM } from "../constants";
import { auth } from "../lib/db";

function Login({ onLogged }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const entrar = async () => {
    if (!email || !senha) return;
    setCarregando(true); setErro("");
    try { await auth.login(email.trim(), senha); await onLogged(); }
    catch (e) { setErro(traduzErro(e)); }
    finally { setCarregando(false); }
  };
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo"><img src={LOGO_WLM} alt="WLM" /></div>
        <div className="login-title">Portal de Auditoria Interna</div>
        <div className="login-sub">Grupo WLM · Scania</div>

        <label className="login-field">
          <Mail size={15} />
          <input type="email" placeholder="E-mail" value={email}
            onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} />
        </label>
        <label className="login-field">
          <Lock size={15} />
          <input type="password" placeholder="Senha" value={senha}
            onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} />
        </label>
        {erro && <div className="login-erro">{erro}</div>}
        <button className="btn primary login-btn" onClick={entrar} disabled={carregando}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </div>
      <div className="login-foot">WLM · Auditoria Interna · {APP_VERSION}</div>
    </div>
  );
}
function traduzErro(e) {
  const m = (e?.message || "").toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha inválidos.";
  if (m.includes("email not confirmed")) return "E-mail ainda não confirmado.";
  return e?.message || "Falha ao entrar.";
}

function ResetSenha({ onDone, onCancel }) {
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const forte = s1.length >= 8 && /[A-Za-z]/.test(s1) && /\d/.test(s1);
  const salvar = async () => {
    if (!forte) { setErro("Use ao menos 8 caracteres, com letras e números."); return; }
    if (s1 !== s2) { setErro("As senhas não coincidem."); return; }
    setSalvando(true); setErro("");
    try { await auth.setPassword(s1); await onDone(); }
    catch (e) { setErro(e.message || "Falha ao salvar."); setSalvando(false); }
  };
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo"><img src={LOGO_WLM} alt="WLM" /></div>
        <div className="login-title">Defina sua senha</div>
        <div className="login-sub">Primeiro acesso — troque a senha padrão pela sua</div>
        <label className="login-field">
          <Lock size={15} />
          <input type="password" placeholder="Nova senha" value={s1}
            onChange={(e) => setS1(e.target.value)} />
        </label>
        <label className="login-field">
          <Lock size={15} />
          <input type="password" placeholder="Confirme a nova senha" value={s2}
            onChange={(e) => setS2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && salvar()} />
        </label>
        {erro && <div className="login-erro">{erro}</div>}
        <button className="btn primary login-btn" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar e entrar"}
        </button>
        <div className="login-hint" style={{ cursor: "pointer" }} onClick={onCancel}>Sair</div>
      </div>
      <div className="login-foot">WLM · Auditoria Interna · {APP_VERSION}</div>
    </div>
  );
}

export { Login, ResetSenha };
