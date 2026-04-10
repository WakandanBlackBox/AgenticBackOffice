import React, { useReducer, useEffect, useRef, useState, useCallback } from 'react';

// ─── Colors ────────────────────────────────────────────────────────
const C = {
  bg: '#0F1117', surface: '#1A1D27', surfaceHover: '#242836', border: '#2E3346',
  primary: '#6C5CE7', primaryHover: '#7F71EF', accent: '#00D2D3',
  success: '#00B894', warning: '#FDCB6E', danger: '#E17055',
  text: '#F1F2F6', textMuted: '#8B92A8', textDim: '#5A6178',
  proposal: '#74B9FF', invoice: '#55EFC4', contract: '#FAB1A0',
  scope: '#FFEAA7', insight: '#A29BFE', chief: '#6C5CE7',
};

const AGENT_NAMES = {
  chief: 'Chief Agent', proposal: 'Proposal Agent', invoice: 'Invoice Agent',
  contract: 'Contract Agent', scope_guardian: 'Scope Guardian', insight: 'Insight Agent',
};
const AGENT_COLORS = {
  chief: C.chief, proposal: C.proposal, invoice: C.invoice,
  contract: C.contract, scope_guardian: C.scope, insight: C.insight,
};

// ─── Style helpers ─────────────────────────────────────────────────
const S = {
  card: { background: C.surface, borderRadius: 14, padding: 22, border: `1px solid ${C.border}`, transition: 'border-color 0.2s, box-shadow 0.2s' },
  cardHover: { borderColor: C.primary + '44', boxShadow: `0 0 20px ${C.primary}11` },
  input: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 16px', color: C.text, width: '100%', outline: 'none', fontSize: 14, transition: 'border-color 0.2s, box-shadow 0.2s' },
  btn: { background: C.primary, color: C.text, border: 'none', borderRadius: 10, padding: '10px 22px', cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all 0.2s', ':hover': { background: C.primaryHover } },
  btnOutline: { background: 'transparent', color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' },
  btnDanger: { background: C.danger, color: C.text, border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13 },
  badge: (color) => ({ display: 'inline-flex', alignItems: 'center', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: color + '18', color, letterSpacing: '0.02em' }),
};

// ─── Utilities ─────────────────────────────────────────────────────
const fmt = (cents) => {
  if (cents == null) return '$0';
  const n = Number(cents);
  return '$' + (n / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};

const api = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
};

// ─── SSE Chat Streamer ────────────────────────────────────────────
const streamChat = async (message, projectId, dispatch, abortSignal) => {
  dispatch({ type: 'CHAT_ADD_USER_MSG', message });
  dispatch({ type: 'CHAT_STREAM_START' });

  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/agents/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, project_id: projectId }),
      signal: abortSignal,
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          switch (data.type) {
            case 'scope_alert_start':
              dispatch({ type: 'CHAT_SCOPE_ALERT_START', reason: data.reason });
              break;
            case 'scope_alert_end':
              dispatch({ type: 'CHAT_SCOPE_ALERT_END' });
              break;
            case 'agent_start':
              if (data.scope_alert) dispatch({ type: 'CHAT_SCOPE_ALERT_AGENT', agent: data.agent, name: data.name });
              else dispatch({ type: 'CHAT_AGENT_START', agent: data.agent, name: data.name });
              break;
            case 'text':
              if (data.scope_alert) dispatch({ type: 'CHAT_SCOPE_ALERT_TEXT', content: data.content });
              else if (!data.delegated_by) dispatch({ type: 'CHAT_STREAM_TEXT', content: data.content });
              break;
            case 'tool_call': dispatch({ type: 'CHAT_STREAM_EVENT', event: { type: 'tool_call', tool: data.tool, input: data.input, delegatedBy: data.delegated_by } }); break;
            case 'tool_result': dispatch({ type: 'CHAT_STREAM_EVENT', event: { type: 'tool_result', tool: data.tool, result: data.result, delegatedBy: data.delegated_by } }); break;
            case 'delegation_start': dispatch({ type: 'CHAT_DELEGATION_START', agent: data.agent, parent: data.parent }); break;
            case 'delegation_complete': dispatch({ type: 'CHAT_DELEGATION_COMPLETE', agent: data.agent, parent: data.parent }); break;
            case 'agent_complete': dispatch({ type: 'CHAT_AGENT_COMPLETE', agent: data.agent, durationMs: data.duration_ms, tokens: data.tokens }); break;
            case 'error': dispatch({ type: 'CHAT_STREAM_ERROR', error: data.error }); break;
            case 'done': break; // handled by reader completing
          }
        } catch { /* skip malformed lines */ }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      dispatch({ type: 'CHAT_STREAM_ERROR', error: err.message });
    }
  }
  dispatch({ type: 'CHAT_STREAM_DONE' });
};

