import React, { useReducer } from 'react';

const C = {
  bg: '#0F1117',
  surface: '#1A1D27',
  surfaceHover: '#242836',
  border: '#2E3346',
  primary: '#6C5CE7',
  primaryHover: '#7F71EF',
  accent: '#00D2D3',
  success: '#00B894',
  warning: '#FDCB6E',
  danger: '#E17055',
  text: '#F1F2F6',
  textMuted: '#8B92A8',
  textDim: '#5A6178',
  // Agent colors
  proposal: '#74B9FF',
  invoice: '#55EFC4',
  contract: '#FAB1A0',
  scope: '#FFEAA7',
  insight: '#A29BFE',
};

const initialState = {
  view: 'dashboard',
  user: null,
  token: localStorage.getItem('token'),
  messages: [],
  streaming: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW': return { ...state, view: action.view };
    case 'SET_AUTH': return { ...state, user: action.user, token: action.token };
    case 'LOGOUT': return { ...state, user: null, token: null };
    case 'ADD_MESSAGE': return { ...state, messages: [...state.messages, action.message] };
    case 'SET_STREAMING': return { ...state, streaming: action.streaming };
    default: return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700 }}>BackOffice Agent</h1>
        <p style={{ color: C.textMuted }}>Five AI agents. Zero admin hours.</p>
        <p style={{ color: C.textDim, fontSize: 14 }}>Foundation ready. Building UI next.</p>
      </div>
    </div>
  );
}
