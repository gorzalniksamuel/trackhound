/**
 * Policy Engine
 * Evaluates events against policies and makes decisions
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as yaml from "yaml";
import { 
  Policy, 
  PolicyDecision, 
  AgentEvent,
  FileEvent,
  ProcessEvent,
  NetworkEvent,
} from "../types/index.js";

const DEFAULT_POLICY: Policy = {
  mode: "record",
  secrets: { warn: true },
};

const BLOCKED_COMMANDS = [
  /^rm\s+-rf\s+\/$/,
  /^rm\s+-rf\s+\/\s/,
  /^curl\s+.*\|\s*(bash|sh)$/,
  /^wget\s+.*\|\s*(bash|sh)$/,
  /^curl\s+.*\|\s*sudo/,
  /^chmod\s+777/,
];

const REQUIRE_APPROVAL_COMMANDS = [
  /^npm\s+install/,
  /^pip\s+install/,
  /^brew\s+install/,
  /^docker\s+run/,
  /^gh\s+secret/,
];

export class PolicyEngine {
  private policy: Policy = DEFAULT_POLICY;

  async load(): Promise<void> {
    try {
      const policyPath = path.join(process.cwd(), ".tracehound", "policy.yml");
      const content = await fs.readFile(policyPath, "utf-8");
      this.policy = yaml.parse(content) as Policy;
    } catch {
      // Use defaults if no policy file
    }
  }

  evaluateFilesystem(event: FileEvent): PolicyDecision {
    if (this.policy.mode === "record") {
      return { action: "allow" };
    }

    // Check blocked paths
    if (this.policy.blockedPaths) {
      for (const blocked of this.policy.blockedPaths) {
        if (this.matchPattern(event.path, blocked)) {
          return {
            action: this.policy.mode === "enforce" ? "block" : "warn",
            reason: `Access to blocked path: ${blocked}`,
            rule: "blocked_paths",
          };
        }
      }
    }

    // Check allowed paths (if whitelist mode)
    if (this.policy.allowedPaths) {
      let allowed = false;
      for (const allowedPath of this.policy.allowedPaths) {
        if (this.matchPattern(event.path, allowedPath)) {
          allowed = true;
          break;
        }
      }
      if (!allowed) {
        return {
          action: this.policy.mode === "enforce" ? "block" : "warn",
          reason: "Path not in allowed_paths",
          rule: "allowed_paths",
        };
      }
    }

    return { action: "allow" };
  }

  evaluateCommand(event: ProcessEvent): PolicyDecision {
    if (this.policy.mode === "record") {
      return { action: "allow" };
    }

    const command = event.argv.join(" ");

    // Check blocked commands
    for (const pattern of BLOCKED_COMMANDS) {
      if (pattern.test(command)) {
        return {
          action: this.policy.mode === "enforce" ? "block" : "warn",
          reason: `Blocked command pattern matched`,
          rule: "commands.block",
        };
      }
    }

    // Check require_approval commands
    if (this.policy.commands?.requireApproval) {
      for (const pattern of this.policy.commands.requireApproval) {
        if (this.matchGlobs(pattern, command)) {
          return {
            action: "require_approval",
            reason: `Command requires approval: ${pattern}`,
            rule: "commands.require_approval",
          };
        }
      }
    }

    // Check block list
    if (this.policy.commands?.block) {
      for (const blocked of this.policy.commands.block) {
        if (this.matchGlobs(blocked, command)) {
          return {
            action: this.policy.mode === "enforce" ? "block" : "warn",
            reason: `Command matches blocked pattern: ${blocked}`,
            rule: "commands.block",
          };
        }
      }
    }

    // Also check generic blocked patterns
    for (const pattern of REQUIRE_APPROVAL_COMMANDS) {
      if (pattern.test(command)) {
        return {
          action: "warn",
          reason: `Potentially risky command detected`,
          rule: "commands.suspicious",
        };
      }
    }

    return { action: "allow" };
  }

  evaluateNetwork(event: NetworkEvent): PolicyDecision {
    if (this.policy.mode === "record") {
      return { action: "allow" };
    }

    if (!event.host) {
      return { action: "allow" };
    }

    const isAllowed = this.policy.network?.allow?.some(pattern => 
      this.matchPattern(event.host!, pattern)
    ) ?? false;

    if (isAllowed) {
      return { action: "allow" };
    }

    const isBlocked = this.policy.network?.block?.some(pattern => 
      this.matchPattern(event.host!, pattern)
    ) ?? false;

    if (isBlocked) {
      return {
        action: this.policy.mode === "enforce" ? "block" : "warn",
        reason: `Host is blocked: ${event.host}`,
        rule: "network.block",
      };
    }

    // Unknown domain handling
    if (this.policy.network?.unknownDomains === "warn") {
      return {
        action: "warn",
        reason: `Unknown external domain: ${event.host}`,
        rule: "network.unknown",
      };
    }

    return { action: "allow" };
  }

  private matchPattern(value: string, pattern: string): boolean {
    // Support glob patterns
    const regex = new RegExp(
      "^" + pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$"
    );
    return regex.test(value);
  }

  private matchGlobs(pattern: string, value: string): boolean {
    // Simple glob matching
    const regex = pattern
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^ ]*")
      .replace(/\?/g, ".");
    return new RegExp(regex).test(value);
  }
}
