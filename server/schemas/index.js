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
  project_id: z.string().uuid().optional()
});
