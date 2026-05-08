/**
 * Trace Writer
 * Manages writing events to the trace store
 * 
 * TraceHound uses .tracehound/ directory for all traces
 */

import * as fs from "fs/promises";
import * as path from "path";
import { AgentEvent, RunManifest } from "../types/index.js";

export class TraceWriter {
  private eventsPath: string;
  private manifestPath: string;
  private writeQueue: AgentEvent[] = [];
  private flushInterval?: NodeJS.Timeout;
  private closed = false;

  constructor(private workspacePath: string) {
    this.eventsPath = path.join(workspacePath, "events.jsonl");
    this.manifestPath = path.join(workspacePath, "manifest.json");
  }

  async initialize(): Promise<void> {
    // Touch the events file
    await fs.writeFile(this.eventsPath, "", { flag: "a" });
    
    // Start background flush
    this.flushInterval = setInterval(() => this.flush(), 100);
  }

  async writeEvent(event: AgentEvent): Promise<void> {
    if (this.closed) return;
    this.writeQueue.push(event);
  }

  async writeManifest(manifest: RunManifest): Promise<void> {
    await fs.writeFile(
      this.manifestPath,
      JSON.stringify(manifest, null, 2)
    );
  }

  async close(): Promise<void> {
    this.closed = true;
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush
    await this.flush();
  }

  private async flush(): Promise<void> {
    if (this.writeQueue.length === 0) return;
    
    const events = [...this.writeQueue];
    this.writeQueue = [];
    
    const lines = events
      .map(e => JSON.stringify(e))
      .join("\n") + "\n";
    
    await fs.appendFile(this.eventsPath, lines);
  }
}
