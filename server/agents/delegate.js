// Meta-tool for Chief Agent to delegate tasks to sub-agents
// Uses late binding (setRunAgent) to avoid circular dependency with dispatcher.js

let _runAgent = null;

export function setRunAgent(fn) {
  _runAgent = fn;
}

export const DELEGATE_TOOL_DEF = {
  name: 'delegate_to_agent',
  description: 'Delegate a task to a specialist sub-agent. Returns the agent\'s full text response. Use this to ask the proposal, invoice, contract, scope_guardian, or insight agent to perform work.',
  input_schema: {
    type: 'object',
    properties: {
      agent_id: {
        type: 'string',
        enum: ['proposal', 'invoice', 'contract', 'scope_guardian', 'insight'],
        description: 'Which specialist agent to delegate to.'
      },
      message: {
        type: 'string',
        description: 'The task/instruction to send to the agent. Be specific and include all necessary context (project IDs, client details, requirements).'
      },
      project_id: {
        type: 'string',
        description: 'Optional project UUID for context.'
      }
    },
    required: ['agent_id', 'message']
  }
};

export async function executeDelegation(args, userId, parentAgentId, yieldEvent, depth, fallbackProjectId) {
  if (!_runAgent) throw new Error('delegate_to_agent: runAgent not initialized');

  const { agent_id, message, project_id } = args;

  // Guard: prevent delegating to chief
  if (agent_id === 'chief') {
    return { success: false, error: 'Cannot delegate to the chief agent.' };
  }

  const textParts = [];

  try {
    yieldEvent({ type: 'delegation_start', agent: agent_id, parent: parentAgentId });

    const subGen = _runAgent(agent_id, userId, message, project_id || fallbackProjectId || null, { depth: depth + 1 });
    for await (const chunk of subGen) {
      // Forward sub-agent events to client with delegation context
      yieldEvent({ ...chunk, delegated_by: parentAgentId });
      if (chunk.type === 'text') {
        textParts.push(chunk.content);
      }
    }

    yieldEvent({ type: 'delegation_complete', agent: agent_id, parent: parentAgentId });
  } catch (err) {
    return { success: false, error: `Agent "${agent_id}" failed: ${err.message}` };
  }

  // Truncate response to avoid filling the Chief's context window
  const fullResponse = textParts.join('');
  const maxChars = 3000;
  const response = fullResponse.length > maxChars
    ? fullResponse.slice(0, maxChars) + '\n\n[Response truncated -- full content was streamed to user and saved to database]'
    : fullResponse;

  return {
    success: true,
    data: {
      agent_id,
      response
    }
  };
}
