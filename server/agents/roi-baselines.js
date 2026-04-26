// Per-agent baseline minutes — what the equivalent manual task takes a
// freelancer if done by hand. Conservative estimates from FreelancersUnion
// 2024 survey + internal time-tracking patterns. Used by the ROI endpoint
// to compute "hours saved" — labelled as an estimate in the UI.
//
// Insight and Chief have 0 baseline because they're synthesis/orchestration
// — no equivalent manual task to credit.
export const AGENT_BASELINE_MINUTES = {
  proposal: 45,
  invoice: 10,
  contract: 30,
  scope_guardian: 15,
  client_comms: 10,
  insight: 0,
  chief: 0
};
