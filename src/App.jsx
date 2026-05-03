import React, { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import LandingView from './LandingView.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FolderOpen, Users, Kanban, MessageSquare,
  BookOpen, Activity, LogOut, Search, Bell, TrendingUp, DollarSign,
  Clock, AlertTriangle, ChevronRight, UserCheck, Zap, Cpu, Timer, Plus,
  Mail, Building2, ChevronDown, Check, X, Inbox, ShieldCheck, Send, Brain, Trash2, Pencil,
  AlertCircle, Calculator, FileText, Sparkles,
} from 'lucide-react';

// ─── Colors ────────────────────────────────────────────────────────
const C = {
  bg: '#060A14', surface: '#0B1120', surfaceHover: '#0F172A', border: '#1E293B',
  primary: '#2563EB', primaryHover: '#1D4ED8', accent: '#3B82F6',
  success: '#34D399', warning: '#FBBF24', danger: '#F87171',
  text: '#E2E8F0', textMuted: '#94A3B8', textDim: '#475569',
  proposal: '#60A5FA', invoice: '#34D399', contract: '#F472B6',
  scope: '#FBBF24', insight: '#A78BFA', chief: '#2563EB',
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
  card: { background: C.surface, borderRadius: 16, padding: 28, border: `1px solid ${C.border}`, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', transition: 'border-color 0.2s, box-shadow 0.2s' },
  cardHover: { borderColor: 'rgba(37,99,235,0.4)', boxShadow: '0 0 32px rgba(37,99,235,0.14)' },
  input: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', color: C.text, width: '100%', outline: 'none', fontSize: 14, transition: 'border-color 0.2s, box-shadow 0.2s' },
  btn: { background: C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 26px', cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'all 0.2s', boxShadow: '0 0 40px rgba(37,99,235,0.25)', letterSpacing: '0.01em' },
  btnOutline: { background: 'transparent', color: '#60A5FA', border: '1px solid rgba(37,99,235,0.5)', borderRadius: 10, padding: '9px 18px', cursor: 'pointer', fontSize: 13, transition: 'all 0.2s', fontWeight: 500 },
  btnDanger: { background: C.danger, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  badge: (color) => ({ display: 'inline-flex', alignItems: 'center', padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + '18', color, letterSpacing: '0.04em', textTransform: 'uppercase' }),
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

// Read a cookie value by name (used for the readable CSRF token).
const readCookie = (name) => {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};

const SAFE_METHODS = new Set(['GET', 'HEAD']);

const api = async (path, opts = {}) => {
  const method = opts.method || 'GET';
  const headers = { 'Content-Type': 'application/json' };
  if (!SAFE_METHODS.has(method)) {
    const csrf = readCookie('csrf_token');
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'include',
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
    const csrf = readCookie('csrf_token');
    const res = await fetch('/api/agents/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
      credentials: 'include',
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
            case 'draft_saved': dispatch({ type: 'CHAT_STREAM_EVENT', event: { type: 'draft_saved', resource_type: data.resource_type, resource_id: data.resource_id, title: data.title, amount_cents: data.amount_cents, confidence: data.confidence } }); break;
            case 'budget_exceeded': dispatch({ type: 'CHAT_STREAM_ERROR', error: data.reason }); break;
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
// `authed` is a transient bool - the JWT lives in an HttpOnly cookie the
// SPA can't read. We optimistically set authed=true on boot and let
// /auth/me confirm or reject it. The legacy 'token' localStorage key is
// cleared if present so older sessions migrate cleanly.
const bootAuthed = !!localStorage.getItem('token') || document.cookie.includes('csrf_token=');
if (localStorage.getItem('token')) localStorage.removeItem('token');
const initialState = {
  view: 'auth', user: null, authed: bootAuthed,
  authMode: 'login', authError: null,
  dashboard: null, dashboardLoading: false,
  chatMessages: [], chatStreaming: false, chatProjectId: null, activeAgents: [],
  // Verbose chat: show per-agent badges, delegations, tool-call pills, and
  // per-agent timing/token stats. Default OFF — the cohesive preloader keeps
  // the UI focused on outcome, not mechanism. Power users can flip it on.
  chatVerbose: localStorage.getItem('chatVerbose') === '1',
  // Transient: the draft id to auto-scroll + auto-expand on next DraftsView
  // mount. Cleared by DraftsView once consumed so revisiting Drafts doesn't
  // keep re-focusing an old item.
  draftFocusId: null,
  // Transient: a prompt the chat input should auto-populate on next render.
  // Set by one-click outcome cards on the Dashboard. ChatView consumes it
  // and immediately clears so navigating away + back doesn't re-fill.
  chatPrompt: null,
  projects: [], projectsLoading: false,
  selectedProject: null, projectDetailLoading: false,
  clients: [], clientsLoading: false, showClientForm: false, editingClient: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW': {
      localStorage.setItem('currentView', action.view);
      return { ...state, view: action.view };
    }
    case 'SET_AUTH': {
      const savedView = localStorage.getItem('currentView');
      const hasSavedProject = !!localStorage.getItem('selectedProjectId');
      const canRestoreDetail = savedView === 'project_detail' && hasSavedProject;
      const restoreView = savedView && savedView !== 'auth' && (savedView !== 'project_detail' || canRestoreDetail)
        ? savedView
        : 'dashboard';
      return { ...state, user: action.user, authed: true, authError: null, view: restoreView };
    }
    case 'LOGOUT': {
      localStorage.removeItem('currentView');
      localStorage.removeItem('selectedProjectId');
      return { ...initialState, authed: false, view: 'auth' };
    }
    case 'SET_CHAT_VERBOSE': {
      localStorage.setItem('chatVerbose', action.verbose ? '1' : '0');
      return { ...state, chatVerbose: action.verbose };
    }
    case 'SET_DRAFT_FOCUS': return { ...state, draftFocusId: action.id || null };
    case 'SET_CHAT_PROMPT': return { ...state, chatPrompt: action.prompt || null };
    case 'SET_AUTH_MODE': return { ...state, authMode: action.mode, authError: null };
    case 'SET_AUTH_ERROR': return { ...state, authError: action.error };
    case 'SET_DASHBOARD': return { ...state, dashboard: action.data, dashboardLoading: false };
    case 'SET_DASHBOARD_LOADING': return { ...state, dashboardLoading: true };
    case 'SET_PROJECTS': return { ...state, projects: action.projects, projectsLoading: false };
    case 'SET_PROJECTS_LOADING': return { ...state, projectsLoading: true };
    case 'SET_SELECTED_PROJECT': {
      // Persist the project id so a hard refresh on the project_detail view
      // can restore it via the boot effect. The /projects/:id endpoint returns
      // a wrapper { project, proposals, ... }, while some callers pass a flat
      // project object — handle both shapes.
      const pid = action.project?.project?.id || action.project?.id;
      if (pid) localStorage.setItem('selectedProjectId', pid);
      return { ...state, selectedProject: action.project, projectDetailLoading: false };
    }
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
    else if (match[3]) parts.push(<code key={i++} style={{ background: '#0F172A', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>{match[3]}</code>);
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
      const { user } = await api(endpoint, { method: 'POST', body });
      dispatch({ type: 'SET_AUTH', user });
    } catch (err) {
      dispatch({ type: 'SET_AUTH_ERROR', error: err.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: C.bg }}>
      <Card className="fade-in w-[420px] max-w-[90vw] p-8">
        <div className="float text-4xl text-center mb-3">&#9670;</div>
        <h1 className="text-3xl font-extrabold text-center mb-1.5 tracking-tight text-foreground">BackOffice Agent</h1>
        <p className="text-muted-foreground text-center mb-7 text-sm">Five AI agents. Zero admin hours.</p>

        <div className="flex mb-6 rounded-lg overflow-hidden border border-border">
          {['login', 'register'].map((m) => (
            <button key={m} onClick={() => dispatch({ type: 'SET_AUTH_MODE', mode: m })}
              className={cn('flex-1 py-2.5 text-sm font-semibold capitalize transition-colors', state.authMode === m ? 'bg-primary text-white' : 'bg-transparent text-muted-foreground hover:text-foreground')}>
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {state.authMode === 'register' && (
            <>
              <Input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="Business name (optional)" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
            </>
          )}
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          {state.authError && <p className="text-destructive text-sm">{state.authError}</p>}
          <Button type="submit" className="w-full mt-1" disabled={loading}>
            {loading ? 'Working...' : state.authMode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────
function Sidebar({ state, dispatch }) {
  const [draftsCount, setDraftsCount] = useState(0);
  const [memoryPendingCount, setMemoryPendingCount] = useState(0);

  // Poll the drafts + pending-memory queues every 30s so the badges stay fresh
  // after agent runs and approve-and-send actions in other views.
  useEffect(() => {
    if (!state.user) return;
    let cancelled = false;
    const refresh = () => {
      api('/drafts').then(({ count }) => { if (!cancelled) setDraftsCount(count || 0); }).catch(() => {});
      api('/memory/pending').then(({ count }) => { if (!cancelled) setMemoryPendingCount(count || 0); }).catch(() => {});
    };
    refresh();
    const t = setInterval(refresh, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [state.user, state.view]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', Icon: FolderOpen },
    { id: 'clients', label: 'Clients', Icon: Users },
    { id: 'kanban', label: 'Milestone Board', Icon: Kanban },
    { id: 'drafts', label: 'Drafts Inbox', Icon: Inbox, badge: draftsCount },
    { id: 'memory', label: 'Agent Memory', Icon: Brain, badge: memoryPendingCount },
    { id: '_divider' },
    { id: 'chat', label: 'AI Chat', Icon: MessageSquare },
    { id: 'onboarding', label: 'Getting Started', Icon: BookOpen },
    { id: 'activity', label: 'Activity Log', Icon: Activity },
  ];

  const user = state.user;
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email || '?')[0].toUpperCase();

  return (
    <div className="w-[240px] shrink-0 flex flex-col border-r border-border" style={{ background: C.surface }}>
      {/* Logo */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-border shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #3B82F6 100%)', boxShadow: '0 0 18px rgba(37,99,235,0.45)' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="5" width="16" height="11" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
            <path d="M6 5V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="10" cy="10.5" r="1.25" fill="white"/>
            <path d="M10 10.5 L14.5 8.5" stroke="white" strokeWidth="1.25" strokeLinecap="round" opacity="0.6"/>
            <path d="M10 10.5 L5.5 12.5" stroke="white" strokeWidth="1.25" strokeLinecap="round" opacity="0.6"/>
          </svg>
        </div>
        <p className="text-base font-extrabold tracking-tight text-foreground">BackOffice</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
        {navItems.map((item) => {
          if (item.id === '_divider') return <div key="_divider" className="my-2 mx-1 h-px" style={{ background: C.border }} />;
          const active = state.view === item.id || (item.id === 'projects' && state.view === 'project_detail');
          const { Icon } = item;
          return (
            <button key={item.id}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-left transition-all group',
                active
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              )}
              style={{ background: active ? C.primary + '18' : 'transparent', border: 'none', cursor: 'pointer' }}
              onClick={() => dispatch({ type: 'SET_VIEW', view: item.id })}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                style={{ background: active ? C.primary + '22' : 'transparent' }}>
                <Icon size={17} style={{ color: active ? C.primary : 'inherit' }} />
              </span>
              <span className="flex-1">{item.label}</span>
              {item.id === 'chat' && state.chatStreaming && (
                <span className="typing-dot w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.primary }} />
              )}
              {item.badge > 0 && (
                <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: C.warning + '22', color: C.warning, minWidth: 18, textAlign: 'center' }}>
                  {item.badge}
                </span>
              )}
              {active && <ChevronRight size={14} className="shrink-0 opacity-40" />}
            </button>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-center gap-2.5 rounded-xl p-2.5" style={{ background: C.bg }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: C.primary + '25', color: C.primary }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate leading-tight">{user?.name || 'User'}</p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight">{user?.email}</p>
          </div>
          <button className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              api('/auth/logout', { method: 'POST' }).catch(() => {});
              dispatch({ type: 'LOGOUT' });
            }} title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Top Header ───────────────────────────────────────────────────
const VIEW_TITLES = {
  dashboard: 'Dashboard', projects: 'Projects', project_detail: 'Project Detail',
  clients: 'Clients', kanban: 'Milestone Board', chat: 'AI Chat',
  onboarding: 'Getting Started', activity: 'Activity Log',
};

function TopHeader({ state }) {
  const user = state.user;
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email || '?')[0].toUpperCase();
  const title = VIEW_TITLES[state.view] || 'Dashboard';

  return (
    <div className="h-16 flex items-center gap-4 px-8 lg:px-10 border-b border-border shrink-0"
      style={{ background: C.surface + 'CC', backdropFilter: 'blur(12px)' }}>
      <div>
        <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">{title}</h1>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input placeholder="Search..." className="h-9 pl-8 pr-4 rounded-xl border text-sm focus:outline-none focus:border-primary transition-colors w-[180px]"
            style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
        </div>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          style={{ background: C.bg, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
          <Bell size={15} />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: C.primary + '25', color: C.primary }}>
          {initials}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────
function KPICard({ label, value, color, subtitle, icon: Icon }) {
  return (
    <Card className="hover:border-primary/40 transition-all hover:-translate-y-px">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          {Icon && (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: color + '1A' }}>
              <Icon size={17} style={{ color }} />
            </div>
          )}
        </div>
        <p className="text-4xl font-extrabold tracking-tight text-foreground leading-none">{value}</p>
        {subtitle && <p className="text-sm text-muted-foreground mt-2.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ─── One-Click Outcomes ──────────────────────────────────────────
// Curated entry points to the chat agents. Each card prefills a focused
// prompt and navigates to AI Chat. The "draft from notes" card opens a
// modal first to collect the freeform notes since they're typically pasted.
// Prompts are crafted so the dispatcher's keyword router picks a SINGLE
// specialist agent instead of falling through to Chief (which would burn
// extra tokens delegating). Specifically: avoid using keywords from more
// than one agent's intentPatterns in the same prompt.
const ONE_CLICK_ACTIONS = [
  {
    id: 'overdue',
    icon: AlertCircle,
    color: '#F87171',
    title: 'Recover late payments',
    description: 'See every overdue payment + recommended next steps.',
    // 'overdue' + 'summary' both hit Insight only. Avoid 'invoice' (Invoice agent).
    prompt: 'Summary of all overdue accounts. For each one, recommend the right next step (gentle nudge, formal follow-up, or escalation).'
  },
  {
    id: 'pricing',
    icon: Calculator,
    color: '#FBBF24',
    title: 'Get pricing advice',
    description: 'Pick a project — get a defensible price calculation.',
    // 'estimate' + 'proposal' both hit Proposal only. Avoid 'rate' / 'invoice'.
    prompt: 'Estimate pricing for this project as a proposal. Walk through your assumptions on hours and complexity, then recommend a defensible total.',
    needsProject: true
  },
  {
    id: 'scope',
    icon: ShieldCheck,
    color: '#60A5FA',
    title: 'Spot scope creep risk',
    description: 'Review a project for scope creep patterns + red flags.',
    // 'scope' + 'scope creep' + 'creep' all hit Scope Guardian only.
    // Avoid 'contract' (Contract agent) — say "agreement" or "SOW" instead.
    prompt: 'Identify scope creep risk on this project. Look at past scope events and any client patterns I should watch for.',
    needsProject: true
  },
  {
    id: 'notes',
    icon: FileText,
    color: '#A78BFA',
    title: 'Draft proposal from notes',
    description: 'Paste raw notes — get a polished proposal in Drafts.',
    needsNotes: true
  }
];

function OneClickCards({ dispatch }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const handleClick = (action) => {
    if (action.needsNotes) {
      setNotesOpen(true);
      return;
    }
    dispatch({ type: 'SET_CHAT_PROMPT', prompt: action.prompt });
    dispatch({ type: 'SET_VIEW', view: 'chat' });
  };

  const handleNotesSubmit = () => {
    if (!notes.trim()) return;
    dispatch({
      type: 'SET_CHAT_PROMPT',
      // Avoid triggering other agents via substring matches in the dispatcher's
      // routeToAgent (which uses q.includes(p) — "Extract" matches "extra"
      // from scope_guardian's intentPatterns!). Stick to safe verbs and avoid
      // the bare word "scope" / "contract" / "invoice" / "extra" in the prefix.
      // User-pasted notes may still contain trigger words; Chief picks up the
      // slack in that case (also valid).
      prompt: `Generate a proposal estimate from these notes. Pull out deliverables, timeline, and pricing; flag anything ambiguous. Notes:\n\n${notes.trim()}`
    });
    dispatch({ type: 'SET_VIEW', view: 'chat' });
    setNotesOpen(false);
    setNotes('');
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <Sparkles size={16} style={{ color: C.primary }} />
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.text }}>
          One-Click Outcomes
        </p>
        <span className="text-xs text-muted-foreground">— skip the prompt, get the result</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ONE_CLICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => handleClick(a)}
              className="text-left rounded-2xl p-5 transition-all hover:-translate-y-px"
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                cursor: 'pointer',
                minHeight: 148
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = a.color + '99'; e.currentTarget.style.boxShadow = `0 0 24px ${a.color}22`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: a.color + '1A' }}>
                <Icon size={18} style={{ color: a.color }} />
              </div>
              <p className="text-sm font-bold text-foreground mb-1">{a.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{a.description}</p>
              {a.needsProject && (
                <p className="text-[10px] uppercase tracking-wider mt-3 opacity-70" style={{ color: a.color }}>
                  pick project in chat
                </p>
              )}
            </button>
          );
        })}
      </div>

      {notesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setNotesOpen(false)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-xl"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <FileText size={18} style={{ color: '#A78BFA' }} />
              <p className="text-base font-bold text-foreground">Draft proposal from notes</p>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Paste meeting notes, scope chat, or a back-of-napkin brief. The proposal will land in Drafts for review.
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Client wants a 6-page marketing site, brand identity, social templates. Budget around $15k. Timeline 8 weeks. Wants weekly check-ins on Fridays..."
              rows={8}
              autoFocus
              className="text-sm"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => { setNotesOpen(false); setNotes(''); }}>Cancel</Button>
              <Button size="sm" onClick={handleNotesSubmit} disabled={!notes.trim()}>
                <Sparkles size={13} className="mr-1" /> Send to Chat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ROI tile cards. Distinct from KPICard because they need null-state messaging
// ("Need more data") rather than rendering 0 — judges asked for "evidence", and
// a fake "$0 saved" undermines the trust narrative more than no number at all.
function RoiCard({ label, value, color, subtitle, icon: Icon, tooltip, isNull }) {
  return (
    <Card
      className="hover:border-primary/40 transition-all hover:-translate-y-px"
      title={tooltip}
      style={{ minHeight: 148 }}
    >
      <CardContent className="pt-5 pb-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          {Icon && (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: color + '1A' }}>
              <Icon size={17} style={{ color }} />
            </div>
          )}
        </div>
        <p
          className={isNull ? 'text-base font-semibold tracking-tight leading-snug' : 'text-3xl font-extrabold tracking-tight leading-none'}
          style={{ color: isNull ? C.textMuted : C.text }}
        >
          {value}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-2.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function DashboardView({ state, dispatch }) {
  const [roi, setRoi] = useState(null);

  useEffect(() => {
    dispatch({ type: 'SET_DASHBOARD_LOADING' });
    api('/dashboard').then((data) => dispatch({ type: 'SET_DASHBOARD', data })).catch(() => {});
    api('/dashboard/roi').then(setRoi).catch(() => {});
  }, []);

  const d = state.dashboard;
  if (state.dashboardLoading || !d) return <p className="text-muted-foreground italic text-center p-10">Loading dashboard...</p>;

  const kpis = d.kpis || {};

  // Compose the 4 ROI tile entries. Null-tolerant: if a metric doesn't have
  // enough samples, render an explanatory subtitle instead of a fake "0".
  const roiCards = roi ? [
    {
      label: 'Scope Creep Blocked',
      value: roi.scope_creep_blocked.cents > 0 ? fmt(roi.scope_creep_blocked.cents) : '—',
      subtitle: roi.scope_creep_blocked.events > 0
        ? `${roi.scope_creep_blocked.events} change order${roi.scope_creep_blocked.events === 1 ? '' : 's'} · last ${roi.window_days}d`
        : `No change orders logged in last ${roi.window_days}d`,
      color: C.scope,
      icon: AlertTriangle,
      tooltip: 'Sum of estimated cost on Scope Guardian change-order events.',
      isNull: roi.scope_creep_blocked.events === 0
    },
    {
      label: 'Hours Saved',
      value: roi.hours_saved > 0 ? `${roi.hours_saved}h` : '—',
      subtitle: roi.agent_run_count > 0
        ? `${roi.agent_run_count} agent runs · est. vs manual baseline`
        : 'No agent runs in window',
      color: C.success,
      icon: Zap,
      tooltip: 'Sum of agent runs × per-agent baseline minutes (proposal 45m, contract 30m, scope 15m, invoice 10m). Conservative estimate.',
      isNull: roi.hours_saved === 0
    },
    {
      label: 'Avg Collection',
      value: roi.avg_collection_days != null ? `${roi.avg_collection_days}d` : 'Need more data',
      subtitle: roi.avg_collection_days != null
        ? `Across ${roi.collection_samples} paid invoices`
        : `${roi.collection_samples}/5 paid invoices needed`,
      color: C.accent,
      icon: Clock,
      tooltip: 'Average days from invoice sent_at to paid_at. Requires 5+ samples.',
      isNull: roi.avg_collection_days == null
    },
    {
      label: 'Close Rate',
      value: roi.proposal_close_rate != null ? `${Math.round(roi.proposal_close_rate * 100)}%` : 'Need more data',
      subtitle: roi.proposal_close_rate != null
        ? `${roi.proposal_samples} proposals sent · last 90d`
        : `${roi.proposal_samples}/5 proposals needed`,
      color: C.proposal,
      icon: TrendingUp,
      tooltip: 'Accepted ÷ (sent + accepted + rejected) over a 90-day window.',
      isNull: roi.proposal_close_rate == null
    }
  ] : null;

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard label="Pipeline Value" value={fmt(kpis.pipeline_cents)} color={C.accent} subtitle={`${kpis.active_projects || 0} active projects`} icon={TrendingUp} />
        <KPICard label="Total Clients" value={kpis.total_clients ?? 0} color={C.accent} icon={Users} />
        <KPICard label="Revenue (30d)" value={fmt(kpis.paid_cents)} color={C.accent} icon={DollarSign} />
        <KPICard label="Outstanding" value={fmt(kpis.outstanding_cents)} color={C.accent} subtitle={kpis.overdue_count ? `${kpis.overdue_count} overdue` : undefined} icon={Clock} />
      </div>

      <OneClickCards dispatch={dispatch} />

      {roiCards && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck size={16} style={{ color: C.primary }} />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.text }}>
              Agent ROI · last {roi.window_days} days
            </p>
            <span className="text-xs text-muted-foreground">— what your AI team did for you</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {roiCards.map((c) => <RoiCard key={c.label} {...c} />)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle>Active Projects</CardTitle></CardHeader>
          <CardContent>
            {(d.projects || []).length === 0 && <p className="text-muted-foreground text-sm italic text-center py-2">No active projects</p>}
            {(d.projects || []).map((p) => (
              <div key={p.id} onClick={() => { dispatch({ type: 'SET_VIEW', view: 'project_detail' }); loadProjectDetail(p.id, dispatch); }}
                className="py-3 border-b border-border last:border-0 cursor-pointer flex justify-between items-center hover:opacity-80 transition-opacity">
                <div>
                  <p className="text-sm font-bold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Client:</span> {p.client_name || 'No client'}</p>
                </div>
                <span className="text-sm font-semibold" style={{ color: C.proposal }}>{fmt(p.budget_cents)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Upcoming Milestones</CardTitle></CardHeader>
          <CardContent>
            {(d.upcoming_milestones || []).length === 0 && <p className="text-muted-foreground text-sm italic text-center py-2">No upcoming milestones</p>}
            {(d.upcoming_milestones || []).map((m) => {
              const statusColor = { active: C.primary, completed: C.warning, pending: C.text }[m.status] || C.textDim;
              return (
                <div key={m.id}
                  onClick={() => { dispatch({ type: 'SET_VIEW', view: 'project_detail' }); loadProjectDetail(m.project_id, dispatch); }}
                  className="py-3 border-b border-border last:border-0 cursor-pointer flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <span style={S.badge(statusColor)}>{m.status}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.project_name}</p>
                  </div>
                  {m.amount_cents > 0 && <span className="text-sm font-semibold shrink-0" style={{ color: C.accent }}>{fmt(m.amount_cents)}</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Chat View (THE STAR) ─────────────────────────────────────────
function AgentBadge({ agent }) {
  const color = AGENT_COLORS[agent] || C.textDim;
  const name = AGENT_NAMES[agent] || agent;
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: color + '18', color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{name}</span>;
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
    <Button variant="outline" size="sm" onClick={handleCopy} className="ml-auto h-6 px-2 text-[11px]"
      style={{ color: copied ? C.success : undefined, borderColor: copied ? C.success + '44' : undefined }}>
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

// Cohesive preloader: a single spinner + status hint. We deliberately do NOT
// expose the per-agent phase ("Thinking/Drafting/Reviewing") because that
// reads as chain-of-thought — the user asked for a clean preloader animation.
// Status hint rotates based on tool calls so it doesn't feel frozen.
const SAVE_TOOLS = new Set(['save_proposal', 'create_invoice', 'save_contract', 'log_scope_event', 'flag_clause']);

function deriveStatusHint(events) {
  const calls = (events || []).filter((e) => e.type === 'tool_call');
  if (calls.some((e) => e.tool === 'set_confidence')) return 'Finalizing';
  if (calls.some((e) => SAVE_TOOLS.has(e.tool))) return 'Saving to drafts';
  if (calls.length > 0) return 'Gathering context';
  return 'Working';
}

function AgentPreloader({ events }) {
  const hint = deriveStatusHint(events);
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="inline-block rounded-full"
        style={{
          width: 14, height: 14,
          border: `2px solid ${C.primary}33`,
          borderTopColor: C.primary,
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <span className="text-sm" style={{ color: C.textMuted }}>
        BackOffice is working
        <span className="text-xs ml-2" style={{ color: C.textDim }}>· {hint}…</span>
      </span>
    </div>
  );
}

// Backstop for agent narration that slips past the system-prompt rules.
// IMPORTANT: this only strips narration anchored at the START of the message,
// peeling off chained narrations one at a time until a real content paragraph
// begins. Mid-message sentences containing "I'll" or "let me" (legitimate
// content like "I'll send once approved: ...") are NEVER touched.
// Verbose mode bypasses this entirely — raw content preserved for debugging.
// Anchored at the very start of the message. Lazy body match, terminator is
// `:` or `.` followed by whitespace or end-of-string. Catches both colon- and
// period-ended narration ("Now I'll save:", "Now I'll fetch X for the phase.")
// while still being safe — only strips from the start, never mid-message.
const NARRATION_PREFIX = /^[\s*_]*(?:now\s+i['']?ll|let me|i['']ll|first[,]?\s+(?:let|i['']ll)|next[,]?\s+(?:let|i['']ll)|alright[,!.]?\s+(?:let|i['']ll)|great[,!.]?\s+(?:let|i['']ll)|perfect[,!.]?\s+now|okay[,!.]?\s+(?:let|i['']ll))[^\n]{0,200}?[.:](?:\s|$|(?=[*_#]))/i;
function stripLeadingNarration(text) {
  if (!text) return text;
  let out = text;
  // Peel off as many chained leading narrations as exist; stop when the
  // start of the string is real content.
  while (true) {
    const next = out.replace(NARRATION_PREFIX, '');
    if (next === out) break;
    out = next;
  }
  return out.replace(/^\s+/, '');
}

function ChatMessage({ msg, verbose = true, streaming = false, onOpenDrafts }) {
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
  const draftsSaved = (msg.events || []).filter((e) => e.type === 'draft_saved');

  // While the assistant is mid-stream, show ONLY the preloader (default mode)
  // — hides the model's interstitial narration ("Now let me X..."). Once
  // streaming completes, the preloader steps aside and the final content shows.
  // Use the most recent assistant message in the list as the streaming target;
  // we approximate "this is the streaming message" as: streaming && !msg.error
  // && (no content yet OR this is the latest message).
  const isStreamingThisMsg = streaming && !msg.error;

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
      <div className="fade-in" style={{ background: C.surface, borderRadius: '18px 18px 18px 4px', padding: '14px 18px', maxWidth: '85%', border: `1px solid ${C.border}` }}>
        {/* Cohesive preloader (default mode) — replaces content entirely while
            streaming so the model's interstitial narration ("Now let me X...")
            never reaches the user. */}
        {isStreamingThisMsg && !verbose && <AgentPreloader events={msg.events} />}

        {/* Verbose-mode noise: agent badges, delegations, tool pills */}
        {verbose && (msg.agents || []).length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {msg.agents.map((a) => <AgentBadge key={a} agent={a} />)}
          </div>
        )}
        {verbose && delegations.map((d, i) => (
          <div key={i} style={{ borderLeft: `2px solid ${AGENT_COLORS[d.agent] || C.textDim}`, paddingLeft: 10, margin: '6px 0', fontSize: 12, color: C.textMuted }}>
            Delegated to {AGENT_NAMES[d.agent] || d.agent}
          </div>
        ))}
        {verbose && toolEvents.length > 0 && (
          <div style={{ margin: '6px 0' }}>
            {toolEvents.map((e, i) => <ToolCallPill key={i} event={e} />)}
          </div>
        )}

        {/* Saved-draft cards: clickable confirmations the agent emits when a
            save tool succeeded. Renders one card per save event in this turn. */}
        {!isStreamingThisMsg && draftsSaved.map((d, i) => {
          const meta = RESOURCE_LABELS[d.resource_type] || { color: C.textDim, label: d.resource_type, endpoint: '' };
          const conf = d.confidence != null ? Math.round(Number(d.confidence) * 100) : null;
          return (
            <div key={i} className="my-2 rounded-xl p-3.5 flex items-center gap-3"
              style={{ background: meta.color + '12', border: `1px solid ${meta.color}55` }}>
              <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: meta.color + '22' }}>
                <Inbox size={16} style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {meta.label} saved · {d.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {d.amount_cents != null && <span>{fmt(d.amount_cents)}</span>}
                  {d.amount_cents != null && conf != null && <span>·</span>}
                  {conf != null && <span>{conf}% confidence</span>}
                  <span>·</span>
                  <span>pending your approval</span>
                </div>
              </div>
              {onOpenDrafts && (
                <Button size="sm" onClick={() => onOpenDrafts(d.resource_id)}>
                  Open in Drafts <ChevronRight size={13} className="ml-1" />
                </Button>
              )}
            </div>
          );
        })}

        {/* Main text content — hidden during streaming in default mode so the
            user only sees the preloader, then the final result. Verbose mode
            keeps the live stream visible (and the raw content) for debugging. */}
        {msg.content && (verbose || !isStreamingThisMsg) && (
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            <MiniMarkdown text={verbose ? msg.content : stripLeadingNarration(msg.content)} />
          </div>
        )}

        {/* Error */}
        {msg.error && <p style={{ color: C.danger, fontSize: 13, marginTop: 8 }}>{msg.error}</p>}

        {/* Footer: per-agent stats (verbose only) + copy */}
        {(msg.content || (verbose && agentCompletes.length > 0)) && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {verbose && agentCompletes.map((ac, i) => (
              <span key={i} style={{ fontSize: 11, color: C.textDim }}>
                {AGENT_NAMES[ac.agent] || ac.agent}: {ac.durationMs ? `${(ac.durationMs / 1000).toFixed(1)}s` : ''} {ac.tokens ? `(${ac.tokens.input + ac.tokens.output} tokens)` : ''}
              </span>
            ))}
            {msg.content && <CopyButton text={msg.content} />}
          </div>
        )}
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

  // Consume one-click outcome handoff: a card click on the dashboard sets
  // state.chatPrompt; we populate the input and clear the transient state
  // so navigating away + back doesn't re-fill.
  useEffect(() => {
    if (state.chatPrompt) {
      setInput(state.chatPrompt);
      dispatch({ type: 'SET_CHAT_PROMPT', prompt: null });
    }
  }, [state.chatPrompt, dispatch]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages]);

  // Action keywords that need a specific project's context. If none is selected,
  // we surface a friendly nudge instead of sending the request — saves a round
  // trip and matches the server-side guard in routes/agents.js.
  const PROJECT_ACTION_KEYWORDS = /\b(proposal|quote|pitch|bid|estimate|invoice|bill|charge|deposit|contract|agreement|clause|nda|scope|change order)\b/i;

  const handleSend = useCallback(() => {
    if (!input.trim() || state.chatStreaming) return;
    const msg = input.trim();
    if (!state.chatProjectId && PROJECT_ACTION_KEYWORDS.test(msg)) {
      dispatch({ type: 'CHAT_ADD_USER_MSG', message: msg });
      dispatch({ type: 'CHAT_STREAM_START' });
      dispatch({ type: 'CHAT_STREAM_TEXT', content: 'Pick a project from the dropdown above first — this action needs a specific project’s context.' });
      dispatch({ type: 'CHAT_STREAM_DONE' });
      setInput('');
      return;
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px - 80px)' }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <select value={state.chatProjectId || ''} onChange={(e) => dispatch({ type: 'SET_CHAT_PROJECT', projectId: e.target.value || null })}
          className="h-9 rounded-lg border border-border bg-background text-sm text-foreground px-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 w-[220px]">
          <option value="">All projects</option>
          {state.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {state.chatVerbose && state.activeAgents.length > 0 && (
          <div className="flex gap-1 items-center">
            {state.activeAgents.map((a) => (
              <span key={a} className="typing-dot w-2 h-2 rounded-full" style={{ background: AGENT_COLORS[a] || C.textDim }} title={AGENT_NAMES[a]} />
            ))}
            <span className="text-xs text-muted-foreground ml-1">Working...</span>
          </div>
        )}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none" title="Show per-agent badges, tool calls, and timing">
          <input
            type="checkbox"
            checked={state.chatVerbose}
            onChange={(e) => dispatch({ type: 'SET_CHAT_VERBOSE', verbose: e.target.checked })}
            style={{ accentColor: C.primary }}
          />
          Show agent details
        </label>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
        {state.chatMessages.length === 0 && (
          <div className="fade-in text-center py-20">
            <div className="float text-4xl mb-4">&#9670;</div>
            <p className="text-xl font-semibold tracking-tight mb-2">Ask your AI back-office team anything</p>
            <p className="text-muted-foreground text-sm mb-7">Your Chief Agent will route to the right specialist.</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {quickActions.map((qa) => (
                <Button key={qa.label} variant="outline" size="sm" onClick={() => setInput(qa.msg)}>{qa.label}</Button>
              ))}
            </div>
          </div>
        )}
        {state.chatMessages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            msg={msg}
            verbose={state.chatVerbose}
            streaming={state.chatStreaming && i === state.chatMessages.length - 1}
            onOpenDrafts={(id) => {
              dispatch({ type: 'SET_DRAFT_FOCUS', id });
              dispatch({ type: 'SET_VIEW', view: 'drafts' });
            }}
          />
        ))}
        {state.chatStreaming && state.chatVerbose && (
          <div className="flex gap-1 px-4 mb-4">
            <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: C.primary, animationDelay: '0s' }} />
            <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: C.primary, animationDelay: '0.2s' }} />
            <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: C.primary, animationDelay: '0.4s' }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onPaste={(e) => {
              // Trim trailing whitespace/newlines from clipboard content so the
              // textarea doesn't show hidden blank rows below the visible text.
              const raw = (e.clipboardData || window.clipboardData)?.getData('text');
              if (!raw || raw === raw.trimEnd()) return; // nothing trailing → let default paste run
              e.preventDefault();
              const cleaned = raw.trimEnd();
              const t = e.target;
              const start = t.selectionStart || 0;
              const end = t.selectionEnd || 0;
              const next = input.slice(0, start) + cleaned + input.slice(end);
              setInput(next);
              // Restore caret to end of pasted text after React re-renders.
              requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = start + cleaned.length; });
            }}
            placeholder="Ask your AI team..." rows={1}
            className="flex-1 min-h-[44px] max-h-[120px]" />
          {state.chatStreaming ? (
            <Button variant="destructive" onClick={handleStop}>Stop</Button>
          ) : (
            <Button onClick={handleSend} disabled={!input.trim()}>Send</Button>
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

function ProjectCard({ project: p, dispatch, statusColor, onRefresh }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleStatus = (status) => {
    api(`/projects/${p.id}`, { method: 'PATCH', body: { status } }).then(onRefresh);
    setMenuOpen(false);
  };

  return (
    <Card className="card-hover cursor-pointer relative hover:border-primary/40">
      <CardContent className="pt-6" onClick={() => { dispatch({ type: 'SET_VIEW', view: 'project_detail' }); loadProjectDetail(p.id, dispatch); }}>
        <h3 className="text-base font-bold tracking-tight text-foreground mr-7">{p.name}</h3>
        <p className="text-sm text-muted-foreground mt-1"><span className="font-semibold text-foreground">Client:</span> {p.client_name || 'No client'}</p>
        {p.budget_cents && <p className="text-xl font-extrabold tracking-tight mt-2.5" style={{ color: C.proposal }}>{fmt(p.budget_cents)}</p>}
        <div className="mt-3"><span className={p.status === 'active' ? 'btn-active-breathe' : ''} style={{ ...S.badge(statusColor[p.status] || C.textDim), display: 'inline-flex', alignItems: 'center' }}>{p.status}</span></div>
      </CardContent>
      {/* Three-dot menu */}
      <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg px-2 py-1 rounded transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>
        {'\u22EE'}
      </button>
      {menuOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMenuOpen(false)} />
          <div className="absolute top-9 right-3 rounded-xl p-1 z-[100] min-w-[140px]" style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            {['active', 'paused', 'completed', 'cancelled'].filter((s) => s !== p.status).map((s) => (
              <button key={s} onClick={(e) => { e.stopPropagation(); handleStatus(s); }}
                className="block w-full px-3 py-2 text-sm text-left rounded-lg capitalize transition-colors hover:bg-white/5"
                style={{ background: 'none', border: 'none', color: s === 'cancelled' ? C.danger : C.textMuted, cursor: 'pointer' }}>
                {s === 'cancelled' ? 'Cancel Project' : `Set ${s}`}
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
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
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {state.projectsLoading ? 'Loading...' : `${state.projects.length} total project${state.projects.length !== 1 ? 's' : ''}`}
        </p>
        <Button onClick={() => setShowNew(true)}><Plus size={15} />New Project</Button>
      </div>

      {showNew && (
        <Card className="mb-5">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <Input placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <div className="flex gap-3">
                <select className="h-10 flex-1 rounded-lg border border-border bg-background text-sm text-foreground px-3 focus:outline-none focus:border-primary"
                  value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">No client</option>
                  {state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Input type="number" placeholder="Budget ($)" value={form.budget_cents} onChange={(e) => setForm({ ...form, budget_cents: e.target.value })} />
              </div>
              <Textarea placeholder="Scope summary" value={form.scope_summary} onChange={(e) => setForm({ ...form, scope_summary: e.target.value })} className="min-h-[60px]" />
              <div className="flex gap-2">
                <Button type="submit">Create</Button>
                <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {state.projectsLoading && <p className="text-muted-foreground italic text-center">Loading...</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {state.projects.map((p) => (
          <ProjectCard key={p.id} project={p} dispatch={dispatch} statusColor={statusColor} onRefresh={() => api('/projects').then(({ projects }) => dispatch({ type: 'SET_PROJECTS', projects }))} />
        ))}
      </div>
      {!state.projectsLoading && state.projects.length === 0 && <p className="text-muted-foreground italic text-center py-10">No projects yet. Create your first project to get started.</p>}
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
    <div onClick={onCancel} className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]">
      <Card className="fade-in w-[360px] text-center" onClick={(e) => e.stopPropagation()}>
        <CardContent className="pt-6">
          <p className="text-sm font-medium mb-5">{message}</p>
          <div className="flex gap-2.5 justify-center">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button variant="destructive" onClick={onConfirm}>Delete</Button>
          </div>
        </CardContent>
      </Card>
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
    <Card className="mb-3">
      <CardContent className="pt-4 pb-4">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setOpen(!open)}>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">{open ? '\u25BC' : '\u25B6'}</span>
            <span style={S.badge(color)}>{doc.status}</span>
            <span className="text-sm text-foreground">{title}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</span>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); downloadJSON(doc, `${type}-${doc.id.slice(0, 8)}.json`); }}>Download</Button>
            <Button variant="outline" size="sm" style={{ color: C.danger, borderColor: C.danger + '44' }} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
        {open && <div className="mt-3">{children}</div>}
        {showConfirm && <ConfirmModal message={`Delete this ${type}?`} onConfirm={confirmDelete} onCancel={() => setShowConfirm(false)} />}
      </CardContent>
    </Card>
  );
}

function ScopeEventCard({ ev, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const handleDelete = async () => {
    setShowConfirm(false);
    try { await api(`/documents/scope-events/${ev.id}`, { method: 'DELETE' }); if (onDelete) onDelete(); } catch { /* ignore */ }
  };
  return (
    <Card className="mb-3">
      <CardContent className="pt-4 pb-4 flex gap-3 items-start">
        <span style={S.badge(ev.event_type === 'change_order' ? C.danger : ev.event_type === 'approved' ? C.success : C.scope)}>{ev.event_type}</span>
        <div className="flex-1">
          <p className="text-sm text-foreground">{ev.description}</p>
          {ev.estimated_cost_cents && <p className="text-sm mt-1" style={{ color: C.warning }}>{fmt(ev.estimated_cost_cents)} estimated</p>}
        </div>
        <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] shrink-0" style={{ color: C.danger, borderColor: C.danger + '44' }} onClick={() => setShowConfirm(true)}>Delete</Button>
        {showConfirm && <ConfirmModal message="Delete this scope event?" onConfirm={handleDelete} onCancel={() => setShowConfirm(false)} />}
      </CardContent>
    </Card>
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
    <Card className="flex flex-col h-[420px] overflow-hidden p-0">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">Project Chat</span>
        {state.activeAgents.map((a) => <span key={a} className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: AGENT_COLORS[a] || C.textDim }} />)}
        <button className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => { localStorage.removeItem(`chat_${projectId}`); dispatch({ type: 'CHAT_CLEAR' }); }}>Clear</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3.5">
        {state.chatMessages.length === 0 && <p className="text-muted-foreground text-sm text-center py-5 italic">Ask your agents about this project.</p>}
        {state.chatMessages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            msg={msg}
            verbose={state.chatVerbose}
            streaming={state.chatStreaming && i === state.chatMessages.length - 1}
            onOpenDrafts={(id) => {
              dispatch({ type: 'SET_DRAFT_FOCUS', id });
              dispatch({ type: 'SET_VIEW', view: 'drafts' });
            }}
          />
        ))}
        {state.chatStreaming && state.chatVerbose && (
          <div className="flex gap-1 py-1">
            <span className="typing-dot w-1 h-1 rounded-full" style={{ background: C.primary }} />
            <span className="typing-dot w-1 h-1 rounded-full" style={{ background: C.primary, animationDelay: '0.2s' }} />
            <span className="typing-dot w-1 h-1 rounded-full" style={{ background: C.primary, animationDelay: '0.4s' }} />
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="p-2.5 border-t border-border flex gap-1.5">
        <Textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          onPaste={(e) => {
            const raw = (e.clipboardData || window.clipboardData)?.getData('text');
            if (!raw || raw === raw.trimEnd()) return;
            e.preventDefault();
            const cleaned = raw.trimEnd();
            const t = e.target;
            const start = t.selectionStart || 0;
            const end = t.selectionEnd || 0;
            setInput(input.slice(0, start) + cleaned + input.slice(end));
            requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = start + cleaned.length; });
          }}
          placeholder="Ask about this project..." rows={1} className="flex-1 min-h-[36px] text-sm py-2 px-3" />
        {state.chatStreaming
          ? <Button variant="destructive" size="sm" onClick={() => abortRef.current?.abort()}>Stop</Button>
          : <Button size="sm" onClick={() => send()} disabled={!input.trim()}>Send</Button>}
      </div>
    </Card>
  );
}

// ─── Client Combobox ─────────────────────────────────────────────
function ClientCombobox({ clients, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = clients.find((c) => c.id === value);
  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen((o) => !o); setSearch(''); }}
        className="w-full h-10 rounded-lg border border-border bg-background text-sm text-foreground px-3 flex items-center justify-between gap-2 hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors">
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ background: C.primary + 'CC' }}>{initials(selected.name)}</span>
            {selected.name}
          </span>
        ) : (
          <span className="text-muted-foreground">No client</span>
        )}
        <ChevronDown size={14} className="text-muted-foreground shrink-0" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-xl border border-border shadow-xl overflow-hidden"
          style={{ background: C.surface }}>
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
              {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>}
            </div>
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto py-1">
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/5 transition-colors text-muted-foreground">
              <span className="w-5 h-5 shrink-0" />
              <span>No client</span>
              {!value && <Check size={13} className="ml-auto text-primary" />}
            </button>
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4 italic">No clients match</p>
            )}
            {filtered.map((c) => (
              <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/5 transition-colors text-foreground">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ background: C.primary + 'CC' }}>{initials(c.name)}</span>
                <span className="truncate">{c.name}</span>
                {c.email && <span className="text-xs text-muted-foreground truncate ml-1">{c.email}</span>}
                {value === c.id && <Check size={13} className="ml-auto shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Project Detail ───────────────────────────────────────────────
// ─── Milestone Panel ─────────────────────────────────────────────
function MilestonePanel({ milestones, projectId, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', amount: '', approval_type: 'approval_needed' });
  const [shareUrl, setShareUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completedNotice, setCompletedNotice] = useState(null);
  const pollRef = useRef(null);

  // Poll for client approval after marking complete
  useEffect(() => {
    const hasCompleted = milestones.some((m) => m.status === 'completed');
    if (hasCompleted && !pollRef.current) {
      pollRef.current = setInterval(() => { onRefresh(); }, 5000);
    } else if (!hasCompleted && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [milestones, onRefresh]);

  const approved = milestones.filter((m) => m.status === 'approved').length;
  const progress = milestones.length > 0 ? Math.round((approved / milestones.length) * 100) : 0;

  const statusColor = (s) => ({ pending: C.textDim, active: C.primary, completed: C.warning, approved: C.success, rejected: C.danger }[s] || C.textDim);
  const statusIcon = (s) => ({ pending: '\u25CB', active: '\u25D4', completed: '\u25D0', approved: '\u25CF', rejected: '\u2716' }[s] || '\u25CB');

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/milestones', { method: 'POST', body: { project_id: projectId, title: form.title, description: form.description || undefined, amount_cents: form.amount ? Math.round(parseFloat(form.amount) * 100) : 0, approval_type: form.approval_type, position: milestones.length } });
      setForm({ title: '', description: '', amount: '', approval_type: 'approval_needed' });
      setShowForm(false);
      onRefresh();
    } catch { /* handled by UI */ }
    setLoading(false);
  };

  const handleAction = async (id, action) => {
    setLoading(true);
    try {
      const result = await api(`/milestones/${id}/${action}`, { method: 'POST' });
      onRefresh();
      if (action === 'complete' && !result.auto_approved) {
        // Fetch or reuse share link and show notice
        const { share_tokens } = await api(`/milestones/share?project_id=${projectId}`);
        let link;
        if (share_tokens.length > 0) {
          link = window.location.origin + '/portal/' + share_tokens[0].token;
        } else {
          const { url } = await api('/milestones/share', { method: 'POST', body: { project_id: projectId } });
          link = window.location.origin + url;
        }
        setShareUrl(link);
        setCompletedNotice(link);
        navigator.clipboard.writeText(link).catch(() => {});
      }
    } catch { /* handled by UI */ }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try { await api(`/milestones/${id}`, { method: 'DELETE' }); onRefresh(); } catch { /* noop */ }
  };

  const handleShare = async () => {
    try {
      // Reuse existing token if we have one
      const { share_tokens } = await api(`/milestones/share?project_id=${projectId}`);
      if (share_tokens.length > 0) {
        const fullUrl = window.location.origin + '/portal/' + share_tokens[0].token;
        setShareUrl(fullUrl);
        navigator.clipboard.writeText(fullUrl).catch(() => {});
        return;
      }
      const { url } = await api('/milestones/share', { method: 'POST', body: { project_id: projectId } });
      const fullUrl = window.location.origin + url;
      setShareUrl(fullUrl);
      navigator.clipboard.writeText(fullUrl).catch(() => {});
    } catch { /* noop */ }
  };

  return (
    <div style={{ ...S.card, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Milestones</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>Refresh</Button>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : <><Plus size={13} />Add</>}</Button>
          <Button variant="outline" size="sm" onClick={handleShare}>Share with Client</Button>
        </div>
      </div>

      {shareUrl && (
        <div style={{ background: C.bg, borderRadius: 8, padding: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.accent, wordBreak: 'break-all' }}>{shareUrl}</span>
          <Button variant="outline" size="sm" className="shrink-0 ml-2" onClick={() => { navigator.clipboard.writeText(shareUrl); }}>Copy</Button>
        </div>
      )}

      {/* Completion notice */}
      {completedNotice && (
        <div className="fade-in" style={{ background: C.success + '15', border: `1px solid ${C.success}44`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.success, marginBottom: 6 }}>Milestone completed! Send this link to your client for approval:</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.accent, wordBreak: 'break-all', flex: 1 }}>{completedNotice}</span>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => { navigator.clipboard.writeText(completedNotice); }}>Copy</Button>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setCompletedNotice(null)}>Dismiss</Button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {milestones.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
            <span>{approved} of {milestones.length} approved</span>
            <span>{progress}%</span>
          </div>
          <div style={{ background: C.bg, borderRadius: 6, height: 6, overflow: 'hidden' }}>
            <div style={{ background: C.success, height: '100%', width: `${progress}%`, borderRadius: 6, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl p-4 mb-4 flex flex-col gap-3" style={{ background: C.bg }}>
          <Input placeholder="Milestone title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Amount ($)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'approval_needed', label: 'Approval Needed', Icon: UserCheck, color: C.warning },
              { value: 'auto', label: 'Auto-Approve', Icon: Zap, color: C.success },
            ].map((opt) => {
              const active = form.approval_type === opt.value;
              return (
                <button key={opt.value} type="button" onClick={() => setForm({ ...form, approval_type: opt.value })}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-left transition-all"
                  style={{ background: active ? opt.color + '18' : C.bg, border: `1px solid ${active ? opt.color + '55' : C.border}`, color: active ? opt.color : C.textMuted, cursor: 'pointer' }}>
                  <opt.Icon size={13} />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <Button type="submit" disabled={loading}><Plus size={15} />Add Milestone</Button>
        </form>
      )}

      {/* Milestone stepper */}
      {milestones.length === 0 && !showForm && <p style={{ color: C.textDim, fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>No milestones yet. Add milestones to track project progress.</p>}
      {milestones.map((m, i) => {
        // Only the current milestone (lowest position not yet approved) can be acted on
        const currentIdx = milestones.findIndex((ms) => ms.status !== 'approved');
        const isCurrent = i === currentIdx;
        return (
          <div key={m.id} style={{ display: 'flex', gap: 12 }}>
            {/* Vertical line + status icon */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
              <span style={{ color: statusColor(m.status), fontSize: 16, lineHeight: 1 }}>{statusIcon(m.status)}</span>
              {i < milestones.length - 1 && <div style={{ width: 2, flex: 1, background: m.status === 'approved' ? C.success + '44' : C.border, margin: '4px 0' }} />}
            </div>
            {/* Content */}
            <div style={{ flex: 1, paddingBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</span>
                  {m.amount_cents > 0 && <span style={{ marginLeft: 8, fontSize: 13, color: C.accent }}>{fmt(m.amount_cents)}</span>}
                </div>
                <span style={S.badge(statusColor(m.status))}>{m.status}</span>
              </div>
              {m.description && <p style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>{m.description}</p>}
              <span className="inline-flex items-center gap-1 mt-2"
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20,
                  background: m.approval_type === 'auto' ? C.success + '18' : C.warning + '18',
                  color: m.approval_type === 'auto' ? C.success : C.warning,
                  border: `1px solid ${m.approval_type === 'auto' ? C.success + '33' : C.warning + '33'}` }}>
                {m.approval_type === 'auto'
                  ? <><Zap size={9} style={{ display: 'inline' }} /> Auto-Approve</>
                  : <><UserCheck size={9} style={{ display: 'inline' }} /> Approval Needed</>}
              </span>
              {m.rejection_reason && <p style={{ color: C.danger, fontSize: 12, marginTop: 4 }}>Rejected: {m.rejection_reason}</p>}
              {isCurrent && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {(m.status === 'pending') && <Button variant="outline" size="sm" onClick={() => handleAction(m.id, 'activate')}>Activate</Button>}
                  {(m.status === 'active') && <Button variant="outline" size="sm" style={{ color: C.warning, borderColor: C.warning + '44' }} onClick={() => handleAction(m.id, 'complete')}>Mark Complete</Button>}
                  {(m.status === 'pending') && <Button variant="outline" size="sm" style={{ color: C.danger, borderColor: C.danger + '44' }} onClick={() => handleDelete(m.id)}>Delete</Button>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectDetail({ state, dispatch }) {
  const [tab, setTab] = useState('proposals');
  const [showChat, setShowChat] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const p = state.selectedProject;

  if (state.projectDetailLoading || !p) return <p style={{ color: C.textDim, padding: 40, fontStyle: 'italic', textAlign: 'center' }}>Loading project...</p>;

  const project = p.project || p;
  const refresh = () => loadProjectDetail(project.id, dispatch, true);

  const handleStatusChange = async (newStatus) => {
    await api(`/projects/${project.id}`, { method: 'PATCH', body: { status: newStatus } });
    refresh();
  };

  const handleDelete = async () => {
    await api(`/projects/${project.id}`, { method: 'DELETE' });
    localStorage.removeItem('selectedProjectId');
    dispatch({ type: 'SET_VIEW', view: 'projects' });
    api('/projects').then(({ projects }) => dispatch({ type: 'SET_PROJECTS', projects })).catch(() => {});
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const body = {};
    if (editForm.name !== project.name) body.name = editForm.name;
    if (editForm.description !== (project.description || '')) body.description = editForm.description || undefined;
    if (editForm.scope_summary !== (project.scope_summary || '')) body.scope_summary = editForm.scope_summary || undefined;
    const newBudget = editForm.budget ? Math.round(parseFloat(editForm.budget) * 100) : null;
    if (newBudget !== (project.budget_cents ? Number(project.budget_cents) : null)) body.budget_cents = newBudget;
    if (editForm.client_id !== (project.client_id || '')) body.client_id = editForm.client_id || undefined;
    if (Object.keys(body).length > 0) {
      await api(`/projects/${project.id}`, { method: 'PATCH', body });
      refresh();
    }
    setShowEdit(false);
  };

  const openEdit = () => {
    if (state.clients.length === 0) {
      api('/clients').then(({ clients }) => dispatch({ type: 'SET_CLIENTS', clients })).catch(() => {});
    }
    setEditForm({ name: project.name, description: project.description || '', scope_summary: project.scope_summary || '', budget: project.budget_cents ? (Number(project.budget_cents) / 100).toString() : '', client_id: project.client_id || '' });
    setShowEdit(true);
  };

  const statusColors = { active: C.success, completed: C.textDim, paused: C.warning, cancelled: C.danger };
  const tabs = [
    { id: 'proposals', label: 'Proposals', color: C.proposal, data: p.proposals || [] },
    { id: 'invoices', label: 'Invoices', color: C.invoice, data: p.invoices || [] },
    { id: 'contracts', label: 'Contracts', color: C.contract, data: p.contracts || [] },
    { id: 'scope_events', label: 'Scope Events', color: C.scope, data: p.scope_events || [] },
    { id: 'milestones', label: 'Milestones', color: C.accent, data: p.milestones || [] },
  ];
  const activeTab = tabs.find((t) => t.id === tab);

  return (
    <div>
      <Button variant="outline" size="sm" className="mb-4" onClick={() => dispatch({ type: 'SET_VIEW', view: 'projects' })}>&#8592; Back to Projects</Button>

      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: C.text }}>{project.name}</h1>
            <p style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}><span style={{ fontWeight: 600, color: C.text }}>Client:</span> {project.client_name || 'No client'}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div className="flex items-center gap-2">
              <span style={S.badge(statusColors[project.status] || C.textDim)}>{project.status}</span>
              <Button variant="outline" size="sm" onClick={openEdit}>Edit</Button>
              <Button variant="outline" size="sm" style={{ color: C.danger, borderColor: C.danger + '44' }} onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
            </div>
            {project.budget_cents && <p style={{ fontSize: 22, fontWeight: 700, color: C.proposal }}>{fmt(project.budget_cents)}</p>}
          </div>
        </div>

        {/* Status controls */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm text-muted-foreground">Change status:</span>
          <select value={project.status} onChange={(e) => handleStatusChange(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background text-sm text-foreground px-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 capitalize">
            {['active', 'paused', 'completed', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {project.scope_summary && <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12, padding: 12, background: C.bg, borderRadius: 8 }}>{project.scope_summary}</p>}

        {/* Edit form */}
        {showEdit && editForm && (
          <form onSubmit={handleEdit} className="fade-in mt-3 rounded-xl p-4 flex flex-col gap-3" style={{ background: C.bg }}>
            <Input placeholder="Project name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            <ClientCombobox clients={state.clients} value={editForm.client_id} onChange={(id) => setEditForm({ ...editForm, client_id: id })} />
            <Input placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            <Input type="number" step="0.01" placeholder="Budget ($)" value={editForm.budget} onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })} />
            <Textarea placeholder="Scope summary" value={editForm.scope_summary} onChange={(e) => setEditForm({ ...editForm, scope_summary: e.target.value })} className="min-h-[60px]" />
            <div className="flex gap-2">
              <Button type="submit">Save</Button>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <ConfirmModal message={`Permanently delete project "${project.name}"? This will remove all proposals, invoices, contracts, milestones, and scope events for this project. To keep the record but stop work, use the status menu's "Set cancelled" instead.`} onConfirm={() => { setShowDeleteConfirm(false); handleDelete(); }} onCancel={() => setShowDeleteConfirm(false)} />
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Generate Proposal', msg: 'Write a proposal for this project with deliverables, timeline, and pricing.', color: C.proposal },
            { label: 'Create Invoice', msg: 'Create an invoice for this project based on the current budget and work completed.', color: C.invoice },
            { label: 'Draft Contract', msg: 'Draft a contract for this project with standard freelancer-friendly terms.', color: C.contract },
            { label: 'Check Scope', msg: 'Review the current scope status for this project and flag any scope creep risks.', color: C.scope },
          ].map((action) => (
            <Button key={action.label} variant="outline" size="sm" onClick={() => {
              if (state.chatProjectId !== project.id) dispatch({ type: 'SET_CHAT_PROJECT', projectId: project.id });
              setShowChat(true);
              setTimeout(() => streamChat(action.msg, project.id, dispatch, new AbortController().signal), 150);
            }} style={{ borderColor: action.color + '44', color: action.color }}>{action.label}</Button>
          ))}
          <Button size="sm" onClick={() => { if (state.chatProjectId !== project.id) dispatch({ type: 'SET_CHAT_PROJECT', projectId: project.id }); setShowChat(!showChat); }}>
            {showChat ? 'Hide Chat' : 'Open Chat'}
          </Button>
        </div>
      </div>

      {/* Inline Chat */}
      {showChat && (
        <div className="fade-in" style={{ marginBottom: 20 }}>
          <ProjectChat projectId={project.id} state={state} dispatch={dispatch} />
        </div>
      )}

      {/* Milestones + Payment Summary grid */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '3fr 1fr', alignItems: 'start' }}>
        <MilestonePanel milestones={p.milestones || []} projectId={project.id} onRefresh={refresh} />

        {/* Payment Summary */}
        {(() => {
          const invoices = p.invoices || [];
          const paidCents = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + parseInt(i.total_cents || 0), 0);
          const totalCents = project.budget_cents ? parseInt(project.budget_cents) : invoices.reduce((s, i) => s + parseInt(i.total_cents || 0), 0);
          const remainingCents = Math.max(0, totalCents - paidCents);
          return (
            <Card>
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Payment Summary</p>
                {totalCents || paidCents ? (
                  <>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-sm font-bold text-foreground">{fmt(totalCents)}</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="text-sm font-bold" style={{ color: C.success }}>{fmt(paidCents)}</p>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p className="text-sm font-bold" style={{ color: remainingCents > 0 ? C.warning : C.success }}>{fmt(remainingCents)}</p>
                      </div>
                    </div>
                    {totalCents > 0 && (
                      <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (paidCents / totalCents) * 100)}%`, background: C.success }} />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No invoices yet</p>
                )}
              </CardContent>
            </Card>
          );
        })()}
      </div>

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
      {activeTab.data.length === 0 && <p style={{ color: C.textDim, padding: 20, fontStyle: 'italic', textAlign: 'center' }}>No {activeTab.label.toLowerCase()} yet.</p>}

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

      {tab === 'milestones' && activeTab.data.map((m) => (
        <div key={m.id} className="card-hover" style={{ ...S.card, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</span>
              {m.amount_cents > 0 && <span style={{ marginLeft: 8, color: C.accent, fontSize: 13 }}>{fmt(m.amount_cents)}</span>}
            </div>
            <span style={S.badge(m.status === 'approved' ? C.success : m.status === 'rejected' ? C.danger : m.status === 'completed' ? C.warning : C.textDim)}>{m.status}</span>
          </div>
          {m.description && <p style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>{m.description}</p>}
          {m.rejection_reason && <p style={{ color: C.danger, fontSize: 12, marginTop: 4 }}>Rejection: {m.rejection_reason}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Client Card ──────────────────────────────────────────────────
function ClientCard({ client: c, onClick }) {
  const initials = c.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <Card className="cursor-pointer hover:border-primary/40 transition-all" onClick={onClick}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: C.primary + '25', color: C.primary }}>
            {initials}
          </div>
          <p className="font-semibold text-foreground">{c.name}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          {c.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail size={13} className="shrink-0" />
              <span className="truncate">{c.email}</span>
            </div>
          )}
          {c.company && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 size={13} className="shrink-0" />
              <span className="truncate">{c.company}</span>
            </div>
          )}
          {c.notes && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.notes}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Clients View ─────────────────────────────────────────────────
function ClientsView({ state, dispatch }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', notes: '' });
  const [deleteClientId, setDeleteClientId] = useState(null);

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

  const handleDelete = async (id) => {
    await api(`/clients/${id}`, { method: 'DELETE' });
    setDeleteClientId(null);
    const { clients } = await api('/clients');
    dispatch({ type: 'SET_CLIENTS', clients });
  };

  const closeModal = () => dispatch({ type: 'SET_SHOW_CLIENT_FORM', show: false });

  return (
    <div>
      {/* Count + action row */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {state.clientsLoading ? 'Loading...' : `${state.clients.length} total client${state.clients.length !== 1 ? 's' : ''}`}
        </p>
        <Button onClick={() => openForm()}><Plus size={15} />Add Client</Button>
      </div>

      {/* Card grid */}
      {state.clients.length === 0 && !state.clientsLoading && (
        <p className="text-muted-foreground italic text-center py-16">No clients yet. Add your first client to get started.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.clients.map((c) => (
          <ClientCard key={c.id} client={c} onClick={() => openForm(c)} />
        ))}
      </div>

      {/* Add / Edit modal */}
      {state.showClientForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4" onClick={closeModal}>
          <Card className="fade-in w-full max-w-[460px]" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>{state.editingClient ? 'Edit Client' : 'Add Client'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="flex flex-col gap-3">
                <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[80px]" />
                <div className="flex items-center justify-between pt-1">
                  {state.editingClient ? (
                    <Button type="button" variant="outline"
                      style={{ color: C.danger, borderColor: C.danger + '44' }}
                      onClick={() => { closeModal(); setDeleteClientId(state.editingClient.id); }}>
                      Delete Client
                    </Button>
                  ) : <span />}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                    <Button type="submit">{state.editingClient ? 'Update' : <><Plus size={15} />Create</>}</Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {deleteClientId && <ConfirmModal message="Delete this client?" onConfirm={() => handleDelete(deleteClientId)} onCancel={() => setDeleteClientId(null)} />}
    </div>
  );
}

// ─── Activity Log ─────────────────────────────────────────────
// ─── Onboarding KB View ──────────────────────────────────────────
function OnboardingView({ dispatch }) {
  const STORE_DONE = 'onboardingDone';
  const STORE_OPEN = 'onboardingOpen';

  const [done, setDone] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORE_DONE) || '[]')); }
    catch { return new Set(); }
  });
  const [openSet, setOpenSet] = useState(() => {
    try {
      const raw = localStorage.getItem(STORE_OPEN);
      if (raw) return new Set(JSON.parse(raw));
    } catch { /* fallthrough */ }
    return new Set(['quickstart']);
  });

  const persistDone = (s) => localStorage.setItem(STORE_DONE, JSON.stringify([...s]));
  const persistOpen = (s) => localStorage.setItem(STORE_OPEN, JSON.stringify([...s]));

  const toggleOpen = (id) => {
    const next = new Set(openSet);
    next.has(id) ? next.delete(id) : next.add(id);
    setOpenSet(next); persistOpen(next);
  };
  const toggleDone = (id, e) => {
    if (e) e.stopPropagation();
    const next = new Set(done);
    next.has(id) ? next.delete(id) : next.add(id);
    setDone(next); persistDone(next);
  };
  const goView = (view) => dispatch({ type: 'SET_VIEW', view });

  const sections = [
    { id: 'layout', icon: LayoutDashboard, accent: C.primary,
      title: 'The Layout',
      summary: 'Sidebar nav, top bar, and how to move around.',
      intro: 'Every screen lives inside the same shell -- a sticky left sidebar, a thin top header, and a single content area.',
      rows: [
        ['Left sidebar', 'Switches between Dashboard, Projects, Clients, Milestone Board, Drafts Inbox, Agent Memory, AI Chat, Getting Started, and Activity Log.'],
        ['Top header', 'Shows the current view name, a search box, notifications, and your profile.'],
        ['Profile menu (bottom-left)', 'Your initials, name, and email. Click the door icon to sign out.'],
      ],
      cta: { label: 'Go to Dashboard', view: 'dashboard' } },

    { id: 'dashboard', icon: TrendingUp, accent: C.proposal,
      title: 'Dashboard',
      summary: 'Pipeline, ROI, one-click outcomes, and what is due.',
      intro: 'Your home base. KPI tiles, four One-Click Outcome cards, ROI metrics for the last 30 days, plus active projects and upcoming milestones.',
      rows: [
        ['KPI tiles', 'Pipeline value, total clients, revenue (30d), and outstanding invoices with the overdue count.'],
        ['One-Click Outcomes', 'Recover late payments, get pricing advice, spot scope creep risk, draft proposal from notes -- each card preloads a chat prompt and routes to the right agent.'],
        ['Agent ROI (30d)', 'Scope creep blocked in dollars, hours saved, average collection time, close rate.'],
        ['Active Projects + Upcoming Milestones', 'Click any project card to open its detail page.'],
      ],
      cta: { label: 'Open Dashboard', view: 'dashboard' } },

    { id: 'clients', icon: Users, accent: C.invoice,
      title: 'Clients',
      summary: 'Add and manage the people you work for.',
      intro: 'A client must exist before you can attach a project to them. Stored fields: name, email, company, free-form notes.',
      rows: [
        ['Add Client button', 'Top-right of the Clients screen -- opens an inline form, no modal.'],
        ['Notes field', 'Use it for hints like "fast payer" or "watch for scope creep" -- agents pick it up as context.'],
        ['Edit / Delete', 'Per-row actions. Deleting a client with active projects is blocked.'],
      ],
      cta: { label: 'Go to Clients', view: 'clients' } },

    { id: 'projects', icon: FolderOpen, accent: C.proposal,
      title: 'Projects',
      summary: 'The core unit -- everything else hangs off a project.',
      intro: 'Every proposal, invoice, contract, scope event, and milestone is attached to a project.',
      rows: [
        ['New Project button', 'Top-right. Pick a client, name it, set a budget, paste in scope.'],
        ['Status badges', 'Active, completed, on-hold. Toggle from the project detail page.'],
        ['Click any card', 'Opens Project Detail -- where the agents do the work.'],
      ],
      cta: { label: 'Go to Projects', view: 'projects' } },

    { id: 'project_detail', icon: Sparkles, accent: C.contract,
      title: 'Project Detail -- the action hub',
      summary: 'Five colored buttons that each invoke a specialist agent.',
      intro: 'The most powerful screen in the product. Header with status + budget, scope text, and five quick-action buttons that fire off a specialist on this exact project.',
      rows: [
        ['Generate Proposal', 'Calls the Proposal Agent. Pricing, deliverables, exclusions -- saved as a draft.'],
        ['Create Invoice', 'Calls the Invoice Agent. Itemized invoice tied to milestones -- saved as a draft.'],
        ['Draft Contract', 'Calls the Contract Agent. Freelancer-protective draft, flags risky clauses.'],
        ['Check Scope', 'Calls the Scope Guardian. Reviews the project for creep risk.'],
        ['Open Chat', 'Inline project-scoped chat panel. Anything you ask is auto-scoped to this project.'],
      ],
      cta: { label: 'Open a Project', view: 'projects' } },

    { id: 'milestones', icon: Kanban, accent: C.warning,
      title: 'Milestones',
      summary: 'Sequenced gates that make payment unambiguous.',
      intro: 'Milestones turn an open-ended project into a series of approve-and-pay cycles. Manage them per-project or see all of them on the Milestone Board.',
      rows: [
        ['Pending -> Active -> Completed -> Approved', 'Sequential -- milestone #3 cannot activate until #2 is approved.'],
        ['Auto-Approve vs Approval Needed', 'Set per milestone. Approval-Needed waits on a client decision in the portal.'],
        ['Share with Client', 'Generates a tokenized portal link valid for 30 days. Sharing again rotates the token.'],
        ['Auto-trigger', 'When a milestone gets approved, an invoice draft is generated automatically and lands in Drafts Inbox.'],
      ],
      cta: { label: 'Open Milestone Board', view: 'kanban' } },

    { id: 'portal', icon: ShieldCheck, accent: C.success,
      title: 'Client Portal',
      summary: 'What your client sees -- no login required.',
      intro: 'A public, token-gated page at /portal/<token>. Polls every 5 seconds. Clients see a clean stepper of your milestones with progress.',
      rows: [
        ['Approve / Request Changes', 'Two buttons appear on each completed milestone. Rejecting requires a written reason.'],
        ['Progress bar', 'Shows X of Y approved with a percentage.'],
        ['No account needed', 'The link is the credential. Treat it like a password -- and rotate it any time by clicking Share with Client again.'],
      ] },

    { id: 'chat', icon: MessageSquare, accent: C.primary,
      title: 'AI Chat',
      summary: 'Free-form conversation with all six agents.',
      intro: 'Type anything. The dispatcher routes by intent -- single-domain to a specialist, multi-domain to the Chief.',
      rows: [
        ['Quick prompts', '"How am I doing?", "Overdue invoices?", "Pipeline status" -- three buttons in the empty state.'],
        ['Streaming responses', 'Agent badges, tool-call pills, delegation breadcrumbs. Toggle verbose mode to see the work behind the answer.'],
        ['Project context', 'Pick a project from the dropdown to scope replies. Leave blank for a global view.'],
        ['Scope alerts', 'A yellow banner appears before the main reply when the Scope Guardian detects creep.'],
      ],
      cta: { label: 'Open AI Chat', view: 'chat' } },

    { id: 'agents', icon: Cpu, accent: C.insight,
      title: 'The Five Specialist Agents',
      summary: 'Six total -- five specialists plus a Chief that orchestrates.',
      intro: 'Each agent owns a single domain with no tool overlap. The Chief delegates whenever a request crosses domains.',
      agents: [
        ['Proposal', C.proposal, 'Pricing-anchored proposals with deliverables, timeline, exclusions. Saves as a draft, never sends.'],
        ['Invoice', C.invoice, 'Itemized invoices tied to milestones. Optimizes Net terms and payment timing.'],
        ['Contract', C.contract, 'Freelancer-protective contract drafts. Flags risky clauses (unlimited revisions, work-for-hire without escrow, etc.).'],
        ['Scope Guardian', C.scope, 'Real-time scope creep detector. Surfaces a yellow alert before the main reply.'],
        ['Insight', C.insight, 'Revenue trends, overdue invoices, pipeline health -- your fractional CFO.'],
        ['Chief', C.chief, 'Routes multi-domain requests. Coordinates the onboarding workflow (proposal -> contract + invoice).'],
      ] },

    { id: 'drafts', icon: Inbox, accent: C.warning,
      title: 'Drafts Inbox',
      summary: 'Every agent output lands here for human review.',
      intro: 'Agents do not auto-send. Every proposal, invoice, and contract waits in Drafts until you approve or reject it.',
      rows: [
        ['Pending count badge', 'The sidebar shows how many drafts are waiting for review.'],
        ['Inline preview', 'Expand any draft to read the full content before approving.'],
        ['Approve / Reject', 'Approve marks it final and surfaces it in Project Detail. Reject deletes it.'],
      ],
      cta: { label: 'Open Drafts Inbox', view: 'drafts' } },

    { id: 'memory', icon: Brain, accent: C.insight,
      title: 'Agent Memory',
      summary: 'Long-term notes the agents remember about each client.',
      intro: 'Memories are facts agents learn -- preferred Net terms, payment behavior, communication style. You approve them before they stick.',
      rows: [
        ['Pending memories', 'Things an agent proposed to remember -- review before they become permanent context.'],
        ['Approved memories', 'Get injected into future agent prompts as client context, automatically.'],
      ],
      cta: { label: 'Open Agent Memory', view: 'memory' } },

    { id: 'activity', icon: Activity, accent: C.text,
      title: 'Activity Log & Token Budget',
      summary: 'Every agent run, with cost and duration.',
      intro: 'Each agent call is logged with input/output tokens, model, duration, and estimated cost. A daily per-user token budget gates further calls when you hit the cap.',
      rows: [
        ['Filter by agent', 'Click any agent badge at the top to filter the log.'],
        ['Export Logs', 'Downloads the full log as JSON.'],
        ['Daily budget', 'Default 500k tokens/day. Long delegations use more -- keep an eye on the cost summary in each chat reply.'],
      ],
      cta: { label: 'Open Activity Log', view: 'activity' } },
  ];

  const checklist = [
    { id: 'qs-client', label: 'Add your first client', view: 'clients' },
    { id: 'qs-project', label: 'Create a project', view: 'projects' },
    { id: 'qs-proposal', label: 'Generate a proposal (Project Detail -> Generate Proposal)', view: 'projects' },
    { id: 'qs-draft', label: 'Review and approve the draft', view: 'drafts' },
    { id: 'qs-share', label: 'Add milestones and share the portal link', view: 'kanban' },
  ];

  const totalSections = sections.length;
  const sectionsDone = sections.filter((s) => done.has(s.id)).length;
  const pct = Math.round((sectionsDone / totalSections) * 100);

  const expandAll = () => {
    const all = new Set(['quickstart', ...sections.map((s) => s.id)]);
    setOpenSet(all); persistOpen(all);
  };
  const collapseAll = () => { setOpenSet(new Set()); persistOpen(new Set()); };

  const SectionHeader = ({ id, Icon, accent, title, summary, doneId }) => {
    const isOpen = openSet.has(id);
    const isDone = doneId && done.has(doneId);
    return (
      <button
        onClick={() => toggleOpen(id)}
        className="w-full flex items-center gap-4 p-5 text-left transition-colors"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 16 }}>
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: accent + '1A', boxShadow: isOpen ? '0 0 0 1px ' + accent + '55' : 'none' }}>
          <Icon size={18} style={{ color: accent }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground tracking-tight">{title}</span>
            {isDone && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: C.success + '1F', color: C.success }}>
                <Check size={10} /> DONE
              </span>
            )}
          </span>
          <span className="block text-xs text-muted-foreground mt-0.5">{summary}</span>
        </span>
        <ChevronDown size={16} className="shrink-0 text-muted-foreground transition-transform"
          style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
      </button>
    );
  };

  return (
    <div className="max-w-[960px]">
      <div className="rounded-2xl p-6 mb-5 border" style={{
        background: 'linear-gradient(135deg, ' + C.surface + ' 0%, ' + C.bg + ' 100%)',
        borderColor: C.border,
      }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #3B82F6 100%)', boxShadow: '0 0 24px rgba(37,99,235,0.45)' }}>
            <BookOpen size={22} color="#fff" />
          </div>
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-lg font-bold tracking-tight text-foreground leading-tight">Welcome -- your guided tour</h2>
            <p className="text-sm text-muted-foreground mt-0.5">A walkthrough of every screen, agent, and workflow. Click any section to expand it.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Progress</div>
              <div className="text-base font-bold" style={{ color: C.primary }}>{sectionsDone}/{totalSections}</div>
            </div>
            <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
              <div className="h-full transition-all" style={{ width: pct + '%', background: 'linear-gradient(90deg, ' + C.primary + ', ' + C.accent + ')' }} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={expandAll} style={{ ...S.btnOutline, padding: '6px 12px', fontSize: 12 }}>Expand all</button>
          <button onClick={collapseAll} style={{ ...S.btnOutline, padding: '6px 12px', fontSize: 12 }}>Collapse all</button>
          {sectionsDone > 0 && (
            <button onClick={() => { setDone(new Set()); persistDone(new Set()); }}
              style={{ ...S.btnOutline, padding: '6px 12px', fontSize: 12, color: C.textMuted, borderColor: C.border }}>
              Reset progress
            </button>
          )}
        </div>
      </div>

      <Card className="card-hover mb-3" style={{ overflow: 'hidden' }}>
        <SectionHeader id="quickstart" Icon={Zap} accent={C.warning}
          title="Quick Start -- five steps to your first paid milestone"
          summary={checklist.filter((c) => done.has(c.id)).length + ' of ' + checklist.length + ' complete'} />
        {openSet.has('quickstart') && (
          <CardContent className="pt-0 pb-5 px-5">
            <div className="border-t pt-4" style={{ borderColor: C.border }}>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Run through these in order. Each step has a "Try it" button that takes you straight to the right screen.
              </p>
              <div className="flex flex-col gap-2">
                {checklist.map((c, i) => {
                  const checked = done.has(c.id);
                  return (
                    <div key={c.id}
                      className="flex items-center gap-3 p-3 rounded-xl border transition-colors"
                      style={{ borderColor: checked ? C.success + '55' : C.border, background: checked ? C.success + '0A' : C.bg }}>
                      <button onClick={(e) => toggleDone(c.id, e)}
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          background: checked ? C.success : 'transparent',
                          border: '1.5px solid ' + (checked ? C.success : C.textDim),
                          cursor: 'pointer',
                        }}
                        aria-label={checked ? 'Mark incomplete' : 'Mark complete'}>
                        {checked ? <Check size={13} color="#fff" /> : <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>}
                      </button>
                      <span className="flex-1 text-sm" style={{ color: checked ? C.textMuted : C.text, textDecoration: checked ? 'line-through' : 'none' }}>
                        {c.label}
                      </span>
                      <button onClick={() => goView(c.view)} style={{ ...S.btnOutline, padding: '5px 12px', fontSize: 11 }}>
                        Try it
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {sections.map((s) => {
        const isOpen = openSet.has(s.id);
        return (
          <Card key={s.id} className="card-hover mb-3" style={{ overflow: 'hidden' }}>
            <SectionHeader id={s.id} Icon={s.icon} accent={s.accent} title={s.title} summary={s.summary} doneId={s.id} />
            {isOpen && (
              <CardContent className="pt-0 pb-5 px-5">
                <div className="border-t pt-4" style={{ borderColor: C.border }}>
                  {s.intro && <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{s.intro}</p>}

                  {s.rows && (
                    <div className="flex flex-col gap-2.5 mb-4">
                      {s.rows.map(([heading, text], i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ background: C.bg, border: '1px solid ' + C.border }}>
                          <span className="w-1 rounded-full shrink-0 mt-0.5 mb-0.5" style={{ background: s.accent }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground">{heading}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {s.agents && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
                      {s.agents.map(([name, color, blurb]) => (
                        <div key={name} className="p-3 rounded-xl flex gap-3" style={{ background: C.bg, border: '1px solid ' + C.border }}>
                          <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: color, boxShadow: '0 0 10px ' + color + 'aa' }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold tracking-wider uppercase" style={{ color }}>{name}</div>
                            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{blurb}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {s.cta && (
                      <button onClick={() => goView(s.cta.view)} style={{ ...S.btn, padding: '8px 16px', fontSize: 12 }}>
                        {s.cta.label}
                      </button>
                    )}
                    <button onClick={(e) => toggleDone(s.id, e)} style={{
                      ...S.btnOutline,
                      padding: '7px 14px',
                      fontSize: 12,
                      color: done.has(s.id) ? C.success : '#60A5FA',
                      borderColor: done.has(s.id) ? C.success + '55' : 'rgba(37,99,235,0.5)',
                    }}>
                      {done.has(s.id) ? 'Marked as understood' : 'Mark as understood'}
                    </button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      <div className="text-center mt-6 mb-2">
        <p className="text-xs text-muted-foreground">
          Need this tour again? It is always here under <span style={{ color: C.text }}>Getting Started</span> in the sidebar.
        </p>
      </div>
    </div>
  );
}

// ─── Kanban View ─────────────────────────────────────────────────
function KanbanView({ state, dispatch }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const { projects } = await api('/projects?status=active');
        const all = [];
        for (const p of projects.slice(0, 10)) {
          try {
            const { milestones: ms } = await api(`/milestones?project_id=${p.id}`);
            ms.forEach((m) => all.push({ ...m, project_name: p.name, project_id: p.id }));
          } catch { /* skip */ }
        }
        setMilestones(all);
      } catch { /* noop */ }
      setLoading(false);
    };
    loadAll();
  }, []);

  const columns = [
    { status: 'pending', label: 'Pending', color: C.text },
    { status: 'active', label: 'In Progress', color: C.primary },
    { status: 'completed', label: 'Awaiting Approval', color: C.warning },
    { status: 'approved', label: 'Approved', color: C.success },
  ];

  if (loading) return <p className="text-muted-foreground italic text-center p-10">Loading milestones...</p>;

  return (
    <div>
      <p className="text-muted-foreground text-sm mb-6">All milestones across active projects</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 16, minHeight: 400 }}>
        {columns.map((col) => {
          const items = milestones.filter((m) => m.status === col.status);
          return (
            <div key={col.status} className="rounded-xl p-3 border border-border" style={{ background: C.bg }}>
              <div className="flex justify-between items-center mb-3 pb-2" style={{ borderBottom: `2px solid ${col.color}` }}>
                <span className="text-sm font-semibold" style={{ color: col.color }}>{col.label}</span>
                <span style={S.badge(col.color)}>{items.length}</span>
              </div>
              {items.length === 0 && <p className="text-muted-foreground text-xs text-center py-5 italic">No milestones</p>}
              {items.map((m) => (
                <Card key={m.id} className="card-hover mb-2 cursor-pointer hover:border-primary/40"
                  onClick={() => { dispatch({ type: 'SET_VIEW', view: 'project_detail' }); dispatch({ type: 'SET_PROJECT_DETAIL_LOADING' }); api(`/projects/${m.project_id}`).then((data) => dispatch({ type: 'SET_SELECTED_PROJECT', project: data })); }}>
                  <CardContent className="p-3">
                    <p className="text-sm font-semibold mb-1 text-foreground">{m.title}</p>
                    <p className="text-[11px] text-muted-foreground">{m.project_name}</p>
                    {m.amount_cents > 0 && <p className="text-xs mt-1" style={{ color: C.accent }}>{fmt(m.amount_cents)}</p>}
                    {m.approval_type === 'auto' && <span className="text-[9px] text-muted-foreground rounded-full px-1.5 py-px mt-1 inline-block" style={{ background: C.surface }}>Auto</span>}
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
      <div className="flex justify-end mb-5">
        <Button onClick={() => {
          const exportData = { exported_at: new Date().toISOString(), summary, logs: logs.map((l) => ({ ...l, est_cost: estimateCost(l) })) };
          downloadJSON(exportData, `activity-log-${new Date().toISOString().slice(0, 10)}.json`);
        }} disabled={logs.length === 0}>Export Logs</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard label="Total Calls" value={summary.total_logs} color={C.accent} icon={Activity} />
          <KPICard label="Total Tokens" value={(summary.total_tokens || 0).toLocaleString()} color={C.primary} icon={Cpu} />
          <KPICard label="Total Time" value={`${((summary.total_duration_ms || 0) / 1000).toFixed(1)}s`} color={C.textMuted} icon={Timer} />
          <KPICard label="Est. Cost" value={`$${logs.reduce((s, l) => s + parseFloat(estimateCost(l)), 0).toFixed(2)}`} color={C.textMuted} icon={DollarSign} />
        </div>
      )}

      {summary?.agent_counts && (
        <Card className="mb-5">
          <CardContent className="pt-5">
            <p className="text-sm font-semibold mb-3 text-foreground">Agent Usage</p>
            <div className="flex gap-2 flex-wrap">
              {agents.filter((a) => summary.agent_counts[a]).map((a) => (
                <button key={a} onClick={() => setFilter(filter === a ? '' : a)}
                  className="cursor-pointer transition-all" style={{ ...S.badge(AGENT_COLORS[a] || C.textDim), border: filter === a ? `2px solid ${AGENT_COLORS[a]}` : '2px solid transparent' }}>
                  {AGENT_NAMES[a] || a}: {summary.agent_counts[a]}
                </button>
              ))}
              {filter && <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setFilter('')}>Clear filter</Button>}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-muted-foreground italic text-center">Loading...</p>}
      {logs.map((log) => (
        <ActivityLogEntry key={log.id} log={log} estimateCost={estimateCost} />
      ))}
      {!loading && logs.length === 0 && <p className="text-muted-foreground italic text-center py-10">No agent activity yet.</p>}
    </div>
  );
}

function ActivityLogEntry({ log, estimateCost }) {
  const [open, setOpen] = useState(false);
  const color = AGENT_COLORS[log.agent] || C.textDim;
  const totalTokens = (log.input_tokens || 0) + (log.output_tokens || 0);

  return (
    <Card className="card-hover mb-2.5 cursor-pointer hover:border-primary/40" onClick={() => setOpen(!open)}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground text-xs">{open ? '\u25BC' : '\u25B6'}</span>
          <span style={S.badge(color)}>{AGENT_NAMES[log.agent] || log.agent}</span>
          {log.project_name && <span className="text-xs text-muted-foreground">{log.project_name}</span>}
          <span className="ml-auto flex gap-3 text-xs text-muted-foreground">
            <span>{(log.duration_ms / 1000).toFixed(1)}s</span>
            <span>{totalTokens.toLocaleString()} tok</span>
            <span>${estimateCost(log)}</span>
            <span>{timeAgo(log.created_at)}</span>
          </span>
        </div>
        {open && (
          <div className="fade-in mt-3 rounded-xl p-3.5" style={{ background: C.bg }}>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Input Tokens</p>
                <p className="text-base font-semibold text-foreground">{(log.input_tokens || 0).toLocaleString()}</p>
                <div className="h-1 rounded-full mt-1" style={{ background: C.border }}>
                  <div className="h-1 rounded-full" style={{ background: C.primary, width: `${Math.min(100, (log.input_tokens / 20000) * 100)}%` }} />
                </div>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Output Tokens</p>
                <p className="text-base font-semibold text-foreground">{(log.output_tokens || 0).toLocaleString()}</p>
                <div className="h-1 rounded-full mt-1" style={{ background: C.border }}>
                  <div className="h-1 rounded-full" style={{ background: C.accent, width: `${Math.min(100, (log.output_tokens / 5000) * 100)}%` }} />
                </div>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
              <span>Model: <strong className="text-foreground">{log.model}</strong></span>
              <span>Duration: <strong className="text-foreground">{(log.duration_ms / 1000).toFixed(1)}s</strong></span>
              <span>Cost: <strong style={{ color: C.success }}>${estimateCost(log)}</strong></span>
              <span>Time: <strong className="text-foreground">{new Date(log.created_at).toLocaleString()}</strong></span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── App ──────────────────────────────────────────────────────────
// ─── Client Portal View (public, no auth) ───────────────────────
function ClientPortalView({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback((silent) => {
    if (!silent) setLoading(true);
    fetch(`/api/portal/${token}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('Invalid or expired link')))
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => { if (!silent) setLoading(false); });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Poll for freelancer updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => load(true), 5000);
    return () => clearInterval(interval);
  }, [load]);

  const handleApprove = async (milestoneId) => {
    setActionLoading(milestoneId);
    try {
      await fetch(`/api/portal/${token}/milestones/${milestoneId}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      load();
    } catch { /* noop */ }
    setActionLoading(null);
  };

  const handleReject = async (milestoneId) => {
    if (!rejectReason.trim()) return;
    setActionLoading(milestoneId);
    try {
      await fetch(`/api/portal/${token}/milestones/${milestoneId}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: rejectReason }) });
      setRejectId(null);
      setRejectReason('');
      load();
    } catch { /* noop */ }
    setActionLoading(null);
  };

  const statusColor = (s) => ({ pending: '#5A6178', active: '#6C5CE7', completed: '#FDCB6E', approved: '#00B894', rejected: '#E17055' }[s] || '#5A6178');
  const statusIcon = (s) => ({ pending: '\u25CB', active: '\u25D4', completed: '\u25D0', approved: '\u25CF', rejected: '\u2716' }[s] || '\u25CB');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0F1117', color: '#F1F2F6' }}><p>Loading...</p></div>;
  if (error) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0F1117', color: '#E17055' }}><div style={{ textAlign: 'center' }}><p style={{ fontSize: 48, marginBottom: 12 }}>&#9670;</p><p style={{ fontSize: 18 }}>{error}</p></div></div>;

  const { project_name, freelancer_name, business_name, milestones, progress } = data;
  const pct = milestones.length > 0 ? Math.round((progress.approved / progress.total) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0F1117', color: '#F1F2F6', padding: '40px 20px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>&#9670;</p>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{project_name}</h1>
          <p style={{ color: '#8B92A8', fontSize: 14 }}>{business_name || freelancer_name}</p>
        </div>

        {/* Progress */}
        <div style={{ background: '#0B1120', borderRadius: 14, padding: 22, border: '1px solid #2E3346', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8B92A8', marginBottom: 8 }}>
            <span>Project Progress</span>
            <span>{progress.approved} of {progress.total} milestones approved ({pct}%)</span>
          </div>
          <div style={{ background: '#0F1117', borderRadius: 6, height: 8, overflow: 'hidden' }}>
            <div style={{ background: '#00B894', height: '100%', width: `${pct}%`, borderRadius: 6, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Milestones */}
        {milestones.map((m, i) => (
          <div key={m.id} style={{ display: 'flex', gap: 16, marginBottom: i < milestones.length - 1 ? 0 : 0 }}>
            {/* Stepper */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28 }}>
              <span style={{ color: statusColor(m.status), fontSize: 18, lineHeight: 1 }}>{statusIcon(m.status)}</span>
              {i < milestones.length - 1 && <div style={{ width: 2, flex: 1, background: m.status === 'approved' ? '#00B89444' : '#2E3346', margin: '6px 0' }} />}
            </div>
            {/* Content */}
            <div style={{ flex: 1, background: '#0B1120', borderRadius: 12, padding: 18, border: `1px solid ${m.status === 'completed' ? '#FDCB6E44' : '#2E3346'}`, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{m.title}</span>
                  {m.amount_cents > 0 && <span style={{ marginLeft: 8, color: '#00D2D3', fontSize: 14 }}>${(m.amount_cents / 100).toLocaleString()}</span>}
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: statusColor(m.status) + '18', color: statusColor(m.status) }}>{m.status}</span>
              </div>
              {m.description && <p style={{ color: '#8B92A8', fontSize: 13, marginTop: 8 }}>{m.description}</p>}
              {m.rejection_reason && <p style={{ color: '#E17055', fontSize: 13, marginTop: 8 }}>Rejected: {m.rejection_reason}</p>}
              {m.approved_at && <p style={{ color: '#00B894', fontSize: 11, marginTop: 8 }}>Approved {new Date(m.approved_at).toLocaleDateString()}</p>}

              {/* Client actions */}
              {m.status === 'completed' && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => handleApprove(m.id)} disabled={actionLoading === m.id}
                    style={{ background: '#00B894', color: '#F1F2F6', border: 'none', borderRadius: 10, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13, opacity: actionLoading === m.id ? 0.6 : 1 }}>
                    Approve
                  </button>
                  {rejectId === m.id ? (
                    <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                      <input style={{ background: '#0F1117', border: '1px solid #2E3346', borderRadius: 8, padding: '8px 12px', color: '#F1F2F6', fontSize: 13, flex: 1 }} placeholder="Reason for rejection" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                      <button onClick={() => handleReject(m.id)} disabled={actionLoading === m.id}
                        style={{ background: '#E17055', color: '#F1F2F6', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Send</button>
                      <button onClick={() => { setRejectId(null); setRejectReason(''); }}
                        style={{ background: 'transparent', color: '#8B92A8', border: '1px solid #2E3346', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setRejectId(m.id)}
                      style={{ background: 'transparent', color: '#E17055', border: '1px solid #E1705544', borderRadius: 10, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      Request Changes
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {milestones.length === 0 && (
          <div style={{ background: '#0B1120', borderRadius: 14, padding: 40, border: '1px solid #2E3346', textAlign: 'center' }}>
            <p style={{ color: '#8B92A8' }}>No milestones have been added to this project yet.</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ position: 'relative', marginTop: 48 }}>
          <div style={{ position: 'absolute', top: -14, left: 24, width: 72, height: 28, background: 'rgba(148,163,184,0.15)', backdropFilter: 'blur(4px)', clipPath: 'polygon(5% 0%, 95% 2%, 100% 100%, 0% 98%)', transform: 'rotate(-6deg)', zIndex: 10 }} />
          <div style={{ position: 'absolute', top: -14, right: 24, width: 72, height: 28, background: 'rgba(148,163,184,0.15)', backdropFilter: 'blur(4px)', clipPath: 'polygon(5% 0%, 95% 2%, 100% 100%, 0% 98%)', transform: 'rotate(6deg)', zIndex: 10 }} />
          <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 16, padding: '20px 32px', textAlign: 'center' }}>
            <p style={{ color: '#475569', fontSize: 12 }}>Powered by <span style={{ color: '#60A5FA', fontWeight: 600 }}>BackOffice Agent</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Drafts Inbox View ─────────────────────────────────────────────
// The human-in-the-loop approval surface. Agents create proposals/invoices/contracts
// in pending_approval state; the freelancer reviews + clicks "Approve & Send" here.
// Backed by GET /api/drafts and POST /api/drafts/{type}/:id/send.
const RESOURCE_LABELS = {
  proposal: { color: '#60A5FA', label: 'Proposal', endpoint: 'proposals' },
  invoice: { color: '#34D399', label: 'Invoice', endpoint: 'invoices' },
  contract: { color: '#F472B6', label: 'Contract', endpoint: 'contracts' },
};

// Renders the actual body of an agent-created document so the owner can
// review what they're approving without leaving the inbox. Each resource
// type has a different shape — proposals/contracts use JSONB content,
// invoices use line_items + total_cents.
function DraftBody({ resourceType, body }) {
  if (!body) return null;
  if (resourceType === 'proposal') {
    const p = body.proposal || {};
    const c = p.content || {};
    return (
      <div className="space-y-3 text-sm">
        {c.title && <p className="font-semibold text-foreground">{c.title}</p>}
        {c.scope_summary && (
          <div><p className="text-xs text-muted-foreground mb-1">Scope</p><p>{c.scope_summary}</p></div>
        )}
        {c.deliverables && (
          <div><p className="text-xs text-muted-foreground mb-1">Deliverables</p><p>{c.deliverables}</p></div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {c.timeline && <div><p className="text-xs text-muted-foreground">Timeline</p><p>{c.timeline}</p></div>}
          {c.pricing_total_cents != null && <div><p className="text-xs text-muted-foreground">Pricing</p><p>{fmt(c.pricing_total_cents)}</p></div>}
        </div>
        {c.notes && (
          <div><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="whitespace-pre-wrap">{c.notes}</p></div>
        )}
      </div>
    );
  }
  if (resourceType === 'invoice') {
    const inv = body.invoice || {};
    const items = Array.isArray(inv.line_items) ? inv.line_items : [];
    return (
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{fmt(inv.total_cents)}</p></div>
          {inv.due_date && <div><p className="text-xs text-muted-foreground">Due</p><p>{new Date(inv.due_date).toLocaleDateString()}</p></div>}
        </div>
        {items.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Line items</p>
            <div className="space-y-1.5">
              {items.map((it, i) => (
                <div key={i} className="flex justify-between gap-3 py-1.5 px-2 rounded" style={{ background: C.bg }}>
                  <span className="flex-1 truncate">{it.description || '—'}</span>
                  <span className="text-muted-foreground text-xs">× {it.qty || 1}</span>
                  <span className="font-mono">{fmt((it.qty || 1) * (it.rate_cents || 0))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  if (resourceType === 'contract') {
    const ct = body.contract || {};
    const c = ct.content || {};
    const flags = Array.isArray(ct.flags) ? ct.flags : [];
    const sections = ['scope', 'payment_terms', 'revision_policy', 'ip_ownership', 'termination', 'timeline'];
    return (
      <div className="space-y-3 text-sm">
        {sections.filter((s) => c[s]).map((s) => (
          <div key={s}>
            <p className="text-xs text-muted-foreground mb-1 capitalize">{s.replace('_', ' ')}</p>
            <p className="whitespace-pre-wrap">{c[s]}</p>
          </div>
        ))}
        {flags.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Flagged clauses</p>
            <div className="space-y-1.5">
              {flags.map((f, i) => (
                <div key={i} className="px-2 py-1.5 rounded text-xs" style={{ background: C.danger + '14', borderLeft: `2px solid ${C.danger}` }}>
                  <span className="font-semibold">[{f.severity || '?'}]</span> {f.clause || ''}: {f.explanation || ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
}

function ConfidenceBadge({ score }) {
  if (score == null) return <span className="text-xs text-muted-foreground">no score</span>;
  const n = Number(score);
  const color = n < 0.7 ? C.warning : n < 0.85 ? C.accent : C.success;
  const label = n < 0.7 ? 'review carefully' : n < 0.85 ? 'looks ok' : 'high confidence';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span style={{ color }}>{(n * 100).toFixed(0)}%</span>
      <span className="text-muted-foreground">· {label}</span>
    </span>
  );
}

function DraftsView({ state, dispatch }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [error, setError] = useState(null);
  const [recentlySent, setRecentlySent] = useState([]);
  const [expanded, setExpanded] = useState({}); // { [draftId]: { loading, body, error } }
  const [highlightId, setHighlightId] = useState(null); // briefly pulse the focused row
  const rowRefs = useRef({});

  const refresh = useCallback(() => {
    setLoading(true);
    api('/drafts').then((data) => {
      setDrafts(data.drafts || []);
      setLoading(false);
    }).catch((e) => { setError(e.message || String(e)); setLoading(false); });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleExpand = useCallback(async (draft) => {
    const cur = expanded[draft.id];
    if (cur && (cur.body || cur.error)) {
      setExpanded((prev) => { const next = { ...prev }; delete next[draft.id]; return next; });
      return;
    }
    setExpanded((prev) => ({ ...prev, [draft.id]: { loading: true } }));
    try {
      const body = await api(`/documents/${draft.resource_type}s/${draft.id}`);
      setExpanded((prev) => ({ ...prev, [draft.id]: { loading: false, body } }));
    } catch (e) {
      setExpanded((prev) => ({ ...prev, [draft.id]: { loading: false, error: e.message || 'Load failed' } }));
    }
  }, [expanded]);

  const expandWithoutToggle = useCallback(async (draft) => {
    if (expanded[draft.id]) return;
    setExpanded((prev) => ({ ...prev, [draft.id]: { loading: true } }));
    try {
      const body = await api(`/documents/${draft.resource_type}s/${draft.id}`);
      setExpanded((prev) => ({ ...prev, [draft.id]: { loading: false, body } }));
    } catch (e) {
      setExpanded((prev) => ({ ...prev, [draft.id]: { loading: false, error: e.message || 'Load failed' } }));
    }
  }, [expanded]);

  // Consume focus from the chat "Open in Drafts" handoff: scroll to the row,
  // auto-expand it, pulse a highlight, then clear so revisiting Drafts doesn't
  // re-focus the same id.
  useEffect(() => {
    if (!state.draftFocusId || loading) return;
    const target = drafts.find((d) => d.id === state.draftFocusId);
    if (!target) return;
    expandWithoutToggle(target);
    requestAnimationFrame(() => {
      const el = rowRefs.current[target.id];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    setHighlightId(target.id);
    const t1 = setTimeout(() => setHighlightId(null), 2200);
    dispatch({ type: 'SET_DRAFT_FOCUS', id: null });
    return () => clearTimeout(t1);
  }, [state.draftFocusId, drafts, loading, expandWithoutToggle, dispatch]);

  const handleSend = async (draft) => {
    const meta = RESOURCE_LABELS[draft.resource_type];
    if (!meta) return;
    setSendingId(draft.id);
    setError(null);
    try {
      await api(`/drafts/${meta.endpoint}/${draft.id}/send`, { method: 'POST' });
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      setRecentlySent((prev) => [{ ...draft, sent_at: new Date().toISOString() }, ...prev].slice(0, 5));
    } catch (e) {
      setError(e.message || 'Send failed');
      refresh();
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={20} style={{ color: C.primary }} />
            <h1 className="text-2xl font-bold text-foreground">Drafts Inbox</h1>
            <span style={S.badge(C.warning)}>{drafts.length} pending</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Agents drafted these — nothing leaves your inbox until you approve. Review the confidence score, then send.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</Button>
      </div>

      {error && (
        <Card className="mb-4" style={{ borderColor: C.danger + '66' }}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle size={16} style={{ color: C.danger }} />
            <span className="text-sm" style={{ color: C.danger }}>{error}</span>
          </CardContent>
        </Card>
      )}

      {loading && drafts.length === 0 && <p className="text-muted-foreground italic text-center py-10">Loading...</p>}

      {!loading && drafts.length === 0 && (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <Inbox size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-foreground font-medium mb-1">No drafts waiting for approval</p>
            <p className="text-sm text-muted-foreground">Trigger an agent from the AI Chat to create one.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {drafts.map((d) => {
          const meta = RESOURCE_LABELS[d.resource_type] || { color: C.textDim, label: d.resource_type };
          const isSending = sendingId === d.id;
          const exp = expanded[d.id];
          const isOpen = !!exp;
          const isHighlighted = highlightId === d.id;
          return (
            <Card
              key={d.id}
              ref={(el) => { if (el) rowRefs.current[d.id] = el; }}
              className="card-hover"
              style={isHighlighted ? {
                borderColor: C.primary + '88',
                boxShadow: `0 0 32px ${C.primary}44`,
                transition: 'border-color 0.4s ease, box-shadow 0.4s ease'
              } : undefined}
            >
              <CardContent className="pt-5 pb-5">
                <div
                  className="flex items-start gap-4 cursor-pointer"
                  onClick={() => toggleExpand(d)}
                  title="Click to preview"
                >
                  <ChevronRight
                    size={16}
                    className="mt-1 shrink-0 transition-transform"
                    style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', color: C.textMuted }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span style={S.badge(meta.color)}>{meta.label}</span>
                      <span className="text-sm font-semibold text-foreground truncate">{d.title}</span>
                      {d.amount_cents != null && (
                        <span className="text-xs text-muted-foreground">· {fmt(d.amount_cents)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{d.project_name}</span>
                      {d.client_name && <><span>·</span><span>{d.client_name}</span></>}
                      <span>·</span>
                      <span>{timeAgo(d.created_at)}</span>
                    </div>
                    <div className="mt-3"><ConfidenceBadge score={d.confidence} /></div>
                  </div>
                  <div
                    className="shrink-0 flex flex-col gap-2 items-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button onClick={() => handleSend(d)} disabled={isSending} size="sm">
                      <Send size={13} className="mr-1.5" />
                      {isSending ? 'Sending...' : 'Approve & Send'}
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: C.border }}>
                    {exp.loading && <p className="text-xs text-muted-foreground italic">Loading content…</p>}
                    {exp.error && <p className="text-xs" style={{ color: C.danger }}>{exp.error}</p>}
                    {exp.body && <DraftBody resourceType={d.resource_type} body={exp.body} />}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {recentlySent.length > 0 && (
        <div className="mt-10">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Recently sent</p>
          <div className="space-y-2">
            {recentlySent.map((d) => {
              const meta = RESOURCE_LABELS[d.resource_type] || { color: C.textDim, label: d.resource_type };
              return (
                <div key={d.id + (d.sent_at || '')} className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <Check size={14} style={{ color: C.success }} />
                  <span style={S.badge(meta.color)}>{meta.label}</span>
                  <span className="text-sm text-foreground truncate">{d.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">just now · audit logged</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Memory View ──────────────────────────────────────────────────
// Owner-facing review surface for the agent memory layer. Pending facts
// (agent observations) need owner approval before they feed back into
// future agent runs. Confirmed facts can be edited or deleted at any time.
const MEMORY_CATEGORY_COLORS = {
  payment_pref: '#34D399',     // green — financial
  comm_tone: '#60A5FA',        // blue — voice/style
  red_flag: '#F87171',         // red — risk
  pricing_history: '#FBBF24',  // amber — money pattern
  other: '#94A3B8',            // gray
};

function MemoryRow({ row, scope, justApproved, onPromote, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(row.value);
  const [saving, setSaving] = useState(false);
  const isPending = row.status === 'pending';
  const color = MEMORY_CATEGORY_COLORS[row.category] || C.textDim;
  const sourceColor = row.source === 'owner' ? C.success : C.accent;

  const handleSave = async () => {
    if (draftValue === row.value) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(row, draftValue); setEditing(false); }
    finally { setSaving(false); }
  };

  return (
    <Card
      className="card-hover mb-2"
      style={{
        borderColor: justApproved ? C.success + '88' : isPending ? C.warning + '66' : undefined,
        boxShadow: justApproved ? `0 0 24px ${C.success}33` : undefined,
        transition: 'border-color 0.4s ease, box-shadow 0.4s ease'
      }}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span style={S.badge(color)}>{row.category.replace('_', ' ')}</span>
              <span className="text-xs font-mono text-muted-foreground">{row.key}</span>
              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: sourceColor }}>
                {row.source}
              </span>
              {row.confidence != null && (
                <span className="text-xs text-muted-foreground">· {Math.round(Number(row.confidence) * 100)}%</span>
              )}
              {isPending && <span style={S.badge(C.warning)}>pending</span>}
              {justApproved && (
                <span className="flex items-center gap-1 text-xs" style={{ color: C.success }}>
                  <Check size={12} /> approved
                </span>
              )}
            </div>
            {editing ? (
              <Textarea
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value.slice(0, 120))}
                className="text-sm"
                rows={2}
                autoFocus
              />
            ) : (
              <p className="text-sm text-foreground">{row.value}</p>
            )}
            {editing && (
              <p className="text-[10px] text-muted-foreground mt-1">{draftValue.length}/120 chars</p>
            )}
          </div>
          <div className="shrink-0 flex flex-col gap-1.5 items-end">
            {editing ? (
              <>
                <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); setDraftValue(row.value); }} disabled={saving}>Cancel</Button>
              </>
            ) : (
              <>
                {isPending && (
                  <Button size="sm" onClick={() => onPromote(row, scope)}>
                    <Check size={13} className="mr-1" /> Approve
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil size={12} className="mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDelete(row, scope)}
                  style={{ color: C.danger, borderColor: C.danger + '44' }}>
                  <Trash2 size={12} />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MemoryView({ state, dispatch }) {
  const [tab, setTab] = useState('clients');
  const [workspace, setWorkspace] = useState([]);
  const [clientsMemory, setClientsMemory] = useState({}); // { client_id: { client_name, rows[] } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Track ids that were just approved so we can show a brief green pulse
  // without doing a full re-fetch + reflow.
  const [justApproved, setJustApproved] = useState(new Set());

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wsData = await api('/memory/workspace');
      setWorkspace(wsData.memory || []);
      let clients = state.clients;
      if (!clients || clients.length === 0) {
        const cd = await api('/clients');
        clients = cd.clients || [];
      }
      const byClient = {};
      await Promise.all(clients.map(async (c) => {
        const r = await api(`/memory/clients/${c.id}`);
        if (r.memory && r.memory.length > 0) byClient[c.id] = { client_name: c.name, rows: r.memory };
      }));
      setClientsMemory(byClient);
    } catch (e) {
      setError(e.message || 'Failed to load memory');
    } finally {
      setLoading(false);
    }
  }, [state.clients]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Optimistic local update — single row, no full re-fetch, no reflow.
  // We mutate the relevant client's row in place (or workspace row) and let
  // React reconcile only the affected card. The server is the source of truth
  // on errors — we revert from a snapshot if the PATCH/DELETE fails.
  const handlePromote = async (row, scope) => {
    const snapshotClients = clientsMemory;
    const snapshotWorkspace = workspace;
    if (scope === 'workspace') {
      setWorkspace((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: 'confirmed' } : r)));
    } else {
      setClientsMemory((prev) => {
        const next = { ...prev };
        for (const cid of Object.keys(next)) {
          next[cid] = { ...next[cid], rows: next[cid].rows.map((r) => (r.id === row.id ? { ...r, status: 'confirmed' } : r)) };
        }
        return next;
      });
    }
    setJustApproved((prev) => new Set(prev).add(row.id));
    setTimeout(() => setJustApproved((prev) => { const next = new Set(prev); next.delete(row.id); return next; }), 2500);
    try {
      await api(`/memory/${row.id}`, { method: 'PATCH', body: { scope, status: 'confirmed' } });
    } catch (e) {
      setError(e.message || 'Approve failed — reverted');
      setClientsMemory(snapshotClients);
      setWorkspace(snapshotWorkspace);
    }
  };

  const handleSave = async (row, newValue) => {
    const inferredScope = workspace.find((w) => w.id === row.id) ? 'workspace' : 'client';
    const snapshotClients = clientsMemory;
    const snapshotWorkspace = workspace;
    if (inferredScope === 'workspace') {
      setWorkspace((prev) => prev.map((r) => (r.id === row.id ? { ...r, value: newValue } : r)));
    } else {
      setClientsMemory((prev) => {
        const next = { ...prev };
        for (const cid of Object.keys(next)) {
          next[cid] = { ...next[cid], rows: next[cid].rows.map((r) => (r.id === row.id ? { ...r, value: newValue } : r)) };
        }
        return next;
      });
    }
    try {
      await api(`/memory/${row.id}`, { method: 'PATCH', body: { scope: inferredScope, value: newValue } });
    } catch (e) {
      setError(e.message || 'Save failed — reverted');
      setClientsMemory(snapshotClients);
      setWorkspace(snapshotWorkspace);
    }
  };

  const handleDelete = async (row, scope) => {
    if (!confirm(`Delete this ${row.category.replace('_', ' ')} fact?`)) return;
    const snapshotClients = clientsMemory;
    const snapshotWorkspace = workspace;
    if (scope === 'workspace') {
      setWorkspace((prev) => prev.filter((r) => r.id !== row.id));
    } else {
      setClientsMemory((prev) => {
        const next = {};
        for (const cid of Object.keys(prev)) {
          const filtered = prev[cid].rows.filter((r) => r.id !== row.id);
          if (filtered.length > 0) next[cid] = { ...prev[cid], rows: filtered };
        }
        return next;
      });
    }
    try {
      await api(`/memory/${row.id}?scope=${scope}`, { method: 'DELETE' });
    } catch (e) {
      setError(e.message || 'Delete failed — reverted');
      setClientsMemory(snapshotClients);
      setWorkspace(snapshotWorkspace);
    }
  };

  // Counts derive from local state — no separate fetch, always in sync with
  // optimistic updates above.
  const pendingCount =
    workspace.filter((r) => r.status === 'pending').length +
    Object.values(clientsMemory).reduce((sum, g) => sum + g.rows.filter((r) => r.status === 'pending').length, 0);
  const clientCount = Object.keys(clientsMemory).length;
  const workspaceCount = workspace.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Brain size={20} style={{ color: C.primary }} />
            <h1 className="text-2xl font-bold text-foreground">Agent Memory</h1>
            {pendingCount > 0 && <span style={S.badge(C.warning)}>{pendingCount} pending review</span>}
          </div>
          <p className="text-sm text-muted-foreground">
            What your agents have learned. Pending facts are agent observations awaiting your approval — they don't influence future runs until you confirm them.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <Card className="mb-4" style={{ borderColor: C.danger + '66' }}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle size={16} style={{ color: C.danger }} />
            <span className="text-sm" style={{ color: C.danger }}>{error}</span>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 mb-5">
        <Button variant={tab === 'clients' ? 'default' : 'outline'} size="sm" onClick={() => setTab('clients')}>
          By Client {clientCount > 0 && <span className="ml-1.5 opacity-60">({clientCount})</span>}
        </Button>
        <Button variant={tab === 'workspace' ? 'default' : 'outline'} size="sm" onClick={() => setTab('workspace')}>
          Workspace {workspaceCount > 0 && <span className="ml-1.5 opacity-60">({workspaceCount})</span>}
        </Button>
      </div>

      {loading && <p className="text-muted-foreground italic text-center py-10">Loading memory…</p>}

      {!loading && tab === 'clients' && (
        <>
          {clientCount === 0 ? (
            <Card>
              <CardContent className="pt-10 pb-10 text-center">
                <Brain size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-foreground font-medium mb-1">No client memory yet</p>
                <p className="text-sm text-muted-foreground">As agents work on projects, they'll record patterns about each client here for your review.</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(clientsMemory).map(([cid, group]) => (
              <div key={cid} className="mb-6">
                <p className="text-sm font-semibold text-foreground mb-3">{group.client_name}</p>
                {group.rows.map((row) => (
                  <MemoryRow key={row.id} row={row} scope="client" justApproved={justApproved.has(row.id)} onPromote={handlePromote} onSave={handleSave} onDelete={handleDelete} />
                ))}
              </div>
            ))
          )}
        </>
      )}

      {!loading && tab === 'workspace' && (
        <>
          {workspace.length === 0 ? (
            <Card>
              <CardContent className="pt-10 pb-10 text-center">
                <Brain size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-foreground font-medium mb-1">No workspace memory yet</p>
                <p className="text-sm text-muted-foreground">Workspace facts apply across all clients (your default rates, common red flags, etc.).</p>
              </CardContent>
            </Card>
          ) : (
            workspace.map((row) => (
              <MemoryRow key={row.id} row={row} scope="workspace" justApproved={justApproved.has(row.id)} onPromote={handlePromote} onSave={handleSave} onDelete={handleDelete} />
            ))
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showLanding, setShowLanding] = useState(true);

  // Portal pages have their own component below; detect here but do NOT
  // early-return until after every hook call (rules-of-hooks).
  const portalMatch = window.location.pathname.match(/^\/portal\/([a-f0-9]{64})$/);

  // Boot: validate session via /auth/me, then re-fetch project_detail if
  // that's the restored view (so a hard refresh on a project page doesn't
  // drop you back to the dashboard).
  useEffect(() => {
    if (portalMatch || state.user) return;
    api('/auth/me')
      .then(({ user }) => {
        dispatch({ type: 'SET_AUTH', user });
        const savedView = localStorage.getItem('currentView');
        const savedProjectId = localStorage.getItem('selectedProjectId');
        if (savedView === 'project_detail' && savedProjectId) {
          dispatch({ type: 'SET_PROJECT_DETAIL_LOADING' });
          api(`/projects/${savedProjectId}`)
            .then((data) => dispatch({ type: 'SET_SELECTED_PROJECT', project: data }))
            .catch(() => {
              localStorage.removeItem('selectedProjectId');
              dispatch({ type: 'SET_VIEW', view: 'dashboard' });
            });
        }
      })
      .catch(() => { dispatch({ type: 'LOGOUT' }); });
  }, []);

  if (portalMatch) {
    return <ClientPortalView token={portalMatch[1]} />;
  }

  const globalStyles = `
    .card-hover:hover { border-color: rgba(37,99,235,0.4) !important; box-shadow: 0 0 24px rgba(37,99,235,0.12); }
    .btn-primary:hover { background: ${C.primaryHover} !important; transform: translateY(-1px); }
    .btn-outline:hover { background: rgba(37,99,235,0.08) !important; border-color: rgba(37,99,235,0.6) !important; color: #93C5FD !important; }
    .nav-item:hover { background: ${C.surfaceHover}; }
    input:focus, textarea:focus, select:focus { border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.15) !important; outline: none; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;

  // Error boundary for debugging
  if (typeof window !== 'undefined' && !window.__errorHandlerSet) {
    window.__errorHandlerSet = true;
    window.addEventListener('error', (e) => console.error('RENDER ERROR:', e.message, e.filename, e.lineno));
  }

  if (!state.user) {
    if (showLanding) return <LandingView onGetStarted={() => setShowLanding(false)} />;
    return <><style>{globalStyles}</style><AuthView state={state} dispatch={dispatch} /></>;
  }

  const viewMap = {
    dashboard: DashboardView,
    chat: ChatView,
    projects: ProjectsView,
    project_detail: ProjectDetail,
    clients: ClientsView,
    kanban: KanbanView,
    drafts: DraftsView,
    memory: MemoryView,
    onboarding: OnboardingView,
    activity: ActivityLogView,
  };
  const View = viewMap[state.view] || DashboardView;

  return (
    <>
      <style>{globalStyles}</style>
      <div className="flex min-h-screen" style={{ background: C.bg, color: C.text }}>
        <Sidebar state={state} dispatch={dispatch} />
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <TopHeader state={state} />
          <main className="flex-1 overflow-y-auto p-8 lg:p-10">
            <View state={state} dispatch={dispatch} />
          </main>
        </div>
      </div>
    </>
  );
}
