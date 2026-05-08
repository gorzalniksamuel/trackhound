/**
 * TraceHound Core
 * Main orchestrator for tracking agent sessions
 */

import { EventEmitter } from "events";
import { spawn, ChildProcess } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "crypto";
import { PTYRecorder } from "../recorders/pty-recorder.js";
import { FilesystemMonitor } from "../recorders/filesystem-monitor.js";
import { GitSnapshotter } from "../recorders/git-snapshotter.js";
import { ProcessMonitor } from "../recorders/process-monitor.js";
import { NetworkMonitor } from "../recorders/network-monitor.js";
import { SecretDetector } from "../recorders/secret-detector.js";
import { PolicyEngine } from "../policies/policy-engine.js";
import { TraceWriter } from "./trace-writer.js";
import { RunManifest, TraceHoundOptions, RunResult, AgentEvent } from "../types/index.js";

export interface TraceHoundConfig extends TraceHoundOptions {
  workspacePath: string;
  runId: string;
  startTime: Date;
}

export class TraceHound extends EventEmitter {
  private config: TraceHoundConfig;
  private ptyRecorder: PTYRecorder;
  private filesystemMonitor: FilesystemMonitor;
  private gitSnapshotter: GitSnapshotter;
  private processMonitor: ProcessMonitor;
  private networkMonitor: NetworkMonitor;
  private secretDetector: SecretDetector;
  private policyEngine: PolicyEngine;
  private traceWriter: TraceWriter;
  private childProcess?: ChildProcess;
  private events: AgentEvent[] = [];
  private warnings: string[] = [];

  constructor(options: TraceHoundOptions) {
    super();
    
    const runId = this.generateRunId();
    const workspacePath = path.join(process.cwd(), ".tracehound", "runs", runId);
    
    this.config = {
      ...options,
      runId,
      workspacePath,
      startTime: new Date(),
    };

    // Initialize components
    this.traceWriter = new TraceWriter(workspacePath);
    this.ptyRecorder = new PTYRecorder(workspacePath);
    this.filesystemMonitor = new FilesystemMonitor();
    this.gitSnapshotter = new GitSnapshotter();
    this.processMonitor = new ProcessMonitor();
    this.networkMonitor = new NetworkMonitor(options.netMode || "observe");
    this.secretDetector = new SecretDetector();
    this.policyEngine = new PolicyEngine();
  }

