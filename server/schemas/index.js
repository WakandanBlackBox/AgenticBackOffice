import { z } from 'zod';

// Auth
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  business_name: z.string().optional(),
  hourly_rate_cents: z.number().int().positive().optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Clients
export const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  company: z.string().optional(),
  notes: z.string().optional()
});

export const updateClientSchema = createClientSchema.partial();

// Projects
export const createProjectSchema = z.object({
  client_id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  budget_cents: z.number().int().positive().optional(),
  scope_summary: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional()
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional()
});

// Agent triggers
export const generateProposalSchema = z.object({
  project_id: z.string().uuid(),
  instructions: z.string().min(1),
  tone: z.enum(['professional', 'casual', 'technical']).default('professional')
});

export const generateInvoiceSchema = z.object({
  project_id: z.string().uuid(),
  instructions: z.string().optional(),
  due_days: z.number().int().positive().default(30)
});

export const generateContractSchema = z.object({
  project_id: z.string().uuid(),
  instructions: z.string().optional()
});

export const analyzeScopeSchema = z.object({
  project_id: z.string().uuid(),
  request_description: z.string().min(1)
});

export const generateInsightSchema = z.object({
  period: z.enum(['week', 'month', 'quarter']).default('month')
});

// Chat
export const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  // .nullish() = accepts undefined OR null. The client sends project_id: null
  // when "All projects" is selected (no specific project context); .optional()
  // alone rejects null and 400s the request.
  project_id: z.string().uuid().nullish()
});

// Milestones
export const createMilestoneSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  amount_cents: z.number().int().nonnegative().optional(),
  approval_type: z.enum(['auto', 'approval_needed']).default('approval_needed'),
  position: z.number().int().nonnegative()
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  amount_cents: z.number().int().nonnegative().optional(),
  approval_type: z.enum(['auto', 'approval_needed']).optional(),
  position: z.number().int().nonnegative().optional()
});

export const rejectMilestoneSchema = z.object({
  reason: z.string().min(1).max(500)
});

// Document PATCH schemas. Status enums mirror the post-migration CHECK
// constraints in server/schema.sql. The drift snapshot test (Phase 2) will
// catch any divergence.
export const updateProposalSchema = z.object({
  status: z.enum(['draft', 'pending_approval', 'sent', 'accepted', 'rejected']).optional(),
  content: z.record(z.any()).optional()
}).strict();

export const updateInvoiceSchema = z.object({
  status: z.enum(['draft', 'pending_approval', 'sent', 'paid', 'overdue']).optional(),
  line_items: z.array(z.any()).optional(),
  total_cents: z.number().int().nonnegative().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}).strict();

export const updateContractSchema = z.object({
  status: z.enum(['draft', 'pending_approval', 'sent', 'signed']).optional(),
  content: z.record(z.any()).optional()
}).strict();

// Share tokens
export const createShareTokenSchema = z.object({
  project_id: z.string().uuid(),
  client_name: z.string().optional(),
  expires_days: z.number().int().positive().default(30)
});
