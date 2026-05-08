/**
 * Codex Adapter
 * Specific handling for OpenAI Codex sessions
 */

import { AgentEvent } from "../types/index.js";

/**
 * Codex emits structured output that we can parse:
 * - Session/thread IDs
 * - Command/tool calls
 * - File edits
 * - Diff checkpoints
 */
export class CodexAdapter {
  private currentSessionId?: string;
  private currentThreadId?: string;

  /**
   * Parse Codex-specific output
   */
  parseOutput(line: string): AgentEvent | null {
    // Detect Codex session start
    const sessionMatch = line.match(/Session:\s+([a-zA-Z0-9-]+)/);
    if (sessionMatch) {
      this.currentSessionId = sessionMatch[1];
      return {
        ts: new Date().toISOString(),
        type: "session.start",
        runId: "",
        sessionId: this.currentSessionId,
        agent: "codex",
      };
    }

    // Detect command/tool calls
    const toolCallMatch = line.match(/▶\s+(\w+)\s*\(([^)]*)\)/);
    if (toolCallMatch) {
      return {
        ts: new Date().toISOString(),
        type: "process.exec",
        runId: "",
        toolName: toolCallMatch[1],
        args: toolCallMatch[2].split(",").map(s => s.trim()),
      };
    }

    // Detect file edits
    const fileEditMatch = line.match(/(✓|✗)\s+([\w/.-]+)/);
    if (fileEditMatch) {
      return {
        ts: new Date().toISOString(),
        type: "file.write",
        runId: "",
        path: fileEditMatch[2],
        action: fileEditMatch[1] === "✓" ? "modified" : "error",
      };
    }

    return null;
  }

  /**
   * Enrich metadata with Codex-specific info
   */
  enrichMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    return {
      ...metadata,
      codex: {
        sessionId: this.currentSessionId,
        threadId: this.currentThreadId,
      },
    };
  }
}