// ─── Reducer ──────────────────────────────────────────────────────
const initialState = {
  view: 'auth', user: null, token: localStorage.getItem('token'),
  authMode: 'login', authError: null,
  dashboard: null, dashboardLoading: false,
  chatMessages: [], chatStreaming: false, chatProjectId: null, activeAgents: [],
  projects: [], projectsLoading: false,
  selectedProject: null, projectDetailLoading: false,
  clients: [], clientsLoading: false, showClientForm: false, editingClient: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW': return { ...state, view: action.view };
    case 'SET_AUTH': {
      localStorage.setItem('token', action.token);
      return { ...state, user: action.user, token: action.token, authError: null, view: 'dashboard' };
    }
    case 'LOGOUT': {
      localStorage.removeItem('token');
      return { ...initialState, token: null, view: 'auth' };
    }
    case 'SET_AUTH_MODE': return { ...state, authMode: action.mode, authError: null };
    case 'SET_AUTH_ERROR': return { ...state, authError: action.error };
    case 'SET_DASHBOARD': return { ...state, dashboard: action.data, dashboardLoading: false };
    case 'SET_DASHBOARD_LOADING': return { ...state, dashboardLoading: true };
    case 'SET_PROJECTS': return { ...state, projects: action.projects, projectsLoading: false };
    case 'SET_PROJECTS_LOADING': return { ...state, projectsLoading: true };
    case 'SET_SELECTED_PROJECT': return { ...state, selectedProject: action.project, projectDetailLoading: false };
    case 'SET_PROJECT_DETAIL_LOADING': return { ...state, projectDetailLoading: true };
    case 'SET_CLIENTS': return { ...state, clients: action.clients, clientsLoading: false };
    case 'SET_CLIENTS_LOADING': return { ...state, clientsLoading: true };
    case 'SET_SHOW_CLIENT_FORM': return { ...state, showClientForm: action.show, editingClient: action.client || null };
    case 'SET_CHAT_PROJECT': {
      // Save current chat before switching
      if (state.chatProjectId && state.chatMessages.length > 0) {
        localStorage.setItem(`chat_${state.chatProjectId}`, JSON.stringify(state.chatMessages));
      }
      // Load saved chat for new project
      const saved = action.projectId ? localStorage.getItem(`chat_${action.projectId}`) : null;
      return { ...state, chatProjectId: action.projectId, chatMessages: saved ? JSON.parse(saved) : [], chatStreaming: false, activeAgents: [] };
    }
    case 'CHAT_ADD_USER_MSG':
      return { ...state, chatMessages: [...state.chatMessages, { id: Date.now(), role: 'user', content: action.message }] };
    case 'CHAT_STREAM_START':
      return { ...state, chatStreaming: true, activeAgents: [], chatMessages: [...state.chatMessages, { id: Date.now(), role: 'assistant', content: '', events: [], agents: [] }] };
    case 'CHAT_CLEAR': return { ...state, chatMessages: [], chatStreaming: false, activeAgents: [] };
    case 'CHAT_SCOPE_ALERT_START': {
      // Insert a scope alert message before the main response
      return { ...state, chatMessages: [...state.chatMessages, { id: Date.now(), role: 'scope_alert', reason: action.reason, content: '', agents: [] }] };
    }
    case 'CHAT_SCOPE_ALERT_TEXT': {
      const msgs = [...state.chatMessages];
      const alertIdx = msgs.findLastIndex((m) => m.role === 'scope_alert');
      if (alertIdx >= 0) { msgs[alertIdx] = { ...msgs[alertIdx], content: msgs[alertIdx].content + action.content }; }
      return { ...state, chatMessages: msgs };
    }
    case 'CHAT_SCOPE_ALERT_AGENT': {
      const msgs = [...state.chatMessages];
      const alertIdx = msgs.findLastIndex((m) => m.role === 'scope_alert');
      if (alertIdx >= 0 && !msgs[alertIdx].agents.includes(action.agent)) { msgs[alertIdx] = { ...msgs[alertIdx], agents: [...msgs[alertIdx].agents, action.agent] }; }
      return { ...state, chatMessages: msgs };
    }
    case 'CHAT_SCOPE_ALERT_END': return state; // no-op, alert is already rendered
    case 'CHAT_STREAM_TEXT': {
      const msgs = [...state.chatMessages];
      const idx = msgs.findLastIndex((m) => m.role === 'assistant');
      if (idx < 0) return state;
      msgs[idx] = { ...msgs[idx], content: msgs[idx].content + action.content };
      return { ...state, chatMessages: msgs };
    }
    case 'CHAT_AGENT_START': {
      const msgs = [...state.chatMessages];
      const idx = msgs.findLastIndex((m) => m.role === 'assistant');
      if (idx < 0) return state;
      const last = { ...msgs[idx] };
      last.events = [...(last.events || []), { type: 'agent_start', agent: action.agent, name: action.name }];
      if (!(last.agents || []).includes(action.agent)) last.agents = [...(last.agents || []), action.agent];
      msgs[idx] = last;
      return { ...state, chatMessages: msgs, activeAgents: [...state.activeAgents, action.agent] };
    }
    case 'CHAT_STREAM_EVENT':
    case 'CHAT_DELEGATION_START':
    case 'CHAT_DELEGATION_COMPLETE':
    case 'CHAT_AGENT_COMPLETE': {
      const msgs = [...state.chatMessages];
      const idx = msgs.findLastIndex((m) => m.role === 'assistant');
      if (idx < 0) return state;
      const evt = action.type === 'CHAT_STREAM_EVENT' ? action.event
        : action.type === 'CHAT_DELEGATION_START' ? { type: 'delegation_start', agent: action.agent, parent: action.parent }
        : action.type === 'CHAT_DELEGATION_COMPLETE' ? { type: 'delegation_complete', agent: action.agent, parent: action.parent }
        : { type: 'agent_complete', agent: action.agent, durationMs: action.durationMs, tokens: action.tokens };
      msgs[idx] = { ...msgs[idx], events: [...(msgs[idx].events || []), evt] };
      const removeAgent = action.type === 'CHAT_DELEGATION_COMPLETE' || action.type === 'CHAT_AGENT_COMPLETE';
      return { ...state, chatMessages: msgs, activeAgents: removeAgent ? state.activeAgents.filter((a) => a !== action.agent) : state.activeAgents };
    }
    case 'CHAT_STREAM_ERROR': {
      const msgs = [...state.chatMessages];
      const idx = msgs.findLastIndex((m) => m.role === 'assistant');
      if (idx >= 0) msgs[idx] = { ...msgs[idx], error: action.error };
      return { ...state, chatMessages: msgs, chatStreaming: false, activeAgents: [] };
    }
    case 'CHAT_STREAM_DONE': {
      const key = state.chatProjectId ? `chat_${state.chatProjectId}` : 'chat_all';
      if (state.chatMessages.length > 0) localStorage.setItem(key, JSON.stringify(state.chatMessages));
      return { ...state, chatStreaming: false, activeAgents: [] };
    }
    default: return state;
  }
}

