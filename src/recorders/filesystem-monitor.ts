/**
 * Filesystem Monitor
 * Watches file system events
 */

import * as fs from "fs/promises";
import * as path from "path";
import { FileEvent, AgentEvent } from "../types/index.js";

export class FilesystemMonitor {
  private watcher?: fs.FSWatcher;
  private eventHandler?: (event: AgentEvent) => void;

  async start(
    rootPath: string,
    onEvent: (event: AgentEvent) => void
  ): Promise<void> {
    this.eventHandler = onEvent;
    
    // Use fs.watch for cross-platform file watching
    // This is a simplified implementation - production would use more robust solutions
    this.watcher = fs.watch(rootPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      
      const fullPath = path.join(rootPath, filename);
      const event: FileEvent = {
        ts: new Date().toISOString(),
        type: eventType === "rename" ? "file.write" : "file.write",
        runId: "", // Set by AgentBox
        path: fullPath,
      };
      
      onEvent(event);
    });
  }

  async stop(): Promise<void> {
    await this.watcher?.close();
  }
}