  async run(agentCommand: string): Promise<RunResult> {
    await this.initialize();
    
    try {
      // Start recording
      await this.startRecording();
      
      // Run the agent
      const exitCode = await this.executeAgent(agentCommand);
      
      // Stop recording
      await this.stopRecording();
      
      // Generate manifest
      const result = await this.finalize(exitCode);
      
      return result;
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  private async initialize(): Promise<void> {
    // Create workspace
    await fs.mkdir(this.config.workspacePath, { recursive: true });
    
    // Initialize trace writer
    await this.traceWriter.initialize();
    
    // Capture git state before
    await this.gitSnapshotter.captureBefore();
    
    // Load policy
    await this.policyEngine.load();
    
    this.emit("initialized", { runId: this.config.runId });
  }

  private async startRecording(): Promise<void> {
    // Start filesystem monitoring
    await this.filesystemMonitor.start(process.cwd(), (event) => {
      this.handleFilesystemEvent(event);
    });
    
    // Start process monitoring
    this.processMonitor.start((event) => {
      this.handleProcessEvent(event);
    });
    
    // Start network monitoring if enabled
    if (this.config.netMode !== "off") {
      await this.networkMonitor.start((event) => {
        this.handleNetworkEvent(event);
      });
    }
    
    this.emit("recording-started", { runId: this.config.runId });
  }

  private async executeAgent(agentCommand: string): Promise<number> {
    return new Promise((resolve) => {
      const [command, ...args] = agentCommand.split(" ");
      
      // Spawn in PTY for proper terminal handling
      this.childProcess = this.ptyRecorder.spawn(command, args, {
        cwd: process.cwd(),
        env: process.env,
      });

      // Forward stdio
      this.ptyRecorder.onData((data) => {
        process.stdout.write(data);
      });

      this.ptyRecorder.onExit((code) => {
        resolve(code ?? 1);
      });
    });
  }

  private async stopRecording(): Promise<void> {
    // Stop all monitors
    await this.filesystemMonitor.stop();
    this.processMonitor.stop();
    await this.networkMonitor.stop();
    
    // Close trace writer
    await this.traceWriter.close();
    
    // Capture git state after
    await this.gitSnapshotter.captureAfter();
    
    this.emit("recording-stopped", { runId: this.config.runId });
  }

  private async finalize(exitCode: number): Promise<RunResult> {
    const endTime = new Date();
    const durationMs = endTime.getTime() - this.config.startTime.getTime();
    
    // Generate manifest
    const manifest: RunManifest = {
      schema: "tracehound.manifest.v1",
      run: {
        id: this.config.runId,
        name: this.config.name,
        timestamp: this.config.startTime.toISOString(),
        durationMs,
        exitCode,
      },
      agent: {
        name: this.config.agent || "unknown",
        command: this.childProcess?.spawnargs || [],
      },
      repo: {
        root: process.cwd(),
        git: await this.gitSnapshotter.getInfo(),
      },
      summary: this.generateSummary(),
      warnings: this.warnings,
    };
    
    // Write manifest
    await this.traceWriter.writeManifest(manifest);
    
    return {
      runId: this.config.runId,
      durationMs,
      exitCode,
      warnings: this.warnings,
    };
  }

  private generateSummary() {
    const fileEvents = this.events.filter(e => e.type === "file.write" || e.type === "file.delete");
    const commandEvents = this.events.filter(e => e.type === "process.exec");
    const networkEvents = this.events.filter(e => e.type === "network.connect");
    const secretEvents = this.events.filter(e => e.type === "secret.access");
    
    return {
      filesModified: fileEvents.length,
      commandsRun: commandEvents.length,
      networkConnections: networkEvents.length,
      secretsAccessed: secretEvents.length,
    };
  }

  private handleFilesystemEvent(event: AgentEvent): void {
    // Check for secret access
    if (this.secretDetector.isSecretPath(event.path)) {
      this.warnings.push(`Secret file accessed: ${event.path}`);
      this.emitWarning("secret.access", event);
    }
    
    // Check policy
    const decision = this.policyEngine.evaluateFilesystem(event);
    if (decision.action !== "allow") {
      this.emitWarning(`policy.${decision.action}`, event, decision.reason);
    }
    
    this.events.push(event);
    this.traceWriter.writeEvent(event);
  }

  private handleProcessEvent(event: AgentEvent): void {
    // Check policy
    const decision = this.policyEngine.evaluateCommand(event);
    if (decision.action !== "allow") {
      this.emitWarning(`policy.${decision.action}`, event, decision.reason);
    }
    
    this.events.push(event);
    this.traceWriter.writeEvent(event);
  }

  private handleNetworkEvent(event: AgentEvent): void {
    // Check policy
    const decision = this.policyEngine.evaluateNetwork(event);
    if (decision.action !== "allow") {
      this.emitWarning(`policy.${decision.action}`, event, decision.reason);
    }
    
    this.events.push(event);
    this.traceWriter.writeEvent(event);
  }

  private emitWarning(type: string, event: AgentEvent, reason?: string): void {
    const warning = reason || `${type}: ${JSON.stringify(event)}`;
    this.warnings.push(warning);
    this.emit("warning", { type, event, reason });
  }

  private async cleanup(): Promise<void> {
    try {
      await this.filesystemMonitor.stop();
      this.processMonitor.stop();
      await this.networkMonitor.stop();
      await this.traceWriter.close();
    } catch {
      // Ignore cleanup errors
    }
  }

  private generateRunId(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const random = Math.random().toString(36).substring(2, 6);
    return `${timestamp}_${random}`;
  }
}
