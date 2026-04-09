import bcrypt from 'bcryptjs';
import db from './db.js';

async function seed() {
  console.log('Seeding demo data...');

  // Demo user
  const hash = await bcrypt.hash('demo1234', 12);
  const user = await db.one(
    `INSERT INTO users (email, password_hash, name, business_name, hourly_rate_cents)
     VALUES ('demo@backoffice.ai', $1, 'Alex Rivera', 'Rivera Digital Studio', 15000)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`, [hash]
  );
  const uid = user.id;

  // Clients
  const clients = await Promise.all([
    db.one(`INSERT INTO clients (user_id, name, email, company, notes) VALUES ($1, 'Sarah Chen', 'sarah@acmecorp.com', 'Acme Corp', 'Enterprise client, fast payer') RETURNING id`, [uid]),
    db.one(`INSERT INTO clients (user_id, name, email, company, notes) VALUES ($1, 'Marcus Johnson', 'marcus@startupx.io', 'StartupX', 'Startup, watch for scope creep') RETURNING id`, [uid]),
    db.one(`INSERT INTO clients (user_id, name, email, company, notes) VALUES ($1, 'Priya Patel', 'priya@designhub.co', 'DesignHub', 'Agency partner, recurring work') RETURNING id`, [uid]),
  ]);

  // Projects
  const projects = await Promise.all([
    db.one(
      `INSERT INTO projects (user_id, client_id, name, description, status, budget_cents, scope_summary, start_date, end_date)
       VALUES ($1, $2, 'Acme Brand Redesign', 'Full brand identity overhaul including logo, brand guidelines, and website refresh', 'active', 1500000, 'Logo design (3 concepts), brand guidelines document, website homepage redesign, social media templates (5)', '2026-04-01', '2026-05-15')
       RETURNING id`, [uid, clients[0].id]
    ),
    db.one(
      `INSERT INTO projects (user_id, client_id, name, description, status, budget_cents, scope_summary, start_date, end_date)
       VALUES ($1, $2, 'StartupX MVP Dashboard', 'React dashboard for their analytics platform', 'active', 2400000, 'Dashboard with 4 views: overview, analytics, users, settings. 8 chart components. Auth integration. Mobile responsive.', '2026-03-15', '2026-05-01')
       RETURNING id`, [uid, clients[1].id]
    ),
    db.one(
      `INSERT INTO projects (user_id, client_id, name, description, status, budget_cents, scope_summary, start_date, end_date)
       VALUES ($1, $2, 'DesignHub Website Refresh', 'Refresh their portfolio site with new case studies', 'active', 800000, 'Homepage redesign, 6 case study pages, contact form, SEO optimization', '2026-04-05', '2026-04-25')
       RETURNING id`, [uid, clients[2].id]
    ),
    db.one(
      `INSERT INTO projects (user_id, client_id, name, description, status, budget_cents, start_date, end_date)
       VALUES ($1, $2, 'Acme Q1 Marketing Site', 'Landing pages for Q1 campaign', 'completed', 600000, '2026-01-10', '2026-02-28')
       RETURNING id`, [uid, clients[0].id]
    ),
  ]);

  // Proposals
  await db.query(
    `INSERT INTO proposals (project_id, user_id, content, status) VALUES ($1, $2, $3, 'accepted')`,
    [projects[0].id, uid, JSON.stringify({
      title: 'Acme Brand Redesign Proposal',
      sections: [
        { title: 'Overview', body: 'Complete brand identity redesign for Acme Corp, modernizing their visual presence across all touchpoints.' },
        { title: 'Deliverables', body: '1. Logo design (3 initial concepts, 2 rounds of revision)\n2. Brand guidelines (40+ pages)\n3. Website homepage redesign\n4. Social media template kit (5 templates)' },
        { title: 'Timeline', body: 'Week 1-2: Discovery & research\nWeek 3-4: Concept development\nWeek 5: Revisions\nWeek 6: Final delivery' }
      ],
      pricing: { total_cents: 1500000, breakdown: [{ item: 'Brand Identity', cents: 800000 }, { item: 'Website Redesign', cents: 500000 }, { item: 'Social Templates', cents: 200000 }] }
    })]
  );

  // Invoices
  await Promise.all([
    db.query(
      `INSERT INTO invoices (project_id, user_id, line_items, total_cents, status, due_date) VALUES ($1, $2, $3, 750000, 'paid', '2026-04-15')`,
      [projects[0].id, uid, JSON.stringify([{ description: '50% deposit - Brand Redesign', qty: 1, rate_cents: 750000 }])]
    ),
    db.query(
      `INSERT INTO invoices (project_id, user_id, line_items, total_cents, status, due_date) VALUES ($1, $2, $3, 1200000, 'sent', '2026-04-20')`,
      [projects[1].id, uid, JSON.stringify([{ description: 'MVP Dashboard - Phase 1', qty: 1, rate_cents: 1200000 }])]
    ),
    db.query(
      `INSERT INTO invoices (project_id, user_id, line_items, total_cents, status, due_date) VALUES ($1, $2, $3, 400000, 'overdue', '2026-03-25')`,
      [projects[1].id, uid, JSON.stringify([{ description: 'MVP Dashboard - Discovery Phase', qty: 1, rate_cents: 400000 }])]
    ),
    db.query(
      `INSERT INTO invoices (project_id, user_id, line_items, total_cents, status, due_date) VALUES ($1, $2, $3, 600000, 'paid', '2026-02-28')`,
      [projects[3].id, uid, JSON.stringify([{ description: 'Q1 Marketing Site - Full payment', qty: 1, rate_cents: 600000 }])]
    ),
  ]);

  // Contracts
  await db.query(
    `INSERT INTO contracts (project_id, user_id, content, status) VALUES ($1, $2, $3, 'signed')`,
    [projects[0].id, uid, JSON.stringify({
      clauses: [
        { title: 'Scope of Work', body: 'Logo design (3 concepts), brand guidelines, website homepage redesign, social media templates (5)' },
        { title: 'Payment Terms', body: '50% upfront, 50% on delivery. Net 15.' },
        { title: 'Revisions', body: '2 rounds of revisions included. Additional revisions at $150/hr.' },
        { title: 'IP Transfer', body: 'Full IP transfer upon final payment.' },
        { title: 'Termination', body: 'Either party may terminate with 14 days written notice. Work completed to date will be invoiced.' }
      ]
    })]
  );

  // Scope events -- show the Guardian in action
  await Promise.all([
    db.query(
      `INSERT INTO scope_events (project_id, user_id, event_type, description, estimated_hours, estimated_cost_cents, ai_analysis)
       VALUES ($1, $2, 'flag', 'Client requested animated logo variations -- not in original scope', 12, 180000, $3)`,
      [projects[0].id, uid, JSON.stringify({ verdict: 'out_of_scope', confidence: 0.95, reasoning: 'Original scope specifies static logo with 3 concepts. Animation was not included.' })]
    ),
    db.query(
      `INSERT INTO scope_events (project_id, user_id, event_type, description, estimated_hours, estimated_cost_cents, ai_analysis)
       VALUES ($1, $2, 'flag', 'Client wants to add a user onboarding flow -- 3 new screens not in original spec', 24, 360000, $3)`,
      [projects[1].id, uid, JSON.stringify({ verdict: 'out_of_scope', confidence: 0.92, reasoning: 'Original scope covers 4 views (overview, analytics, users, settings). Onboarding flow is a new feature.' })]
    ),
    db.query(
      `INSERT INTO scope_events (project_id, user_id, event_type, description, estimated_cost_cents)
       VALUES ($1, $2, 'change_order', 'Change order approved for onboarding flow addition', 360000)`,
      [projects[1].id, uid]
    ),
  ]);

  console.log('Seed complete.');
  console.log('Login: demo@backoffice.ai / demo1234');
  await db.pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
