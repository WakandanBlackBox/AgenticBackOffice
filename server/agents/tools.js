import db from '../db.js';

// Tool definitions for Claude tool_use -- each returns { success, data } or { success: false, error }

// Cap serialized tool result size to prevent context bloat
const MAX_RESULT_CHARS = 2000;
export function capResultSize(resultJson) {
  if (resultJson.length <= MAX_RESULT_CHARS) return resultJson;
  return resultJson.slice(0, MAX_RESULT_CHARS) + '...[truncated]';
}

const TOOL_DEFS = {
  // === SHARED CONTEXT ===
  get_project_context: {
    name: 'get_project_context',
    description: 'Get full project details including client info, budget, scope, and dates.',
    input_schema: {
      type: 'object',
      properties: { project_id: { type: 'string', description: 'Project UUID' } },
      required: ['project_id']
    },
    fn: async (args, userId) => {
      const project = await db.one(
        `SELECT p.*, c.name AS client_name, c.email AS client_email, c.company AS client_company
         FROM projects p LEFT JOIN clients c ON p.client_id = c.id
         WHERE p.id = $1 AND p.user_id = $2`, [args.project_id, userId]
      );
      if (!project) return { success: false, error: 'Project not found' };
      const milestones = await db.many(
        `SELECT title, description, amount_cents, status, approval_type, position
         FROM milestones WHERE project_id = $1 AND user_id = $2
         ORDER BY position LIMIT 10`, [args.project_id, userId]
      );
      project.milestones = milestones;
      return { success: true, data: project };
    }
  },

  // === PROPOSAL TOOLS ===
  get_client_history: {
    name: 'get_client_history',
    description: 'Get past projects and invoices for a client. The client_id must be a valid UUID (get it from get_project_context first).',
    input_schema: {
      type: 'object',
      properties: { client_id: { type: 'string', description: 'Client UUID (from get_project_context result, NOT the client name)' } },
      required: ['client_id']
    },
    fn: async (args, userId) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(args.client_id)) {
        return { success: false, error: `"${args.client_id}" is not a valid UUID. Use the client_id from get_project_context (e.g. "7fef35bc-ed7c-45c3-89a2-14b33fb86483").` };
      }
      const projects = await db.many(
        'SELECT id, name, status, budget_cents, created_at FROM projects WHERE client_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 5',
        [args.client_id, userId]
      );
      return { success: true, data: { projects, count: projects.length } };
    }
  },

  get_past_proposals: {
    name: 'get_past_proposals',
    description: 'Get recent proposals for style and pricing reference.',
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max proposals to return', default: 5 } },
      required: []
    },
    fn: async (args, userId) => {
      const proposals = await db.many(
        `SELECT id, status, created_at,
           content->>'title' AS title,
           content->>'pricing_total_cents' AS pricing_total_cents,
           content->>'timeline' AS timeline
         FROM proposals WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [userId, Math.min(args.limit || 3, 3)]
      );
      return { success: true, data: proposals };
    }
  },

  calculate_pricing: {
    name: 'calculate_pricing',
    description: 'Calculate project pricing based on estimated hours and the freelancer\'s rate.',
    input_schema: {
      type: 'object',
      properties: {
        estimated_hours: { type: 'number', description: 'Estimated hours for the project' },
        complexity_multiplier: { type: 'number', description: 'Multiplier for complexity (1.0 = standard)', default: 1.0 }
      },
      required: ['estimated_hours']
    },
    fn: async (args, userId) => {
      const user = await db.one('SELECT hourly_rate_cents FROM users WHERE id = $1', [userId]);
      const rate = user?.hourly_rate_cents || 10000; // default $100/hr
      const multiplier = args.complexity_multiplier || 1.0;
      const total = Math.round(args.estimated_hours * rate * multiplier);
      return { success: true, data: { estimated_hours: args.estimated_hours, rate_cents: rate, multiplier, total_cents: total } };
    }
  },

  save_proposal: {
    name: 'save_proposal',
    description: 'Save a proposal to the database. Pass ALL proposal details in the content object.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project UUID' },
        title: { type: 'string', description: 'Proposal title, e.g. "Website Redesign Proposal"' },
        deliverables: { type: 'string', description: 'Comma-separated list of deliverables' },
        pricing_total_cents: { type: 'number', description: 'Total price in cents' },
        timeline: { type: 'string', description: 'Timeline summary, e.g. "6 weeks"' },
        scope_summary: { type: 'string', description: 'Brief scope description' },
        notes: { type: 'string', description: 'Any additional notes, budget advisories, or exclusions' }
      },
      required: ['project_id', 'title']
    },
    fn: async (args, userId) => {
      const content = {
        title: args.title,
        deliverables: args.deliverables,
        pricing_total_cents: args.pricing_total_cents,
        timeline: args.timeline,
        scope_summary: args.scope_summary,
        notes: args.notes
      };
      const row = await db.one(
        `INSERT INTO proposals (project_id, user_id, content, status, requires_approval)
         VALUES ($1, $2, $3, 'pending_approval', TRUE) RETURNING id, status, created_at`,
        [args.project_id, userId, JSON.stringify(content)]
      );
      return { success: true, data: { ...row, awaiting_approval: true } };
    }
  },

  // === INVOICE TOOLS ===
  get_project_invoices: {
    name: 'get_project_invoices',
    description: 'List all invoices for a project.',
    input_schema: {
      type: 'object',
      properties: { project_id: { type: 'string', description: 'Project UUID' } },
      required: ['project_id']
    },
    fn: async (args, userId) => {
      const invoices = await db.many(
        'SELECT id, line_items, total_cents, status, due_date, created_at FROM invoices WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC',
        [args.project_id, userId]
      );
      return { success: true, data: invoices };
    }
  },

  create_invoice: {
    name: 'create_invoice',
    description: 'Create a new invoice with line items.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project UUID' },
        line_items: { type: 'array', description: 'Array of {description, qty, rate_cents}', items: { type: 'object' } },
        total_cents: { type: 'number', description: 'Total in cents' },
        due_date: { type: 'string', description: 'Due date (YYYY-MM-DD)' }
      },
      required: ['project_id', 'line_items', 'total_cents']
    },
    fn: async (args, userId) => {
      const row = await db.one(
        `INSERT INTO invoices (project_id, user_id, line_items, total_cents, due_date, status, requires_approval)
         VALUES ($1, $2, $3, $4, $5, 'pending_approval', TRUE) RETURNING id, status, created_at`,
        [args.project_id, userId, JSON.stringify(args.line_items), args.total_cents, args.due_date || null]
      );
      return { success: true, data: { ...row, awaiting_approval: true } };
    }
  },

  update_invoice_status: {
    name: 'update_invoice_status',
    // Agents cannot mark an invoice as 'sent' or 'paid' — those transitions are
    // owner-only and go through POST /api/drafts/invoices/:id/send + Stripe webhook (Phase 2).
    description: 'Update an invoice to draft or overdue. Agents cannot send or mark paid — that requires owner approval.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: { type: 'string', description: 'Invoice UUID' },
        status: { type: 'string', enum: ['draft', 'overdue'] }
      },
      required: ['invoice_id', 'status']
    },
    fn: async (args, userId) => {
      const ALLOWED_AGENT_STATUSES = ['draft', 'overdue'];
      if (!ALLOWED_AGENT_STATUSES.includes(args.status)) {
        return { success: false, error: `Agents cannot set invoice status to "${args.status}". Allowed: ${ALLOWED_AGENT_STATUSES.join(', ')}. To send, the freelancer must approve via the Drafts inbox.` };
      }
      const row = await db.one(
        'UPDATE invoices SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING id, status',
        [args.status, args.invoice_id, userId]
      );
      if (!row) return { success: false, error: 'Invoice not found' };
      return { success: true, data: row };
    }
  },

  // === CONTRACT TOOLS ===
  get_project_proposal: {
    name: 'get_project_proposal',
    description: 'Get the latest proposal for a project to align contract terms.',
    input_schema: {
      type: 'object',
      properties: { project_id: { type: 'string', description: 'Project UUID' } },
      required: ['project_id']
    },
    fn: async (args, userId) => {
      const proposal = await db.one(
        'SELECT id, content, status FROM proposals WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
        [args.project_id, userId]
      );
      if (!proposal) return { success: false, error: 'No proposal found for this project' };
      return { success: true, data: proposal };
    }
  },

  save_contract: {
    name: 'save_contract',
    description: 'Save a generated contract to the database. The content must be a JSON object with contract clauses.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project UUID' },
        content: { type: 'object', description: 'Contract content with keys: scope, payment_terms, revision_policy, ip_ownership, termination, timeline. Each value is a string with the clause text.' },
        flags: { type: 'array', description: 'Flagged clauses with severity', items: { type: 'object' } }
      },
      required: ['project_id', 'content']
    },
    fn: async (args, userId) => {
      const content = args.content || {};
      const serialized = typeof content === 'string' ? content : JSON.stringify(content);
      const row = await db.one(
        `INSERT INTO contracts (project_id, user_id, content, flags, status, requires_approval)
         VALUES ($1, $2, $3, $4, 'pending_approval', TRUE) RETURNING id, status, created_at`,
        [args.project_id, userId, serialized, JSON.stringify(args.flags || [])]
      );
      return { success: true, data: { ...row, awaiting_approval: true } };
    }
  },

  flag_clause: {
    name: 'flag_clause',
    description: 'Flag a specific clause in a contract as risky.',
    input_schema: {
      type: 'object',
      properties: {
        contract_id: { type: 'string', description: 'Contract UUID' },
        clause_title: { type: 'string' },
        severity: { type: 'string', enum: ['low', 'medium', 'high'] },
        explanation: { type: 'string' }
      },
      required: ['contract_id', 'clause_title', 'severity', 'explanation']
    },
    fn: async (args, userId) => {
      const contract = await db.one('SELECT flags FROM contracts WHERE id = $1 AND user_id = $2', [args.contract_id, userId]);
      if (!contract) return { success: false, error: 'Contract not found' };
      const flags = [...(contract.flags || []), { clause: args.clause_title, severity: args.severity, explanation: args.explanation }];
      await db.query('UPDATE contracts SET flags = $1 WHERE id = $2 AND user_id = $3', [JSON.stringify(flags), args.contract_id, userId]);
      return { success: true, data: { flagged: args.clause_title, severity: args.severity } };
    }
  },

  // === TRUST LAYER ===
  set_confidence: {
    name: 'set_confidence',
    description: 'Score your own output 0.0-1.0 and explain the reasoning. Call this AFTER creating a draft (proposal, invoice, or contract) so the freelancer can see how sure you are before approving. Score < 0.7 signals "needs careful review."',
    input_schema: {
      type: 'object',
      properties: {
        resource_type: { type: 'string', enum: ['proposal', 'invoice', 'contract'] },
        resource_id: { type: 'string', description: 'UUID returned from save_proposal / create_invoice / save_contract' },
        score: { type: 'number', description: 'Confidence between 0.0 (very uncertain) and 1.0 (highly confident)' },
        reasoning: { type: 'string', description: 'Brief explanation: what you used, what was missing, what to double-check.' }
      },
      required: ['resource_type', 'resource_id', 'score', 'reasoning']
    },
    fn: async (args, userId) => {
      const raw = Number(args.score);
      if (!Number.isFinite(raw)) {
        return { success: false, error: `set_confidence requires a finite number 0.0-1.0, got "${args.score}"` };
      }
      const score = Math.max(0, Math.min(1, raw));
      const tableMap = { proposal: 'proposals', invoice: 'invoices', contract: 'contracts' };
      const table = tableMap[args.resource_type];
      if (!table) return { success: false, error: 'Invalid resource_type' };
      const row = await db.one(
        `UPDATE ${table} SET confidence = $1 WHERE id = $2 AND user_id = $3 RETURNING id, status, confidence`,
        [score, args.resource_id, userId]
      );
      if (!row) return { success: false, error: `${args.resource_type} not found` };
      return { success: true, data: { ...row, reasoning: args.reasoning, requires_review: score < 0.7 } };
    }
  },

  // === MEMORY LAYER ===
  // Cap memory reads at 10 facts × 120 char values to keep prompts tight.
  // Agent writes always land as status='pending', source='agent' — owner
  // promotes via the Memory Drawer UI. Read endpoints return only confirmed
  // facts so unverified pattern guesses never leak back into agent reasoning.
  read_client_memory: {
    name: 'read_client_memory',
    description: 'Recall confirmed facts about a client (payment preferences, communication tone, past red flags, pricing history). Use BEFORE drafting to personalize. Returns up to 10 most recent confirmed facts.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Client UUID (from get_project_context)' },
        category: { type: 'string', enum: ['payment_pref', 'comm_tone', 'red_flag', 'pricing_history', 'other'], description: 'Optional filter to one category' }
      },
      required: ['client_id']
    },
    fn: async (args, userId) => {
      const params = [userId, args.client_id];
      let sql = `SELECT category, key, LEFT(value, 120) AS value, confidence
                   FROM client_memory
                  WHERE user_id = $1 AND client_id = $2 AND status = 'confirmed'`;
      if (args.category) { params.push(args.category); sql += ` AND category = $${params.length}`; }
      sql += ' ORDER BY updated_at DESC LIMIT 10';
      const rows = await db.many(sql, params);
      return { success: true, data: { facts: rows, count: rows.length } };
    }
  },

  write_client_memory: {
    name: 'write_client_memory',
    description: 'Record a new pattern about a client. Lands as PENDING for owner review — never auto-applied. Use sparingly: one fact per call, only when you observe something that would change future behavior (e.g., "prefers net-15", "asks for revisions late", "approved $3600 change order").',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Client UUID' },
        category: { type: 'string', enum: ['payment_pref', 'comm_tone', 'red_flag', 'pricing_history', 'other'] },
        key: { type: 'string', description: 'Short identifier, e.g. "preferred_terms" or "scope_creep_pattern"' },
        value: { type: 'string', description: 'The fact in one sentence (≤120 chars stored)' },
        confidence: { type: 'number', description: '0.0-1.0 — how sure are you?' }
      },
      required: ['client_id', 'category', 'key', 'value']
    },
    fn: async (args, userId) => {
      const value = String(args.value || '').slice(0, 120);
      const conf = Number.isFinite(Number(args.confidence)) ? Math.max(0, Math.min(1, Number(args.confidence))) : null;
      // Upsert by (user_id, client_id, category, key) — keeps the table from
      // accumulating duplicate guesses about the same fact. Repeated agent
      // observations refresh updated_at and confidence but stay pending.
      const row = await db.one(
        `INSERT INTO client_memory (user_id, client_id, category, key, value, confidence, source, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'agent', 'pending')
         ON CONFLICT (user_id, client_id, category, key)
         DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, updated_at = now()
         RETURNING id, status`,
        [userId, args.client_id, args.category, args.key, value, conf]
      );
      return { success: true, data: { ...row, awaiting_owner_review: true } };
    }
  },

  read_workspace_memory: {
    name: 'read_workspace_memory',
    description: 'Recall confirmed workspace-wide patterns (your default rates, contract preferences, common red flags across all clients). Returns up to 10 most recent confirmed facts.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['payment_pref', 'comm_tone', 'red_flag', 'pricing_history', 'other'] }
      },
      required: []
    },
    fn: async (args, userId) => {
      const params = [userId];
      let sql = `SELECT category, key, LEFT(value, 120) AS value, confidence
                   FROM workspace_memory
                  WHERE user_id = $1 AND status = 'confirmed'`;
      if (args.category) { params.push(args.category); sql += ` AND category = $${params.length}`; }
      sql += ' ORDER BY updated_at DESC LIMIT 10';
      const rows = await db.many(sql, params);
      return { success: true, data: { facts: rows, count: rows.length } };
    }
  },

  write_workspace_memory: {
    name: 'write_workspace_memory',
    description: 'Record a workspace-wide pattern (applies across all clients). Lands as PENDING for owner review.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['payment_pref', 'comm_tone', 'red_flag', 'pricing_history', 'other'] },
        key: { type: 'string' },
        value: { type: 'string' },
        confidence: { type: 'number' }
      },
      required: ['category', 'key', 'value']
    },
    fn: async (args, userId) => {
      const value = String(args.value || '').slice(0, 120);
      const conf = Number.isFinite(Number(args.confidence)) ? Math.max(0, Math.min(1, Number(args.confidence))) : null;
      const row = await db.one(
        `INSERT INTO workspace_memory (user_id, category, key, value, confidence, source, status)
         VALUES ($1, $2, $3, $4, $5, 'agent', 'pending')
         ON CONFLICT (user_id, category, key)
         DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, updated_at = now()
         RETURNING id, status`,
        [userId, args.category, args.key, value, conf]
      );
      return { success: true, data: { ...row, awaiting_owner_review: true } };
    }
  },

  // === SCOPE GUARDIAN TOOLS ===
  get_contract_scope: {
    name: 'get_contract_scope',
    description: 'Get the contracted scope and past scope events for a project.',
    input_schema: {
      type: 'object',
      properties: { project_id: { type: 'string', description: 'Project UUID' } },
      required: ['project_id']
    },
    fn: async (args, userId) => {
      const [project, contract, events] = await Promise.all([
        db.one('SELECT scope_summary, budget_cents FROM projects WHERE id = $1 AND user_id = $2', [args.project_id, userId]),
        db.one('SELECT content FROM contracts WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1', [args.project_id, userId]),
        db.many('SELECT event_type, description, estimated_hours, estimated_cost_cents, created_at FROM scope_events WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 5', [args.project_id, userId])
      ]);
      return { success: true, data: { scope_summary: project?.scope_summary, budget_cents: project?.budget_cents, contract_scope: contract?.content?.scope, past_events: events } };
    }
  },

  calculate_change_order: {
    name: 'calculate_change_order',
    description: 'Calculate cost for out-of-scope work based on hours and freelancer rate.',
    input_schema: {
      type: 'object',
      properties: {
        estimated_hours: { type: 'number', description: 'Estimated additional hours' },
        description: { type: 'string', description: 'What the extra work entails' }
      },
      required: ['estimated_hours', 'description']
    },
    fn: async (args, userId) => {
      const user = await db.one('SELECT hourly_rate_cents, name FROM users WHERE id = $1', [userId]);
      const rate = user?.hourly_rate_cents || 10000;
      const cost = Math.round(args.estimated_hours * rate);
      return { success: true, data: { description: args.description, estimated_hours: args.estimated_hours, rate_cents: rate, total_cents: cost, formatted: `$${(cost / 100).toFixed(2)}` } };
    }
  },

  log_scope_event: {
    name: 'log_scope_event',
    description: 'Log a scope event (request, flag, change_order, approved, rejected).',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project UUID' },
        event_type: { type: 'string', enum: ['request', 'flag', 'change_order', 'approved', 'rejected'] },
        description: { type: 'string' },
        estimated_hours: { type: 'number' },
        estimated_cost_cents: { type: 'number' },
        ai_analysis: { type: 'object' }
      },
      required: ['project_id', 'event_type', 'description']
    },
    fn: async (args, userId) => {
      const row = await db.one(
        `INSERT INTO scope_events (project_id, user_id, event_type, description, estimated_hours, estimated_cost_cents, ai_analysis)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
        [args.project_id, userId, args.event_type, args.description, args.estimated_hours || null, args.estimated_cost_cents || null, args.ai_analysis ? JSON.stringify(args.ai_analysis) : null]
      );
      return { success: true, data: row };
    }
  },

  // === INSIGHT TOOLS ===
  get_revenue_data: {
    name: 'get_revenue_data',
    description: 'Get revenue summary: total invoiced, total paid, outstanding, by period.',
    input_schema: {
      type: 'object',
      properties: { period_days: { type: 'number', description: 'Look-back period in days', default: 30 } },
      required: []
    },
    fn: async (args, userId) => {
      const days = args.period_days || 30;
      const stats = await db.one(
        `SELECT
           COALESCE(SUM(total_cents) FILTER (WHERE status = 'paid'), 0) AS paid_cents,
           COALESCE(SUM(total_cents) FILTER (WHERE status IN ('sent','overdue')), 0) AS outstanding_cents,
           COALESCE(SUM(total_cents), 0) AS total_cents,
           COUNT(*) AS invoice_count
         FROM invoices WHERE user_id = $1 AND created_at > now() - ($2 || ' days')::interval`,
        [userId, days]
      );
      return { success: true, data: stats };
    }
  },

  get_overdue_invoices: {
    name: 'get_overdue_invoices',
    description: 'Get all overdue invoices with client details.',
    input_schema: { type: 'object', properties: {}, required: [] },
    fn: async (_args, userId) => {
      const invoices = await db.many(
        `SELECT i.id, i.total_cents, i.due_date, i.created_at, p.name AS project_name, c.name AS client_name, c.email AS client_email
         FROM invoices i
         JOIN projects p ON i.project_id = p.id
         LEFT JOIN clients c ON p.client_id = c.id
         WHERE i.user_id = $1 AND (i.status = 'overdue' OR (i.status = 'sent' AND i.due_date < CURRENT_DATE))
         ORDER BY i.due_date ASC`,
        [userId]
      );
      return { success: true, data: invoices };
    }
  },

  get_project_pipeline: {
    name: 'get_project_pipeline',
    description: 'Get active project pipeline with budget totals and status breakdown.',
    input_schema: { type: 'object', properties: {}, required: [] },
    fn: async (_args, userId) => {
      const projects = await db.many(
        `SELECT p.id, p.name, p.status, p.budget_cents, p.start_date, p.end_date, c.name AS client_name,
           (SELECT COUNT(*) FROM invoices WHERE project_id = p.id AND status = 'paid') AS paid_invoices,
           (SELECT COALESCE(SUM(total_cents), 0) FROM invoices WHERE project_id = p.id AND status = 'paid') AS collected_cents
         FROM projects p LEFT JOIN clients c ON p.client_id = c.id
         WHERE p.user_id = $1 AND p.status = 'active'
         ORDER BY p.created_at DESC`,
        [userId]
      );
      const total_pipeline = projects.reduce((sum, p) => sum + (p.budget_cents || 0), 0);
      return { success: true, data: { projects, total_pipeline_cents: total_pipeline, active_count: projects.length } };
    }
  }
};

// Build tool map and export
export const TOOL_MAP = new Map(Object.entries(TOOL_DEFS));

// Get Claude-format tool definitions for a list of tool names
export function getToolDefs(toolNames) {
  return toolNames.map((name) => {
    const tool = TOOL_DEFS[name];
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return { name: tool.name, description: tool.description, input_schema: tool.input_schema };
  });
}

// Execute a tool by name
export async function executeTool(name, args, userId) {
  const tool = TOOL_MAP.get(name);
  if (!tool) return { success: false, error: `Unknown tool: ${name}` };
  try {
    return await tool.fn(args, userId);
  } catch (err) {
    return { success: false, error: err.message };
  }
}
