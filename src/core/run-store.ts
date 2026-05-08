/**
 * Run Store
 * Manages storage and retrieval of run metadata
 * 
 * TraceHound stores runs in .tracehound/runs/
 */

import * as fs from "fs/promises";
import * as path from "path";
import { RunEntry, RunManifest } from "../types/index.js";

export class RunStore {
  private runsPath: string;

  constructor() {
    this.runsPath = path.join(process.cwd(), ".tracehound", "runs");
  }

  async listRuns(): Promise<RunEntry[]> {
    try {
      const entries = await fs.readdir(this.runsPath);
      const runs: RunEntry[] = [];
      
      for (const entry of entries) {
        const manifestPath = path.join(this.runsPath, entry, "manifest.json");
        try {
          const manifestData = await fs.readFile(manifestPath, "utf-8");
          const manifest: RunManifest = JSON.parse(manifestData);
          runs.push({
            id: manifest.run.id,
            name: manifest.run.name,
            timestamp: manifest.run.timestamp,
            agent: manifest.agent.name,
            summary: manifest.summary,
          });
        } catch {
          // Skip entries without valid manifests
        }
      }
      
      // Sort by timestamp descending
      return runs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      return [];
    }
  }

  getLatestRunId(): string | null {
    // This needs async, simplified for now
    return null;
  }

  getRun(runId: string): RunManifest | null {
    // This needs async, simplified for now
    return null;
  }
}
