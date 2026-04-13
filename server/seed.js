import bcrypt from 'bcryptjs';
import db from './db.js';

async function seed() {
  console.log('Seeding demo data...');

  // Clean slate -- drop existing demo data to avoid duplicates
  const existing = await db.one(`SELECT id FROM users WHERE email = 'demo@backoffice.ai'`);
  if (existing) {
    await db.query(`DELETE FROM users WHERE id = $1`, [existing.id]);
    console.log('Cleaned previous demo data.');
  }

  // Demo user
  const hash = await bcrypt.hash('demo1234', 12);
  const user = await db.one(
    `INSERT INTO users (email, password_hash, name, business_name, hourly_rate_cents)
     VALUES ('demo@backoffice.ai', $1, 'Alex Rivera', 'Rivera Digital Studio', 15000)
     RETURNING id`, [hash]
  );
  const uid = user.id;

  // ── Clients ────────────────────────────────────────────────────
  const [sarah, marcus, priya] = await Promise.all([
    db.one(`INSERT INTO clients (user_id, name, email, company, notes) VALUES ($1, 'Sarah Chen', 'sarah@acmecorp.com', 'Acme Corp', 'Enterprise client, fast payer') RETURNING id`, [uid]),
    db.one(`INSERT INTO clients (user_id, name, email, company, notes) VALUES ($1, 'Marcus Johnson', 'marcus@startupx.io', 'StartupX', 'Startup, watch for scope creep') RETURNING id`, [uid]),
    db.one(`INSERT INTO clients (user_id, name, email, company, notes) VALUES ($1, 'Priya Patel', 'priya@designhub.co', 'DesignHub', 'Agency partner, recurring work') RETURNING id`, [uid]),
  ]);

  // ── Projects ───────────────────────────────────────────────────
  const [acmeBrand, startupMVP, designHub, acmeQ1] = await Promise.all([
    db.one(
      `INSERT INTO projects (user_id, client_id, name, description, status, budget_cents, scope_summary, start_date, end_date)
       VALUES ($1, $2, 'Acme Brand Redesign', 'Full brand identity overhaul including logo, brand guidelines, and website refresh', 'active', 1500000, 'Logo design (3 concepts), brand guidelines document, website homepage redesign, social media templates (5)', '2026-04-01', '2026-05-15')
       RETURNING id`, [uid, sarah.id]
    ),
    db.one(
      `INSERT INTO projects (user_id, client_id, name, description, status, budget_cents, scope_summary, start_date, end_date)
       VALUES ($1, $2, 'StartupX MVP Dashboard', 'React dashboard for their analytics platform', 'active', 2400000, 'Dashboard with 4 views: overview, analytics, users, settings. 8 chart components. Auth integration. Mobile responsive.', '2026-03-15', '2026-05-01')
       RETURNING id`, [uid, marcus.id]
    ),
    db.one(
      `INSERT INTO projects (user_id, client_id, name, description, status, budget_cents, scope_summary, start_date, end_date)
       VALUES ($1, $2, 'DesignHub Website Refresh', 'Refresh their portfolio site with new case studies', 'active', 800000, 'Homepage redesign, 6 case study pages, contact form, SEO optimization', '2026-04-05', '2026-04-25')
       RETURNING id`, [uid, priya.id]
    ),
    db.one(
      `INSERT INTO projects (user_id, client_id, name, description, status, budget_cents, start_date, end_date)
       VALUES ($1, $2, 'Acme Q1 Marketing Site', 'Landing pages for Q1 campaign', 'completed', 600000, '2026-01-10', '2026-02-28')
       RETURNING id`, [uid, sarah.id]
    ),
  ]);

  // ── Proposals ──────────────────────────────────────────────────
  await db.query(
    `INSERT INTO proposals (project_id, user_id, content, status) VALUES ($1, $2, $3, 'accepted')`,
    [acmeBrand.id, uid, JSON.stringify({
      title: 'Acme Brand Redesign Proposal',
      sections: [
        { title: 'Overview', body: 'Complete brand identity redesign for Acme Corp, modernizing their visual presence across all touchpoints.' },
        { title: 'Deliverables', body: '1. Logo design (3 initial concepts, 2 rounds of revision)\n2. Brand guidelines (40+ pages)\n3. Website homepage redesign\n4. Social media template kit (5 templates)' },
        { title: 'Timeline', body: 'Week 1-2: Discovery & research\nWeek 3-4: Concept development\nWeek 5: Revisions\nWeek 6: Final delivery' }
      ],
      pricing: { total_cents: 1500000, breakdown: [{ item: 'Brand Identity', cents: 800000 }, { item: 'Website Redesign', cents: 500000 }, { item: 'Social Templates', cents: 200000 }] }
    })]
  );

  // ── Invoices ───────────────────────────────────────────────────
  await Promise.all([
    db.query(
      `INSERT INTO invoices (project_id, user_id, line_items, total_cents, status, due_date) VALUES ($1, $2, $3, 750000, 'paid', '2026-04-15')`,
      [acmeBrand.id, uid, JSON.stringify([{ description: '50% deposit - Brand Redesign', qty: 1, rate_cents: 750000 }])]
    ),
    db.query(
      `INSERT INTO invoices (project_id, user_id, line_items, total_cents, status, due_date) VALUES ($1, $2, $3, 1200000, 'sent', '2026-04-20')`,
      [startupMVP.id, uid, JSON.stringify([{ description: 'MVP Dashboard - Phase 1', qty: 1, rate_cents: 1200000 }])]
    ),
    db.query(
      `INSERT INTO invoices (project_id, user_id, line_items, total_cents, status, due_date) VALUES ($1, $2, $3, 400000, 'overdue', '2026-03-25')`,
      [startupMVP.id, uid, JSON.stringify([{ description: 'MVP Dashboard - Discovery Phase', qty: 1, rate_cents: 400000 }])]
    ),
    db.query(
      `INSERT INTO invoices (project_id, user_id, line_items, total_cents, status, due_date) VALUES ($1, $2, $3, 600000, 'paid', '2026-02-28')`,
      [acmeQ1.id, uid, JSON.stringify([{ description: 'Q1 Marketing Site - Full payment', qty: 1, rate_cents: 600000 }])]
    ),
  ]);

  // ── Contracts ──────────────────────────────────────────────────
  await db.query(
    `INSERT INTO contracts (project_id, user_id, content, status) VALUES ($1, $2, $3, 'signed')`,
    [acmeBrand.id, uid, JSON.stringify({
      clauses: [
        { title: 'Scope of Work', body: 'Logo design (3 concepts), brand guidelines, website homepage redesign, social media templates (5)' },
        { title: 'Payment Terms', body: '50% upfront, 50% on delivery. Net 15.' },
        { title: 'Revisions', body: '2 rounds of revisions included. Additional revisions at $150/hr.' },
        { title: 'IP Transfer', body: 'Full IP transfer upon final payment.' },
        { title: 'Termination', body: 'Either party may terminate with 14 days written notice. Work completed to date will be invoiced.' }
      ]
    })]
  );

  // ── Scope Events ───────────────────────────────────────────────
  await Promise.all([
    db.query(
      `INSERT INTO scope_events (project_id, user_id, event_type, description, estimated_hours, estimated_cost_cents, ai_analysis)
       VALUES ($1, $2, 'flag', 'Client requested animated logo variations -- not in original scope', 12, 180000, $3)`,
      [acmeBrand.id, uid, JSON.stringify({ verdict: 'out_of_scope', confidence: 0.95, reasoning: 'Original scope specifies static logo with 3 concepts. Animation was not included.' })]
    ),
    db.query(
      `INSERT INTO scope_events (project_id, user_id, event_type, description, estimated_hours, estimated_cost_cents, ai_analysis)
       VALUES ($1, $2, 'flag', 'Client wants to add a user onboarding flow -- 3 new screens not in original spec', 24, 360000, $3)`,
      [startupMVP.id, uid, JSON.stringify({ verdict: 'out_of_scope', confidence: 0.92, reasoning: 'Original scope covers 4 views (overview, analytics, users, settings). Onboarding flow is a new feature.' })]
    ),
    db.query(
      `INSERT INTO scope_events (project_id, user_id, event_type, description, estimated_cost_cents)
       VALUES ($1, $2, 'change_order', 'Change order approved for onboarding flow addition', 360000)`,
      [startupMVP.id, uid]
    ),
  ]);

  // ── Milestones ─────────────────────────────────────────────────
  // Acme Brand Redesign: mixed states to show the full lifecycle
  await Promise.all([
    db.query(
      `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, position, approval_type, status, completed_at, approved_at)
       VALUES ($1, $2, 'Discovery & Research', 'Client interviews, competitor analysis, mood boards', 300000, 0, 'approval_needed', 'approved', now() - interval '10 days', now() - interval '9 days')`,
      [acmeBrand.id, uid]
    ),
    db.query(
      `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, position, approval_type, status, completed_at, approved_at)
       VALUES ($1, $2, 'Logo Concepts', '3 initial logo concepts with rationale', 400000, 1, 'approval_needed', 'approved', now() - interval '5 days', now() - interval '4 days')`,
      [acmeBrand.id, uid]
    ),
    db.query(
      `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, position, approval_type, status)
       VALUES ($1, $2, 'Brand Guidelines', '40+ page brand standards document', 400000, 2, 'approval_needed', 'active')`,
      [acmeBrand.id, uid]
    ),
    db.query(
      `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, position, approval_type, status)
       VALUES ($1, $2, 'Website Redesign', 'Homepage redesign with brand integration', 300000, 3, 'approval_needed', 'pending')`,
      [acmeBrand.id, uid]
    ),
    db.query(
      `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, position, approval_type, status)
       VALUES ($1, $2, 'Final Delivery', 'Social templates, asset handoff, revisions', 100000, 4, 'auto', 'pending')`,
      [acmeBrand.id, uid]
    ),
  ]);

  // StartupX MVP: earlier stages
  await Promise.all([
    db.query(
      `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, position, approval_type, status, completed_at, approved_at)
       VALUES ($1, $2, 'Wireframes & Architecture', 'Component architecture, data flow diagrams, wireframes for all 4 views', 600000, 0, 'approval_needed', 'approved', now() - interval '14 days', now() - interval '13 days')`,
      [startupMVP.id, uid]
    ),
    db.query(
      `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, position, approval_type, status)
       VALUES ($1, $2, 'Core Dashboard Build', 'Overview and analytics views with chart components', 800000, 1, 'approval_needed', 'active')`,
      [startupMVP.id, uid]
    ),
    db.query(
      `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, position, approval_type, status)
       VALUES ($1, $2, 'User Management & Settings', 'User list, settings panel, auth integration', 600000, 2, 'approval_needed', 'pending')`,
      [startupMVP.id, uid]
    ),
    db.query(
      `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, position, approval_type, status)
       VALUES ($1, $2, 'QA & Launch', 'Testing, mobile responsive fixes, deployment', 400000, 3, 'auto', 'pending')`,
      [startupMVP.id, uid]
    ),
  ]);

  // DesignHub: fresh project with pending milestones
  await Promise.all([
    db.query(
      `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, position, approval_type, status)
       VALUES ($1, $2, 'Homepage Redesign', 'New homepage with updated portfolio showcase', 300000, 0, 'approval_needed', 'active')`,
      [designHub.id, uid]
    ),
    db.query(
      `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, position, approval_type, status)
       VALUES ($1, $2, 'Case Study Pages', '6 detailed case study pages with rich media', 300000, 1, 'approval_needed', 'pending')`,
      [designHub.id, uid]
    ),
    db.query(
      `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, position, approval_type, status)
       VALUES ($1, $2, 'SEO & Launch', 'SEO optimization, contact form, final QA', 200000, 2, 'auto', 'pending')`,
      [designHub.id, uid]
    ),
  ]);

  console.log('Seed complete.');
  console.log('Login: demo@backoffice.ai / demo1234');
  console.log('');
  console.log('Demo data summary:');
  console.log('  3 clients (Sarah Chen, Marcus Johnson, Priya Patel)');
  console.log('  4 projects (3 active, 1 completed)');
  console.log('  12 milestones across 3 projects (varied states)');
  console.log('  1 proposal (accepted), 1 contract (signed)');
  console.log('  4 invoices (2 paid, 1 sent, 1 overdue)');
  console.log('  3 scope events (2 flags, 1 change order)');
  await db.pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
