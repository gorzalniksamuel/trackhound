/**
 * OpenClaw Adapter
 * Specific handling for OpenClaw sessions
 */

import { AgentEvent } from "../types/index.js";

/**
 * OpenClaw can delegate to coding agents and has structured task metadata.
 * We need to:
 * - Detect delegated coding-agent subprocesses
 * - Split trace by sub-agent/task
 * - Record task metadata from chat triggers
 */
export class OpenClawAdapter {
  private currentTaskId?: string;
  private currentSessionKey?: string;
  private agentStack: Array<{ agent: string; taskId: string }> = [];

  /**
   * Parse OpenClaw output
   */
  parseOutput(line: string): AgentEvent | null {
    // Detect OpenClaw session/task
    const taskMatch = line.match(/OpenClaw\s+Session:\s+([a-zA-Z0-9-_]+)/i);
    if (taskMatch) {
      this.currentTaskId = taskMatch[1];
      this.agentStack.push({ agent: "openclaw", taskId: taskMatch[1] });
      
      return {
        ts: new Date().toISOString(),
        type: "session.start",
        runId: "",
        sessionId: taskMatch[1],
        agent: "openclaw",
      };
    }

    // Detect coding-agent delegation
    const delegateMatch = line.match(/(coding-agent|coding_agent|code-agent|code_agent)\s+(\w+)/i);
    if (delegateMatch) {
      const subAgent = delegateMatch[2];
      const delegatedTaskId = `delegated-${Date.now()}`;
      
      this.agentStack.push({ agent: subAgent, taskId: delegatedTaskId });
      
      return {
        ts: new Date().toISOString(),
        type: "process.exec",
        runId: "",
        action: "delegate",
        parentAgent: "openclaw",
        childAgent: subAgent,
        taskId: delegatedTaskId,
      };
    }

    // Detect Pi planning
    const piMatch = line.match(/Pi\s+(?:planned|planning|thinks|analyzing)/i);
    if (piMatch) {
      return {
        ts: new Date().toISOString(),
        type: "process.exec",
        runId: "",
        toolName: "pi-plan",
        agent: "pi",
      };
    }

    // Detect Codex subprocess
    const codexSubMatch = line.match(/(codex|claude|opencode)\s+(?:subprocess|spawning|running)/i);
    if (codexSubMatch) {
      const agentName = codexSubMatch[1].toLowerCase();
      return {
        ts: new Date().toISOString(),
        type: "process.exec",
        runId: "",
        action: "subprocess",
        agent: agentName,
        parent: "openclaw",
      };
    }

    // Detect Vercel/Netlify deploy
    const deployMatch = line.match(/(vercel|netlify|deploy)\s+(?:preview|production|deployed)/i);
    if (deployMatch) {
      return {
        ts: new Date().toISOString(),
        type: "process.exec",
        runId: "",
        action: "deploy",
        platform: deployMatch[1].toLowerCase(),
      };
    }

    // Detect GitHub PR creation
    const prMatch = line.match(/(pr|pull request|opened PR)\s+(?:#?\d+)?/i);
    if (prMatch) {
      return {
        ts: new Date().toISOString(),
        type: "git.commit",
        runId: "",
        action: "pr-created",
      };
    }

    return null;
  }

  /**
   * Get the current agent hierarchy
   */
  getAgentTree() {
    return [...this.agentStack];
  }

  /**
   * Enrich metadata with OpenClaw-specific info
   */
  enrichMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    return {
      ...metadata,
      openclaw: {
        taskId: this.currentTaskId,
        sessionKey: this.currentSessionKey,
        agentTree: this.getAgentTree(),
      },
    };
  }
}
