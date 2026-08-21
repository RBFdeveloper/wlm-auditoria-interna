import React, { useState, useMemo, useEffect } from "react";
import { LayoutDashboard, ClipboardList, AlertTriangle, BookOpenCheck, Plus, ChevronRight, Building2, Users, LogOut, Contact, Menu, X } from "lucide-react";
import { LOGO_WLM } from "./constants";
import { unitById, can, roleLabel, allowedUnits, computeMetrics, initials, titleMap, titleEyebrow } from "./utils";
import { BrandMark, WlmLogo, TopAccent } from "./ui/common";
import { auth, listStandards, listAuditorias, listNCs, listUsuarios, createAuditoria, saveExecucao, saveRascunho, tratarNC, criarUsuario, listColaboradores, createColaborador, updateColaborador, deleteColaborador, createTema, deleteTema, updateTemaModo, listSiglas, updateSigla } from "./lib/db";
import { gerarRelatorioPDF } from "./lib/pdf";
import { Dashboard } from "./views/Dashboard";
import { Auditorias } from "./views/Auditorias";
import { NaoConformidades } from "./views/NaoConformidades";
import { Padroes } from "./views/Padroes";
import { Casas } from "./views/Casas";
import { Usuarios } from "./views/Usuarios";
import { Colaboradores } from "./views/Colaboradores";
import { ScopeSelector } from "./views/ScopeSelector";
import { NovaAuditoria } from "./modals/NovaAuditoria";
import { ExecutarAuditoria } from "./modals/ExecutarAuditoria";
import { TratarNC } from "./modals/TratarNC";
import { NovoUsuario } from "./modals/NovoUsuario";
import { NovoColaborador } from "./modals/NovoColaborador";
import { Login, ResetSenha } from "./auth/Auth";
import "./styles.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [users, setUsers] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [siglas, setSiglas] = useState({});
  const [standards, setStandards] = useState(null);
  const [view, setView] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [audits, setAudits] = useState([]);
  const [ncs, setNcs] = useState([]);
  const [modal, setModal] = useState(null);
  const [scope, setScope] = useState({ level: "rede", id: null });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // sessão do Supabase: carrega o profile ao logar; limpa ao sair
  useEffect(() => {
    let mounted = true;
    auth.me().then((u) => { if (mounted) { setUser(u); setAuthReady(true); } });
    const off = auth.onChange(async (authUser) => {
      const u = authUser ? await auth.me() : null;
      if (mounted) setUser(u);
    });
    return () => { mounted = false; off && off(); };
  }, []);

  const papel = user?.papel;
  const allowed = useMemo(() => allowedUnits(user), [user]);
  const allowedSet = useMemo(() => new Set(allowed.map((u) => u.id)), [allowed]);

  // carrega os dados do banco (padrões, auditorias, NCs, usuários)
  async function carregar() {
    setLoading(true); setErro("");
    try {
      const tasks = [listStandards(), listAuditorias(), listNCs(), listColaboradores(), listSiglas()];
      if (can(user?.papel, "users")) tasks.push(listUsuarios());
      const [s, a, n, col, sg, us] = await Promise.all(tasks);
      setStandards(s); setAudits(a); setNcs(n); setColaboradores(col); setSiglas(sg); if (us) setUsers(us);
    } catch (e) {
      setErro(e.message || "Falha ao carregar dados.");
    } finally { setLoading(false); }
  }
  useEffect(() => {
    if (user) { setView("dashboard"); setScope({ level: "rede", id: null }); carregar(); }
    else { setStandards(null); setAudits([]); setNcs([]); setUsers([]); setColaboradores([]); setSiglas({}); }
    // depende só do ID: troca de aba (refresh de token) não recarrega nem reseta a tela
    // eslint-disable-next-line
  }, [user?.id]);

  /* ---------------- ações (Supabase + recarrega) ---------------- */
  const handlers = {
    async createAudit(p) {
      const id = await createAuditoria({ ...p, auditor: user.nome, standards, sigla: siglas[p.unidadeId] || "" });
      await carregar();
      return id;
    },
    async saveExecution(id, tipo, itens, nomes) { await saveExecucao(id, tipo, itens, nomes); await carregar(); },
    async saveDraft(id, itens) { await saveRascunho(id, itens); await carregar(); },
    async treatNc(id, patch) { await tratarNC(id, patch); await carregar(); },
    async createTema(t) { await createTema(t); await carregar(); },
    async delTema(codigo) { await deleteTema(codigo); await carregar(); },
    async setTemaModo(codigo, modo) { await updateTemaModo(codigo, modo); await carregar(); },
    async setSigla(unidadeId, sigla) { await updateSigla(unidadeId, sigla); await carregar(); },
    async createUser(u) {
      try { await criarUsuario(u); await carregar(); }
      catch (e) {
        alert("Não foi possível criar o usuário.\n\n" +
          "Verifique no Supabase (Authentication → Providers → Email):\n" +
          "• 'Confirm email' deve estar DESLIGADO\n" +
          "• 'Allow new users to sign up' deve estar LIGADO\n\n" +
          "Detalhe: " + (e.message || e));
      }
    },
    async createColab(c) { await createColaborador(c); await carregar(); },
    async editColab(id, c) { await updateColaborador(id, c); await carregar(); },
    async delColab(id) { await deleteColaborador(id); await carregar(); },
    reload: carregar,
  };

  const auditById = (id) => audits.find((a) => a.id === id);
  const ncById = (id) => ncs.find((n) => n.id === id);

  /* ---------------- acesso por casa + escopo ---------------- */
  const baseAudits = useMemo(() =>
    can(papel, "all_houses") ? audits : audits.filter((a) => allowedSet.has(a.unidadeId)),
    [audits, allowedSet, papel]);
  const inScope = (a) => {
    if (scope.level === "rede") return true;
    const u = unitById(a.unidadeId);
    if (!u) return false;
    if (scope.level === "grupo") return u.grupoId === scope.id;
    return a.unidadeId === scope.id;
  };
  const scopedAudits = useMemo(() => baseAudits.filter(inScope), [baseAudits, scope]);
  const scopedNcs = useMemo(() => {
    const ids = new Set(scopedAudits.map((a) => a.id));
    return ncs.filter((n) => ids.has(n.auditoriaId));
  }, [ncs, scopedAudits]);
  const metrics = useMemo(() => computeMetrics(scopedAudits, scopedNcs), [scopedAudits, scopedNcs]);

  /* ---------------- login gate ---------------- */
  if (!authReady) {
    return <div className="app login-app"><div className="boot">Carregando…</div></div>;
  }
  if (!user) {
    return <div className="app login-app"><Login onLogged={async () => setUser(await auth.me())} /></div>;
  }
  if (user.senhaProvisoria) {
    return <div className="app login-app">
      <ResetSenha onDone={async () => setUser(await auth.me())} onCancel={async () => { await auth.logout(); setUser(null); }} />
    </div>;
  }

  const navItems = [
    ["dashboard", "Visão geral", LayoutDashboard],
    ["casas", "Casas", Building2],
    ["auditorias", "Diagnósticos", ClipboardList],
    ["ncs", "Não conformidades", AlertTriangle],
    ["padroes", "Padrões", BookOpenCheck],
    ...(can(papel, "users") ? [["colaboradores", "Colaboradores", Contact], ["usuarios", "Usuários", Users]] : []),
  ];
  const canAudit = can(papel, "audit");

  return (
    <div className={`app ${mobileNav ? "nav-open" : ""}`}>
      {mobileNav && <div className="nav-backdrop" onClick={() => setMobileNav(false)} />}

      {/* ---------------- Sidebar ---------------- */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="brand">
          <BrandMark />
          <div className="brand-txt">
            <div className="brand-name">Diagnóstico Interno</div>
          </div>
          <button className="side-close" title="Fechar menu" onClick={() => setMobileNav(false)}><X size={18} /></button>
          <button className="side-toggle" title={collapsed ? "Expandir" : "Recolher"} onClick={() => setCollapsed((c) => !c)}>
            <ChevronRight size={16} className={collapsed ? "" : "rot"} />
          </button>
        </div>

        <nav className="nav">
          {navItems.map(([k, label, Icon]) => (
            <button key={k} className={`nav-item ${view === k ? "active" : ""}`} onClick={() => { setView(k); setMobileNav(false); }} title={collapsed ? label : ""}>
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
              {k === "ncs" && metrics.abertas > 0 && <span className="badge">{metrics.abertas}</span>}
            </button>
          ))}
        </nav>

        <div className="side-foot">
          <div className="avatar">{initials(user.nome)}</div>
          <div className="side-user">
            <div className="uname">{user.nome}</div>
            <div className="urole">{roleLabel(user.papel)}</div>
          </div>
          <button className="logout" title="Sair" onClick={async () => { await auth.logout(); setUser(null); }}><LogOut size={16} /></button>
        </div>
      </aside>

      {/* ---------------- Main ---------------- */}
      <main className="main">
        <TopAccent />
        <header className="topbar">
          <div className="topbar-left">
            <button className="nav-toggle" title="Menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
            <div>
              <div className="eyebrow">{titleEyebrow(view)}</div>
              <h1 className="title">{titleMap(view)}</h1>
            </div>
            {view !== "usuarios" && view !== "padroes" &&
              <ScopeSelector scope={scope} onChange={setScope} units={allowed} />}
          </div>
          <div className="top-actions">
            {canAudit &&
              <button className="btn primary" onClick={() => setModal({ type: "new" })}>
                <Plus size={16} /> Novo diagnóstico
              </button>}
            <WlmLogo />
          </div>
        </header>

        <div className="content">
          {erro && <div className="err-banner">⚠ {erro} <button onClick={carregar}>tentar de novo</button></div>}
          {loading && !standards && <div className="boot inline">Carregando dados do Supabase…</div>}
          {view === "dashboard" && <Dashboard m={metrics} audits={scopedAudits} ncs={scopedNcs} />}
          {view === "casas" && (
            <Casas audits={baseAudits} ncs={ncs} units={allowed} siglas={siglas}
              canEdit={can(papel, "standards")} onSigla={(id, s) => handlers.setSigla(id, s)}
              onOpen={(unidadeId) => { setScope({ level: "unidade", id: unidadeId }); setView("dashboard"); }} />
          )}
          {view === "auditorias" && (
            <Auditorias audits={scopedAudits} canAudit={canAudit}
              onNew={() => setModal({ type: "new" })}
              onExec={(id) => setModal({ type: "exec", id })}
              onPdf={(a) => gerarRelatorioPDF({ audit: a, ncs, colaboradores, unidadeNome: unitById(a.unidadeId)?.nome || "—", logo: LOGO_WLM })} />
          )}
          {view === "ncs" && (
            <NaoConformidades ncs={scopedNcs} audits={audits} canTreat={can(papel, "treat")}
              onTreat={(id) => setModal({ type: "treat", id })} />
          )}
          {view === "padroes" && standards && (
            <Padroes standards={standards} canEdit={can(papel, "standards")} reload={carregar}
              onNewTema={(t) => handlers.createTema(t)} onDelTema={(c) => handlers.delTema(c)}
              onTemaModo={(c, m) => handlers.setTemaModo(c, m)} />
          )}
          {view === "usuarios" && can(papel, "users") && (
            <Usuarios users={users} onNew={() => setModal({ type: "user" })} />
          )}
          {view === "colaboradores" && can(papel, "users") && (
            <Colaboradores colaboradores={colaboradores} units={allowed}
              onNew={() => setModal({ type: "colab" })}
              onEdit={(c) => setModal({ type: "colab", colab: c })}
              onDel={(id) => handlers.delColab(id)} />
          )}
        </div>
      </main>

      {/* ---------------- Modais ---------------- */}
      {modal?.type === "new" && (
        <NovaAuditoria scope={scope} units={allowed} standards={standards} colaboradores={colaboradores} siglas={siglas}
          onClose={() => setModal(null)}
          onCreate={async (p) => { const id = await handlers.createAudit(p); setModal({ type: "exec", id }); }} />
      )}
      {modal?.type === "exec" && auditById(modal.id) && (
        <ExecutarAuditoria audit={auditById(modal.id)} standards={standards} colaboradores={colaboradores} readOnly={!canAudit}
          onClose={() => setModal(null)}
          onSave={async (itens) => {
            const a = auditById(modal.id);
            const nomes = Object.fromEntries(colaboradores.map((c) => [c.id, c.nome]));
            await handlers.saveExecution(modal.id, a.tipo, itens, nomes); setModal(null); setView("ncs");
          }}
          onDraft={async (itens) => { await handlers.saveDraft(modal.id, itens); setModal(null); }} />
      )}
      {modal?.type === "treat" && ncById(modal.id) && (
        <TratarNC nc={ncById(modal.id)} audit={auditById(ncById(modal.id).auditoriaId)}
          onClose={() => setModal(null)}
          onSave={async (p) => { await handlers.treatNc(modal.id, p); setModal(null); }} />
      )}
      {modal?.type === "user" && (
        <NovoUsuario onClose={() => setModal(null)}
          onCreate={async (u) => { await handlers.createUser(u); setModal(null); }} />
      )}
      {modal?.type === "colab" && (
        <NovoColaborador units={allowed} standards={standards} colab={modal.colab} onClose={() => setModal(null)}
          onCreate={async (c) => { await handlers.createColab(c); setModal(null); }}
          onEdit={async (id, c) => { await handlers.editColab(id, c); setModal(null); }} />
      )}
    </div>
  );
}
