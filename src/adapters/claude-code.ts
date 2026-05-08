/**
 * Claude Code Adapter
 * Specific handling for Anthropic Claude Code sessions
 */

import { AgentEvent } from "../types/index.js";

/**
 * Claude Code provides rich structured output:
 * - Tool call boundaries
 * - Command approvals
 * - File edits with context
 * - Transcript mapping
 */
export class ClaudeCodeAdapter {
  private currentToolCall?: string;
  private edits: Array<{ path: string; description?: string }> = [];

  /**
   * Parse Claude Code output
   */
  parseOutput(line: string): AgentEvent | null {
    // Detect tool call boundaries
    const toolStart = line.match(/\[Tool:\s*([\w_]+)\]/);
    if (toolStart) {
      this.currentToolCall = toolStart[1];
      return {
        ts: new Date().toISOString(),
        type: "process.exec",
        runId: "",
        toolName: this.currentToolCall,
        agent: "claude-code",
      };
    }

    // Detect FileRead
    if (line.includes("I'll read")) {
      const fileMatch = line.match(/read\s+([\w/.-]+)/);
      if (fileMatch) {
        return {
          ts: new Date().toISOString(),
          type: "file.read",
          runId: "",
          path: fileMatch[1],
          agent: "claude-code",
        };
      }
    }

    // Detect Bash command
    if (line.includes("I'll run")) {
      const cmdMatch = line.match(/run[:\s]+(.+)/);
      if (cmdMatch) {
        return {
          ts: new Date().toISOString(),
          type: "process.exec",
          runId: "",
          command: cmdMatch[1].trim(),
          agent: "claude-code",
        };
      }
    }

    // Detect file edits
    const editMatch = line.match(/Now I'll (?:update|modify|change|edit)\s+([\w/.-]+)/);
    if (editMatch) {
      this.edits.push({ path: editMatch[1] });
      return {
        ts: new Date().toISOString(),
        type: "file.write",
        runId: "",
        path: editMatch[1],
        agent: "claude-code",
      };
    }

    return null;
  }

  /**
   * Enrich metadata with Claude Code specific info
   */
  enrichMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    return {
      ...metadata,
      claudeCode: {
        edits: this.edits,
        currentTool: this.currentToolCall,
      },
    };
  }
}
