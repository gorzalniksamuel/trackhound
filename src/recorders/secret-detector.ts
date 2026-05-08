/**
 * Secret Detector
 * Detects access to sensitive files and locations
 */

import * as path from "path";
import { AgentEvent, SecretEvent } from "../types/index.js";

// Known secret paths and patterns
const SECRET_PATTERNS = [
  { pattern: /\.env$/i, category: "env" as const },
  { pattern: /\.env\.local$/i, category: "env" as const },
  { pattern: /\.env\..+$/i, category: "env" as const },
  { pattern: /id_rsa$/i, category: "ssh" as const },
  { pattern: /id_ed25519$/i, category: "ssh" as const },
  { pattern: /id_ecdsa$/i, category: "ssh" as const },
  { pattern: /\.ssh\/config$/i, category: "ssh" as const },
  { pattern: /\.aws\/credentials$/i, category: "aws" as const },
  { pattern: /\.aws\/config$/i, category: "aws" as const },
  { pattern: /application_default_credentials\.json$/i, category: "gcp" as const },
  { pattern: /\.azure\/msal_token_cache\.json$/i, category: "azure" as const },
  { pattern: /\.terraform\/.*\.tfstate$/i, category: "token" as const },
  { pattern: /\.npmrc$/i, category: "token" as const },
  { pattern: /\.pypirc$/i, category: "token" as const },
  { pattern: /\.netrc$/i, category: "token" as const },
  { pattern: /\.gh\/hosts\.yml$/i, category: "token" as const },
  { pattern: /token$/i, category: "token" as const },
  { pattern: /api[_-]?key/i, category: "key" as const },
  { pattern: /secret/i, category: "key" as const },
  { pattern: /\.pem$/i, category: "key" as const },
  { pattern: /\.key$/i, category: "key" as const },
  { pattern: /\.p12$/i, category: "key" as const },
  { pattern: /\.pfx$/i, category: "key" as const },
];

// Known sensitive directories
const SENSITIVE_DIRS = [
  "~/.ssh",
  "~/.aws",
  "~/.gcp",
  "~/.azure",
  "~/.config/gh",
  "~/.npm",
];

export class SecretDetector {
  /**
   * Check if a path contains sensitive information
   */
  isSecretPath(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);
    
    // Check patterns
    for (const { pattern } of SECRET_PATTERNS) {
      if (pattern.test(normalizedPath)) {
        return true;
      }
    }
    
    // Check sensitive directories
    for (const dir of SENSITIVE_DIRS) {
      const expandedDir = dir.replace(/^~/, process.env.HOME || "");
      if (normalizedPath.startsWith(expandedDir)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get the category of a secret
   */
  getSecretCategory(filePath: string): string | null {
    const normalizedPath = path.normalize(filePath);
    
    for (const { pattern, category } of SECRET_PATTERNS) {
      if (pattern.test(normalizedPath)) {
        return category;
      }
    }
    
    return null;
  }

  /**
   * Detect high-entropy strings in text (potential secrets in output)
   */
  detectHighEntropyStrings(text: string): string[] {
    // Simple entropy detection
    // Would use more sophisticated methods in production
    const potentialSecrets: string[] = [];
    
    // Look for common secret patterns
    const patterns = [
      /[a-zA-Z0-9]{32,}/g,  // Long alphanumeric strings
      /sk-[a-zA-Z0-9]{20,}/g,  // OpenAI-style keys
      /gh[pousr]_[a-zA-Z0-9]{20,}/g,  // GitHub tokens
      /AKIA[0-9A-Z]{16}/g,  // AWS access keys
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        potentialSecrets.push(...matches);
      }
    }
    
    return potentialSecrets;
  }

  /**
   * Redact sensitive content from text
   */
  redactIfSensitive(text: string): { text: string; redacted: boolean } {
    const secrets = this.detectHighEntropyStrings(text);
    
    if (secrets.length === 0) {
      return { text, redacted: false };
    }
    
    let redactedText = text;
    for (const secret of secrets) {
      redactedText = redactedText.replace(secret, "[REDACTED]");
    }
    
    return { text: redactedText, redacted: true };
  }
}