// ─── Simple Markdown (XSS-safe -- no dangerouslySetInnerHTML) ─────
function InlineFormat({ text }) {
  // Parse **bold** and `code` into React elements without innerHTML
  const parts = [];
  let remaining = text;
  let i = 0;
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let match;
  let lastIdx = 0;
  while ((match = regex.exec(remaining)) !== null) {
    if (match.index > lastIdx) parts.push(<span key={i++}>{remaining.slice(lastIdx, match.index)}</span>);
    if (match[2]) parts.push(<strong key={i++}>{match[2]}</strong>);
    else if (match[3]) parts.push(<code key={i++} style={{ background: '#242836', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>{match[3]}</code>);
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < remaining.length) parts.push(<span key={i++}>{remaining.slice(lastIdx)}</span>);
  return parts.length > 0 ? <>{parts}</> : <>{text}</>;
}

function MiniMarkdown({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let inCode = false;
  let codeLines = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        elements.push(<pre key={key++} style={{ background: C.bg, padding: 12, borderRadius: 8, overflow: 'auto', fontSize: 13, margin: '8px 0' }}><code>{codeLines.join('\n')}</code></pre>);
        codeLines = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    if (!line.trim()) { elements.push(<div key={key++} style={{ height: 8 }} />); continue; }

    const isList = line.startsWith('- ') || line.match(/^\d+\.\s/);
    const display = line.replace(/^- /, '\u2022 ');

    if (isList) {
      elements.push(<div key={key++} style={{ paddingLeft: 16, margin: '2px 0' }}><InlineFormat text={display} /></div>);
    } else {
      elements.push(<p key={key++} style={{ margin: '4px 0', lineHeight: 1.6 }}><InlineFormat text={display} /></p>);
    }
  }
  if (inCode && codeLines.length > 0) {
    elements.push(<pre key={key++} style={{ background: C.bg, padding: 12, borderRadius: 8, overflow: 'auto', fontSize: 13 }}><code>{codeLines.join('\n')}</code></pre>);
  }
  return <>{elements}</>;
}

// ─── Auth View ────────────────────────────────────────────────────
function AuthView({ state, dispatch }) {
  const [form, setForm] = useState({ email: '', password: '', name: '', business_name: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    dispatch({ type: 'SET_AUTH_ERROR', error: null });
    try {
      const endpoint = state.authMode === 'login' ? '/auth/login' : '/auth/register';
      const body = state.authMode === 'login' ? { email: form.email, password: form.password } : form;
      const { token, user } = await api(endpoint, { method: 'POST', body });
      dispatch({ type: 'SET_AUTH', user, token });
    } catch (err) {
      dispatch({ type: 'SET_AUTH_ERROR', error: err.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: C.bg }}>
      <div className="fade-in" style={{ ...S.card, width: 420, maxWidth: '90vw', padding: 32 }}>
        <div className="float" style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>&#9670;</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4, textAlign: 'center', letterSpacing: '-0.02em' }}>BackOffice Agent</h1>
        <p style={{ color: C.textMuted, textAlign: 'center', marginBottom: 28, fontSize: 14 }}>Five AI agents. Zero admin hours.</p>

        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {['login', 'register'].map((m) => (
            <button key={m} onClick={() => dispatch({ type: 'SET_AUTH_MODE', mode: m })}
              style={{ flex: 1, padding: '10px 0', background: state.authMode === m ? C.primary : 'transparent', color: state.authMode === m ? C.text : C.textMuted, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {state.authMode === 'register' && (
            <>
              <input style={S.input} placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input style={S.input} placeholder="Business name (optional)" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
            </>
          )}
          <input style={S.input} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input style={S.input} type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          {state.authError && <p style={{ color: C.danger, fontSize: 13 }}>{state.authError}</p>}
          <button type="submit" style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? 'Working...' : state.authMode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────
function Sidebar({ state, dispatch }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '\u25A0', color: C.accent },
    { id: 'chat', label: 'AI Chat', icon: '\u25C6', color: C.primary },
    { id: 'projects', label: 'Projects', icon: '\u25B6', color: C.proposal },
    { id: 'clients', label: 'Clients', icon: '\u25CF', color: C.invoice },
    { id: 'activity', label: 'Activity Log', icon: '\u25E6', color: C.insight },
  ];

  return (
    <div style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '20px 16px', borderBottom: `1px solid ${C.border}` }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>BackOffice</h2>
        <p style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>AI-powered back-office</p>
      </div>

      <nav style={{ flex: 1, padding: '12px 0' }}>
        {navItems.map((item) => {
          const active = state.view === item.id || (item.id === 'projects' && state.view === 'project_detail');
          return (
            <button key={item.id} className="nav-item" onClick={() => dispatch({ type: 'SET_VIEW', view: item.id })}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: active ? C.surfaceHover : 'transparent', border: 'none', borderLeft: active ? `3px solid ${item.color}` : '3px solid transparent', color: active ? C.text : C.textMuted, cursor: 'pointer', fontSize: 14, textAlign: 'left', borderRadius: 0, transition: 'all 0.15s' }}>
              <span style={{ color: item.color, fontSize: 10 }}>{item.icon}</span>
              {item.label}
              {item.id === 'chat' && state.chatStreaming && (
                <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: C.primary, marginLeft: 'auto' }} />
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: 16, borderTop: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 8 }}>{state.user?.name || state.user?.email}</p>
        <button onClick={() => dispatch({ type: 'LOGOUT' })} style={{ ...S.btnOutline, width: '100%', fontSize: 12 }}>Sign Out</button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────
function KPICard({ label, value, color, subtitle }) {
  return (
    <div style={{ ...S.card, borderTop: `3px solid ${color}` }}>
      <p style={{ color: C.textMuted, fontSize: 12, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700 }}>{value}</p>
      {subtitle && <p style={{ color: C.textDim, fontSize: 12, marginTop: 4 }}>{subtitle}</p>}
    </div>
  );
}

function DashboardView({ state, dispatch }) {
  useEffect(() => {
    dispatch({ type: 'SET_DASHBOARD_LOADING' });
    api('/dashboard').then((data) => dispatch({ type: 'SET_DASHBOARD', data })).catch(() => {});
  }, []);

  const d = state.dashboard;
  if (state.dashboardLoading || !d) return <p style={{ color: C.textMuted, padding: 40 }}>Loading dashboard...</p>;

  const kpis = d.kpis || {};
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <KPICard label="Pipeline Value" value={fmt(kpis.pipeline_cents)} color={C.proposal} subtitle={`${kpis.active_projects || 0} active projects`} />
        <KPICard label="Revenue (30d)" value={fmt(kpis.paid_cents)} color={C.success} />
        <KPICard label="Outstanding" value={fmt(kpis.outstanding_cents)} color={C.warning} />
        <KPICard label="Overdue" value={fmt(kpis.overdue_cents)} color={C.danger} subtitle={kpis.overdue_count ? `${kpis.overdue_count} invoices` : 'None'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={S.card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Active Projects</h3>
          {(d.projects || []).length === 0 && <p style={{ color: C.textDim, fontSize: 13 }}>No active projects</p>}
          {(d.projects || []).map((p) => (
            <div key={p.id} onClick={() => { dispatch({ type: 'SET_VIEW', view: 'project_detail' }); loadProjectDetail(p.id, dispatch); }}
              style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</p>
                <p style={{ fontSize: 12, color: C.textMuted }}>{p.client_name || 'No client'}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.proposal }}>{fmt(p.budget_cents)}</span>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Recent Agent Activity</h3>
          {(d.recent_activity || []).length === 0 && <p style={{ color: C.textDim, fontSize: 13 }}>No recent activity</p>}
          {(d.recent_activity || []).slice(0, 8).map((log, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={S.badge(AGENT_COLORS[log.agent] || C.textDim)}>{AGENT_NAMES[log.agent] || log.agent}</span>
              <span style={{ fontSize: 12, color: C.textDim, marginLeft: 'auto' }}>{log.duration_ms ? `${log.duration_ms}ms` : ''} {log.created_at ? timeAgo(log.created_at) : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Chat View (THE STAR) ─────────────────────────────────────────
function AgentBadge({ agent }) {
  const color = AGENT_COLORS[agent] || C.textDim;
  const name = AGENT_NAMES[agent] || agent;
  return <span style={S.badge(color)}>{name}</span>;
}

function ToolCallPill({ event }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ margin: '4px 0' }}>
      <button onClick={() => setOpen(!open)} style={{ background: C.surfaceHover, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', color: C.textDim, fontSize: 12 }}>
        {event.type === 'tool_call' ? '\u2192' : '\u2190'} {event.tool} {open ? '\u25B4' : '\u25BE'}
      </button>
      {open && (
        <pre style={{ background: C.bg, padding: 8, borderRadius: 6, fontSize: 11, overflow: 'auto', maxHeight: 200, marginTop: 4 }}>
          {JSON.stringify(event.type === 'tool_call' ? event.input : event.result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <button onClick={handleCopy} style={{ ...S.btnOutline, padding: '1px 8px', fontSize: 11, marginLeft: 'auto', color: copied ? C.success : C.textDim, borderColor: copied ? C.success + '44' : C.border }}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ChatMessage({ msg }) {
  if (msg.role === 'scope_alert') {
    return (
      <div className="fade-in" style={{ marginBottom: 16, padding: '14px 18px', background: C.scope + '12', border: `1px solid ${C.scope}44`, borderRadius: 14, borderLeft: `3px solid ${C.scope}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>&#9888;</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.scope }}>Scope Alert Detected</span>
          <span style={{ fontSize: 12, color: C.textMuted }}>{msg.reason}</span>
        </div>
        {msg.content && <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}><MiniMarkdown text={msg.content} /></div>}
      </div>
    );
  }

  if (msg.role === 'user') {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{ background: C.primary, borderRadius: '18px 18px 4px 18px', padding: '11px 18px', maxWidth: '70%' }}>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>{msg.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  const delegations = (msg.events || []).filter((e) => e.type === 'delegation_start');
  const agentCompletes = (msg.events || []).filter((e) => e.type === 'agent_complete');
  const toolEvents = (msg.events || []).filter((e) => e.type === 'tool_call' || e.type === 'tool_result');

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
      <div className="fade-in" style={{ background: C.surface, borderRadius: '18px 18px 18px 4px', padding: '14px 18px', maxWidth: '85%', border: `1px solid ${C.border}` }}>
        {/* Agent badges */}
        {(msg.agents || []).length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {msg.agents.map((a) => <AgentBadge key={a} agent={a} />)}
          </div>
        )}

        {/* Delegation indicators */}
        {delegations.map((d, i) => (
          <div key={i} style={{ borderLeft: `2px solid ${AGENT_COLORS[d.agent] || C.textDim}`, paddingLeft: 10, margin: '6px 0', fontSize: 12, color: C.textMuted }}>
            Delegated to {AGENT_NAMES[d.agent] || d.agent}
          </div>
        ))}

        {/* Tool calls (collapsed by default) */}
        {toolEvents.length > 0 && (
          <div style={{ margin: '6px 0' }}>
            {toolEvents.map((e, i) => <ToolCallPill key={i} event={e} />)}
          </div>
        )}

        {/* Main text content */}
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <MiniMarkdown text={msg.content} />
        </div>

        {/* Error */}
        {msg.error && <p style={{ color: C.danger, fontSize: 13, marginTop: 8 }}>{msg.error}</p>}

        {/* Completion stats */}
        {/* Footer: stats + copy */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {agentCompletes.map((ac, i) => (
            <span key={i} style={{ fontSize: 11, color: C.textDim }}>
              {AGENT_NAMES[ac.agent] || ac.agent}: {ac.durationMs ? `${(ac.durationMs / 1000).toFixed(1)}s` : ''} {ac.tokens ? `(${ac.tokens.input + ac.tokens.output} tokens)` : ''}
            </span>
          ))}
          {msg.content && (
            <CopyButton text={msg.content} />
          )}
        </div>
      </div>
    </div>
  );
}

function ChatView({ state, dispatch }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);

  // Load projects for dropdown
  useEffect(() => {
    if (state.projects.length === 0) {
      api('/projects').then(({ projects }) => dispatch({ type: 'SET_PROJECTS', projects })).catch(() => {});
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || state.chatStreaming) return;
    const msg = input.trim();
    setInput('');
    abortRef.current = new AbortController();
    streamChat(msg, state.chatProjectId, dispatch, abortRef.current.signal);
  }, [input, state.chatStreaming, state.chatProjectId, dispatch]);

  const handleStop = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  const quickActions = [
    { label: 'How am I doing?', msg: 'How am I doing this month? Give me a full business overview.' },
    { label: 'Overdue invoices?', msg: 'Do I have any overdue invoices? What should I do about them?' },
    { label: 'Pipeline status', msg: 'What does my project pipeline look like right now?' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>AI Chat</h1>
        <select value={state.chatProjectId || ''} onChange={(e) => dispatch({ type: 'SET_CHAT_PROJECT', projectId: e.target.value || null })}
          style={{ ...S.input, width: 220, padding: '6px 10px' }}>
          <option value="">All projects</option>
          {state.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {state.activeAgents.length > 0 && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 'auto' }}>
            {state.activeAgents.map((a) => (
              <span key={a} className="typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: AGENT_COLORS[a] || C.textDim }} title={AGENT_NAMES[a]} />
            ))}
            <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 4 }}>Working...</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
        {state.chatMessages.length === 0 && (
          <div className="fade-in" style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="float" style={{ fontSize: 40, marginBottom: 16 }}>&#9670;</div>
            <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>Ask your AI back-office team anything</p>
            <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 28 }}>Your Chief Agent will route to the right specialist.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {quickActions.map((qa) => (
                <button key={qa.label} className="btn-outline" onClick={() => { setInput(qa.msg); }}
                  style={{ ...S.btnOutline, borderColor: C.primary + '44' }}>
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {state.chatMessages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)}
        {state.chatStreaming && (
          <div style={{ display: 'flex', gap: 4, padding: '0 16px', marginBottom: 16 }}>
            <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: C.primary, animationDelay: '0s' }} />
            <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: C.primary, animationDelay: '0.2s' }} />
            <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: C.primary, animationDelay: '0.4s' }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask your AI team..." rows={1}
            style={{ ...S.input, resize: 'none', flex: 1, minHeight: 44, maxHeight: 120 }} />
          {state.chatStreaming ? (
            <button onClick={handleStop} style={{ ...S.btnDanger, padding: '10px 20px' }}>Stop</button>
          ) : (
            <button onClick={handleSend} style={{ ...S.btn, opacity: !input.trim() ? 0.5 : 1 }} disabled={!input.trim()}>Send</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Projects View ────────────────────────────────────────────────
function loadProjectDetail(id, dispatch, silent = false) {
  if (!silent) dispatch({ type: 'SET_PROJECT_DETAIL_LOADING' });
  api(`/projects/${id}`).then((data) => dispatch({ type: 'SET_SELECTED_PROJECT', project: data })).catch(() => {});
}

function ProjectsView({ state, dispatch }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', budget_cents: '', client_id: '', scope_summary: '' });

  useEffect(() => {
    dispatch({ type: 'SET_PROJECTS_LOADING' });
    api('/projects').then(({ projects }) => dispatch({ type: 'SET_PROJECTS', projects })).catch(() => {});
    if (state.clients.length === 0) {
      api('/clients').then(({ clients }) => dispatch({ type: 'SET_CLIENTS', clients })).catch(() => {});
    }
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const body = { name: form.name, description: form.description || undefined, scope_summary: form.scope_summary || undefined };
    if (form.client_id) body.client_id = form.client_id;
    if (form.budget_cents) body.budget_cents = Math.round(Number(form.budget_cents) * 100);
    await api('/projects', { method: 'POST', body });
    setShowNew(false);
    setForm({ name: '', description: '', budget_cents: '', client_id: '', scope_summary: '' });
    const { projects } = await api('/projects');
    dispatch({ type: 'SET_PROJECTS', projects });
  };

  const statusColor = { active: C.success, completed: C.textDim, paused: C.warning, cancelled: C.danger };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Projects</h1>
        <button onClick={() => setShowNew(true)} style={S.btn}>New Project</button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} style={{ ...S.card, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input style={S.input} placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div style={{ display: 'flex', gap: 10 }}>
            <select style={{ ...S.input }} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">No client</option>
              {state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input style={S.input} type="number" placeholder="Budget ($)" value={form.budget_cents} onChange={(e) => setForm({ ...form, budget_cents: e.target.value })} />
          </div>
          <textarea style={{ ...S.input, minHeight: 60 }} placeholder="Scope summary" value={form.scope_summary} onChange={(e) => setForm({ ...form, scope_summary: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={S.btn}>Create</button>
            <button type="button" onClick={() => setShowNew(false)} style={S.btnOutline}>Cancel</button>
          </div>
        </form>
      )}

      {state.projectsLoading && <p style={{ color: C.textMuted }}>Loading...</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {state.projects.map((p) => (
          <div key={p.id} className="card-hover" onClick={() => { dispatch({ type: 'SET_VIEW', view: 'project_detail' }); loadProjectDetail(p.id, dispatch); }}
            style={{ ...S.card, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</h3>
              <span style={S.badge(statusColor[p.status] || C.textDim)}>{p.status}</span>
            </div>
            <p style={{ fontSize: 13, color: C.textMuted }}>{p.client_name || 'No client'}</p>
            {p.budget_cents && <p style={{ fontSize: 18, fontWeight: 700, marginTop: 8, color: C.proposal }}>{fmt(p.budget_cents)}</p>}
          </div>
        ))}
      </div>
      {!state.projectsLoading && state.projects.length === 0 && <p style={{ color: C.textDim, textAlign: 'center', padding: 40 }}>No projects yet. Create your first project to get started.</p>}
    </div>
  );
}

// ─── Helpers: Download + Collapsible Doc ─────────────────────────
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function DocContent({ content, color }) {
  if (!content) return null;
  if (typeof content === 'string') return <p style={{ fontSize: 13, color: C.textMuted }}>{content}</p>;

  const renderValue = (val, depth = 0) => {
    if (val == null) return null;
    if (typeof val !== 'object') return <span>{String(val)}</span>;
    if (Array.isArray(val)) {
      return (<ul style={{ margin: '4px 0', paddingLeft: 16 }}>
        {val.map((item, i) => <li key={i} style={{ fontSize: 13, color: C.textMuted, marginBottom: 2 }}>{typeof item === 'object' ? renderValue(item, depth + 1) : String(item)}</li>)}
      </ul>);
    }
    return (<div style={{ marginLeft: depth > 0 ? 12 : 0 }}>
      {Object.entries(val).map(([k, v]) => (
        <div key={k} style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: color || C.textMuted, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</span>{' '}
          <span style={{ fontSize: 13, color: C.textMuted }}>{typeof v !== 'object' ? String(v) : ''}</span>
          {typeof v === 'object' && renderValue(v, depth + 1)}
        </div>
      ))}
    </div>);
  };

  const { title, ...rest } = content;
  return (
    <div style={{ padding: 12, background: C.bg, borderRadius: 8, maxHeight: 400, overflow: 'auto' }}>
      {title && <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{title}</p>}
      {renderValue(rest)}
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="fade-in" onClick={(e) => e.stopPropagation()} style={{ ...S.card, width: 360, padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} className="btn-outline" style={{ ...S.btnOutline, padding: '8px 24px' }}>Cancel</button>
          <button onClick={onConfirm} style={{ ...S.btnDanger, padding: '8px 24px' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function CollapsibleDoc({ doc, color, type, onDelete, children }) {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const title = doc.content?.title || `${type} - ${doc.status}`;
  const handleDelete = async (e) => {
    e.stopPropagation();
    setShowConfirm(true);
  };
  const confirmDelete = async () => {
    setShowConfirm(false);
    try {
      await api(`/documents/${type}s/${doc.id}`, { method: 'DELETE' });
      if (onDelete) onDelete();
    } catch { /* ignore */ }
  };
  return (
    <div style={{ ...S.card, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.textDim, fontSize: 12 }}>{open ? '\u25BC' : '\u25B6'}</span>
          <span style={S.badge(color)}>{doc.status}</span>
          <span style={{ fontSize: 13, color: C.text }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: C.textDim }}>{new Date(doc.created_at).toLocaleDateString()}</span>
          <button onClick={(e) => { e.stopPropagation(); downloadJSON(doc, `${type}-${doc.id.slice(0, 8)}.json`); }}
            style={{ ...S.btnOutline, padding: '2px 8px', fontSize: 11 }}>Download</button>
          <button onClick={handleDelete}
            style={{ ...S.btnOutline, padding: '2px 8px', fontSize: 11, color: C.danger, borderColor: C.danger + '44' }}>Delete</button>
        </div>
      </div>
      {open && <div style={{ marginTop: 10 }}>{children}</div>}
      {showConfirm && <ConfirmModal message={`Delete this ${type}?`} onConfirm={confirmDelete} onCancel={() => setShowConfirm(false)} />}
    </div>
  );
}

function ScopeEventCard({ ev, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const handleDelete = async () => {
    setShowConfirm(false);
    try { await api(`/documents/scope-events/${ev.id}`, { method: 'DELETE' }); if (onDelete) onDelete(); } catch { /* ignore */ }
  };
  return (
    <div style={{ ...S.card, marginBottom: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={S.badge(ev.event_type === 'change_order' ? C.danger : ev.event_type === 'approved' ? C.success : C.scope)}>{ev.event_type}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14 }}>{ev.description}</p>
        {ev.estimated_cost_cents && <p style={{ fontSize: 13, color: C.warning, marginTop: 4 }}>{fmt(ev.estimated_cost_cents)} estimated</p>}
      </div>
      <button onClick={() => setShowConfirm(true)} style={{ ...S.btnOutline, padding: '2px 8px', fontSize: 11, color: C.danger, borderColor: C.danger + '44', flexShrink: 0 }}>Delete</button>
      {showConfirm && <ConfirmModal message="Delete this scope event?" onConfirm={handleDelete} onCancel={() => setShowConfirm(false)} />}
    </div>
  );
}

// ─── Inline Project Chat ──────────────────────────────────────────
function ProjectChat({ projectId, state, dispatch }) {
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  const abortRef = useRef(null);
  const wasStreaming = useRef(false);

  // Sync chat to this project on mount
  useEffect(() => {
    if (state.chatProjectId !== projectId) dispatch({ type: 'SET_CHAT_PROJECT', projectId });
  }, [projectId]);

  // Refresh project data when streaming completes (new docs may have been created)
  useEffect(() => {
    if (wasStreaming.current && !state.chatStreaming) {
      // Delay slightly to ensure DB writes are committed, silent to avoid page flash
      setTimeout(() => loadProjectDetail(projectId, dispatch, true), 500);
    }
    wasStreaming.current = state.chatStreaming;
  }, [state.chatStreaming]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [state.chatMessages]);

  const send = useCallback((msg) => {
    const text = msg || input.trim();
    if (!text || state.chatStreaming) return;
    if (!msg) setInput('');
    abortRef.current = new AbortController();
    streamChat(text, projectId, dispatch, abortRef.current.signal);
  }, [input, state.chatStreaming, projectId, dispatch]);

  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column', height: 420, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Project Chat</span>
        {state.activeAgents.map((a) => <span key={a} className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: AGENT_COLORS[a] || C.textDim }} />)}
        <button onClick={() => { localStorage.removeItem(`chat_${projectId}`); dispatch({ type: 'CHAT_CLEAR' }); }}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.textDim, fontSize: 11, cursor: 'pointer' }}>Clear</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {state.chatMessages.length === 0 && <p style={{ color: C.textDim, fontSize: 13, textAlign: 'center', padding: 20 }}>Ask your agents about this project.</p>}
        {state.chatMessages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)}
        {state.chatStreaming && (
          <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
            <span className="typing-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: C.primary }} />
            <span className="typing-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: C.primary, animationDelay: '0.2s' }} />
            <span className="typing-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: C.primary, animationDelay: '0.4s' }} />
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ padding: 10, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 6 }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about this project..." rows={1}
          style={{ ...S.input, resize: 'none', flex: 1, minHeight: 36, fontSize: 13, padding: '8px 12px' }} />
        {state.chatStreaming
          ? <button onClick={() => abortRef.current?.abort()} style={{ ...S.btnDanger, padding: '6px 14px', fontSize: 12 }}>Stop</button>
          : <button onClick={() => send()} style={{ ...S.btn, padding: '6px 14px', fontSize: 12, opacity: !input.trim() ? 0.5 : 1 }} disabled={!input.trim()}>Send</button>}
      </div>
    </div>
  );
}

// ─── Project Detail ───────────────────────────────────────────────
function ProjectDetail({ state, dispatch }) {
  const [tab, setTab] = useState('proposals');
  const [showChat, setShowChat] = useState(false);
  const p = state.selectedProject;

  if (state.projectDetailLoading || !p) return <p style={{ color: C.textMuted, padding: 40 }}>Loading project...</p>;

  const project = p.project || p;
  const refresh = () => loadProjectDetail(project.id, dispatch, true);
  const tabs = [
    { id: 'proposals', label: 'Proposals', color: C.proposal, data: p.proposals || [] },
    { id: 'invoices', label: 'Invoices', color: C.invoice, data: p.invoices || [] },
    { id: 'contracts', label: 'Contracts', color: C.contract, data: p.contracts || [] },
    { id: 'scope_events', label: 'Scope Events', color: C.scope, data: p.scope_events || [] },
  ];
  const activeTab = tabs.find((t) => t.id === tab);

  return (
    <div>
      <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'projects' })} style={{ ...S.btnOutline, marginBottom: 16, fontSize: 13 }}>&larr; Back to Projects</button>

      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{project.name}</h1>
            <p style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>{project.client_name || 'No client'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={S.badge(C.success)}>{project.status}</span>
            {project.budget_cents && <p style={{ fontSize: 22, fontWeight: 700, color: C.proposal, marginTop: 4 }}>{fmt(project.budget_cents)}</p>}
          </div>
        </div>
        {project.scope_summary && <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12, padding: 12, background: C.bg, borderRadius: 8 }}>{project.scope_summary}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Generate Proposal', msg: 'Write a proposal for this project with deliverables, timeline, and pricing.', color: C.proposal },
            { label: 'Create Invoice', msg: 'Create an invoice for this project based on the current budget and work completed.', color: C.invoice },
            { label: 'Draft Contract', msg: 'Draft a contract for this project with standard freelancer-friendly terms.', color: C.contract },
            { label: 'Check Scope', msg: 'Review the current scope status for this project and flag any scope creep risks.', color: C.scope },
          ].map((action) => (
            <button key={action.label} onClick={() => {
              if (state.chatProjectId !== project.id) dispatch({ type: 'SET_CHAT_PROJECT', projectId: project.id });
              setShowChat(true);
              setTimeout(() => streamChat(action.msg, project.id, dispatch, new AbortController().signal), 150);
            }} style={{ ...S.btnOutline, fontSize: 12, borderColor: action.color + '44', color: action.color }}>{action.label}</button>
          ))}
          <button onClick={() => { if (state.chatProjectId !== project.id) dispatch({ type: 'SET_CHAT_PROJECT', projectId: project.id }); setShowChat(!showChat); }}
            style={{ ...S.btn, fontSize: 12 }}>{showChat ? 'Hide Chat' : 'Open Chat'}</button>
        </div>
      </div>

      {/* Inline Chat */}
      {showChat && (
        <div className="fade-in" style={{ marginBottom: 20 }}>
          <ProjectChat projectId={project.id} state={state} dispatch={dispatch} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent', color: tab === t.id ? t.color : C.textMuted, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
            {t.label} ({t.data.length})
          </button>
        ))}
        <button onClick={refresh} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.textDim, fontSize: 12, cursor: 'pointer', padding: '10px' }} title="Refresh">Refresh</button>
      </div>

      {/* Tab content */}
      {activeTab.data.length === 0 && <p style={{ color: C.textDim, padding: 20 }}>No {activeTab.label.toLowerCase()} yet.</p>}

      {tab === 'proposals' && activeTab.data.map((doc) => (
        <CollapsibleDoc key={doc.id} doc={doc} color={C.proposal} type="proposal" onDelete={refresh}>
          {doc.content && <DocContent content={doc.content} color={C.proposal} />}
        </CollapsibleDoc>
      ))}

      {tab === 'invoices' && activeTab.data.map((doc) => (
        <CollapsibleDoc key={doc.id} doc={{ ...doc, content: { title: `Invoice - ${fmt(doc.total_cents)}` } }} color={doc.status === 'paid' ? C.success : doc.status === 'overdue' ? C.danger : C.warning} type="invoice" onDelete={refresh}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: C.textDim }}>Due: {doc.due_date ? new Date(doc.due_date).toLocaleDateString() : 'N/A'}</span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{fmt(doc.total_cents)}</span>
          </div>
          {doc.line_items && doc.line_items.length > 0 && (
            <div style={{ background: C.bg, borderRadius: 8, padding: 10 }}>
              {doc.line_items.map((li, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < doc.line_items.length - 1 ? `1px solid ${C.border}` : 'none', fontSize: 13 }}>
                  <span style={{ color: C.textMuted }}>{li.description || li.name || 'Item'}{li.qty > 1 ? ` x${li.qty}` : ''}</span>
                  <span style={{ color: C.text, fontWeight: 500 }}>{fmt(li.rate_cents)}</span>
                </div>
              ))}
            </div>
          )}
        </CollapsibleDoc>
      ))}

      {tab === 'contracts' && activeTab.data.map((doc) => (
        <CollapsibleDoc key={doc.id} doc={doc} color={C.contract} type="contract" onDelete={refresh}>
          {doc.content && <DocContent content={doc.content} color={C.contract} />}
          {doc.flags && doc.flags.length > 0 && (
            <div style={{ marginTop: 8, padding: 10, background: C.bg, borderRadius: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.danger }}>Flagged Clauses:</p>
              {doc.flags.map((f, i) => <p key={i} style={{ fontSize: 12, color: f.severity === 'high' ? C.danger : C.warning, marginBottom: 4 }}>{f.severity.toUpperCase()}: {f.clause} - {f.explanation}</p>)}
            </div>
          )}
        </CollapsibleDoc>
      ))}

      {tab === 'scope_events' && activeTab.data.map((ev, i) => (
        <ScopeEventCard key={ev.id || i} ev={ev} onDelete={refresh} />
      ))}
    </div>
  );
}

// ─── Clients View ─────────────────────────────────────────────────
function ClientsView({ state, dispatch }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', notes: '' });

  useEffect(() => {
    dispatch({ type: 'SET_CLIENTS_LOADING' });
    api('/clients').then(({ clients }) => dispatch({ type: 'SET_CLIENTS', clients })).catch(() => {});
  }, []);

  const openForm = (client = null) => {
    if (client) setForm({ name: client.name, email: client.email || '', company: client.company || '', notes: client.notes || '' });
    else setForm({ name: '', email: '', company: '', notes: '' });
    dispatch({ type: 'SET_SHOW_CLIENT_FORM', show: true, client });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const body = { name: form.name, email: form.email || undefined, company: form.company || undefined, notes: form.notes || undefined };
    if (state.editingClient) {
      await api(`/clients/${state.editingClient.id}`, { method: 'PATCH', body });
    } else {
      await api('/clients', { method: 'POST', body });
    }
    dispatch({ type: 'SET_SHOW_CLIENT_FORM', show: false });
    const { clients } = await api('/clients');
    dispatch({ type: 'SET_CLIENTS', clients });
  };

  const [deleteClientId, setDeleteClientId] = useState(null);
  const handleDelete = async (id) => {
    await api(`/clients/${id}`, { method: 'DELETE' });
    setDeleteClientId(null);
    const { clients } = await api('/clients');
    dispatch({ type: 'SET_CLIENTS', clients });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Clients</h1>
        <button onClick={() => openForm()} style={S.btn}>Add Client</button>
      </div>

      {state.showClientForm && (
        <form onSubmit={handleSave} style={{ ...S.card, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input style={S.input} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div style={{ display: 'flex', gap: 10 }}>
            <input style={S.input} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input style={S.input} placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <textarea style={{ ...S.input, minHeight: 60 }} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={S.btn}>{state.editingClient ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => dispatch({ type: 'SET_SHOW_CLIENT_FORM', show: false })} style={S.btnOutline}>Cancel</button>
          </div>
        </form>
      )}

      {state.clientsLoading && <p style={{ color: C.textMuted }}>Loading...</p>}

      <div style={{ ...S.card }}>
        {state.clients.length === 0 && !state.clientsLoading && <p style={{ color: C.textDim, textAlign: 'center', padding: 20 }}>No clients yet. Add your first client to get started.</p>}
        {state.clients.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</p>
              <p style={{ fontSize: 12, color: C.textMuted }}>{[c.email, c.company].filter(Boolean).join(' \u00B7 ') || 'No details'}</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => openForm(c)} style={{ ...S.btnOutline, padding: '4px 12px', fontSize: 12 }}>Edit</button>
              <button onClick={() => setDeleteClientId(c.id)} style={{ ...S.btnOutline, padding: '4px 12px', fontSize: 12, color: C.danger, borderColor: C.danger + '44' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {deleteClientId && <ConfirmModal message="Delete this client?" onConfirm={() => handleDelete(deleteClientId)} onCancel={() => setDeleteClientId(null)} />}
    </div>
  );
}

// ─── Activity Log ─────────────────────────────────────────────
function ActivityLogView({ state, dispatch }) {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = filter ? `?agent=${filter}` : '';
    api(`/documents/agent-logs${params}`).then((data) => {
      setLogs(data.logs || []);
      setSummary(data.summary || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filter]);

  const agents = ['chief', 'proposal', 'invoice', 'contract', 'scope_guardian', 'insight'];

  // Estimate cost (Haiku: ~$0.25/1M input, ~$1.25/1M output)
  const estimateCost = (log) => {
    const inputCost = (log.input_tokens || 0) * 0.00000025;
    const outputCost = (log.output_tokens || 0) * 0.00000125;
    return (inputCost + outputCost).toFixed(4);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Activity Log</h1>
        <button onClick={() => {
          const exportData = { exported_at: new Date().toISOString(), summary, logs: logs.map((l) => ({ ...l, est_cost: estimateCost(l) })) };
          downloadJSON(exportData, `activity-log-${new Date().toISOString().slice(0, 10)}.json`);
        }} style={S.btn} disabled={logs.length === 0}>Export Logs</button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          <div style={{ ...S.card, borderTop: `3px solid ${C.accent}`, padding: 16 }}>
            <p style={{ fontSize: 11, color: C.textMuted }}>Total Calls</p>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{summary.total_logs}</p>
          </div>
          <div style={{ ...S.card, borderTop: `3px solid ${C.primary}`, padding: 16 }}>
            <p style={{ fontSize: 11, color: C.textMuted }}>Total Tokens</p>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{(summary.total_tokens || 0).toLocaleString()}</p>
          </div>
          <div style={{ ...S.card, borderTop: `3px solid ${C.success}`, padding: 16 }}>
            <p style={{ fontSize: 11, color: C.textMuted }}>Total Time</p>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{((summary.total_duration_ms || 0) / 1000).toFixed(1)}s</p>
          </div>
          <div style={{ ...S.card, borderTop: `3px solid ${C.warning}`, padding: 16 }}>
            <p style={{ fontSize: 11, color: C.textMuted }}>Est. Cost</p>
            <p style={{ fontSize: 24, fontWeight: 700 }}>${logs.reduce((s, l) => s + parseFloat(estimateCost(l)), 0).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Agent breakdown */}
      {summary?.agent_counts && (
        <div style={{ ...S.card, marginBottom: 20, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Agent Usage</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {agents.filter((a) => summary.agent_counts[a]).map((a) => (
              <button key={a} onClick={() => setFilter(filter === a ? '' : a)}
                style={{ ...S.badge(AGENT_COLORS[a] || C.textDim), cursor: 'pointer', border: filter === a ? `2px solid ${AGENT_COLORS[a]}` : '2px solid transparent', padding: '4px 12px' }}>
                {AGENT_NAMES[a] || a}: {summary.agent_counts[a]}
              </button>
            ))}
            {filter && <button onClick={() => setFilter('')} style={{ ...S.btnOutline, padding: '4px 10px', fontSize: 11 }}>Clear filter</button>}
          </div>
        </div>
      )}

      {/* Log entries */}
      {loading && <p style={{ color: C.textMuted }}>Loading...</p>}
      {logs.map((log) => (
        <ActivityLogEntry key={log.id} log={log} estimateCost={estimateCost} />
      ))}
      {!loading && logs.length === 0 && <p style={{ color: C.textDim, textAlign: 'center', padding: 40 }}>No agent activity yet.</p>}
    </div>
  );
}

function ActivityLogEntry({ log, estimateCost }) {
  const [open, setOpen] = useState(false);
  const color = AGENT_COLORS[log.agent] || C.textDim;
  const totalTokens = (log.input_tokens || 0) + (log.output_tokens || 0);

  return (
    <div className="card-hover" style={{ ...S.card, marginBottom: 10, padding: 14, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: C.textDim, fontSize: 11 }}>{open ? '\u25BC' : '\u25B6'}</span>
        <span style={S.badge(color)}>{AGENT_NAMES[log.agent] || log.agent}</span>
        {log.project_name && <span style={{ fontSize: 12, color: C.textMuted }}>{log.project_name}</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 12, color: C.textDim }}>
          <span>{(log.duration_ms / 1000).toFixed(1)}s</span>
          <span>{totalTokens.toLocaleString()} tok</span>
          <span>${estimateCost(log)}</span>
          <span>{timeAgo(log.created_at)}</span>
        </span>
      </div>
      {open && (
        <div className="fade-in" style={{ marginTop: 12, background: C.bg, borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>Input Tokens</p>
              <p style={{ fontSize: 16, fontWeight: 600 }}>{(log.input_tokens || 0).toLocaleString()}</p>
              <div style={{ height: 4, background: C.border, borderRadius: 2, marginTop: 4 }}>
                <div style={{ height: 4, background: C.primary, borderRadius: 2, width: `${Math.min(100, (log.input_tokens / 20000) * 100)}%` }} />
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>Output Tokens</p>
              <p style={{ fontSize: 16, fontWeight: 600 }}>{(log.output_tokens || 0).toLocaleString()}</p>
              <div style={{ height: 4, background: C.border, borderRadius: 2, marginTop: 4 }}>
                <div style={{ height: 4, background: C.accent, borderRadius: 2, width: `${Math.min(100, (log.output_tokens / 5000) * 100)}%` }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: C.textMuted }}>
            <span>Model: <strong style={{ color: C.text }}>{log.model}</strong></span>
            <span>Duration: <strong style={{ color: C.text }}>{(log.duration_ms / 1000).toFixed(1)}s</strong></span>
            <span>Cost: <strong style={{ color: C.success }}>${estimateCost(log)}</strong></span>
            <span>Time: <strong style={{ color: C.text }}>{new Date(log.created_at).toLocaleString()}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Boot: validate stored token
  useEffect(() => {
    if (state.token && !state.user) {
      api('/auth/me')
        .then(({ user }) => dispatch({ type: 'SET_AUTH', user, token: state.token }))
        .catch(() => { localStorage.removeItem('token'); dispatch({ type: 'LOGOUT' }); });
    }
  }, []);

  const globalStyles = `
    .card-hover:hover { border-color: ${C.primary}33 !important; box-shadow: 0 0 24px ${C.primary}0d; }
    .btn-primary:hover { background: ${C.primaryHover} !important; transform: translateY(-1px); }
    .btn-outline:hover { background: ${C.surfaceHover} !important; border-color: ${C.textDim} !important; color: ${C.text} !important; }
    .nav-item:hover { background: ${C.surfaceHover}; }
  `;

  // Error boundary for debugging
  if (typeof window !== 'undefined' && !window.__errorHandlerSet) {
    window.__errorHandlerSet = true;
    window.addEventListener('error', (e) => console.error('RENDER ERROR:', e.message, e.filename, e.lineno));
  }

  if (!state.user) return <><style>{globalStyles}</style><AuthView state={state} dispatch={dispatch} /></>;

  const viewMap = {
    dashboard: DashboardView,
    chat: ChatView,
    projects: ProjectsView,
    project_detail: ProjectDetail,
    clients: ClientsView,
    activity: ActivityLogView,
  };
  const View = viewMap[state.view] || DashboardView;

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, color: C.text }}>
        <Sidebar state={state} dispatch={dispatch} />
        <main style={{ flex: 1, padding: 24, overflowY: 'auto', maxHeight: '100vh' }}>
          <View state={state} dispatch={dispatch} />
        </main>
      </div>
    </>
  );
}
