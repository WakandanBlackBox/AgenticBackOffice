// Token budget tracking -- query daily usage from agent_logs, gate expensive operations
import db from '../db.js';

// Default daily token budget per user (configurable via env)
const DAILY_TOKEN_BUDGET = parseInt(process.env.DAILY_TOKEN_BUDGET || '2000000', 10);

// Cost multiplier for chief orchestration (multi-agent = expensive)
const CHIEF_COST_MULTIPLIER = 3;

/**
 * Get today's token usage for a user from agent_logs.
 * Returns { total_input, total_output, total_tokens, call_count, budget_remaining, budget_pct }
 */
export async function getDailyUsage(userId) {
  const row = await db.one(
    `SELECT
       COALESCE(SUM(input_tokens), 0) AS total_input,
       COALESCE(SUM(output_tokens), 0) AS total_output,
       COALESCE(SUM(input_tokens + output_tokens), 0) AS total_tokens,
       COUNT(*) AS call_count
     FROM agent_logs
     WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
    [userId]
  );

  const totalTokens = parseInt(row.total_tokens, 10);
  return {
    total_input: parseInt(row.total_input, 10),
    total_output: parseInt(row.total_output, 10),
    total_tokens: totalTokens,
    call_count: parseInt(row.call_count, 10),
    budget_remaining: Math.max(0, DAILY_TOKEN_BUDGET - totalTokens),
    budget_pct: Math.min(100, Math.round((totalTokens / DAILY_TOKEN_BUDGET) * 100)),
    budget_limit: DAILY_TOKEN_BUDGET
  };
}

/**
 * Check if user has enough budget for an agent call.
 * Chief calls are weighted higher since they spawn sub-agents.
 * Returns { allowed, usage, reason }
 */
export async function checkBudget(userId, agentId) {
  const usage = await getDailyUsage(userId);

  // Estimate cost of this call based on agent type
  const estimatedTokens = agentId === 'chief' ? 15000 * CHIEF_COST_MULTIPLIER : 5000;

  if (usage.budget_remaining < estimatedTokens) {
    return {
      allowed: false,
      usage,
      reason: `Daily token budget ${usage.budget_pct}% used (${usage.total_tokens.toLocaleString()}/${DAILY_TOKEN_BUDGET.toLocaleString()}). Try again tomorrow or contact support.`
    };
  }

  return { allowed: true, usage };
}
