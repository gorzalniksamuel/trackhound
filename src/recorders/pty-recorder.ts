/**
 * PTY Recorder
 * Records terminal I/O via PTY
 */

import { spawn } from "node-pty";
import { IPty } from "node-pty";
import * as fs from "fs/promises";
import * as path from "path";

interface PTYOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export class PTYRecorder {
  private pty?: IPty;
  private outputBuffer = "";
  private castFile: string;
  private startTime?: number;
  private outputListeners: ((data: string) => void)[] = [];
  private exitListeners: ((code: number) => void)[] = [];

  constructor(workspacePath: string) {
    this.castFile = path.join(workspacePath, "terminal.cast");
  }

  spawn(command: string, args: string[], options: PTYOptions): IPty {
    this.startTime = Date.now();
    this.pty = spawn(command, args, {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
    });

    // Write asciicast header
    this.writeCastHeader();

    // Capture output
    this.pty.onData((data) => {
      this.outputBuffer += data;
      this.outputListeners.forEach(cb => cb(data));
      this.writeCastData(data);
    });

    this.pty.onExit(({ exitCode }) => {
      this.flush();
      this.exitListeners.forEach(cb => cb(exitCode ?? 1));
    });

    return this.pty;
  }

  onData(callback: (data: string) => void): void {
    this.outputListeners.push(callback);
  }

  onExit(callback: (code: number) => void): void {
    this.exitListeners.push(callback);
  }

  write(data: string): void {
    this.pty?.write(data);
  }

  resize(cols: number, rows: number): void {
    this.pty?.resize(cols, rows);
  }

  private async writeCastHeader(): Promise<void> {
    const header = {
      version: 2,
      width: 80,
      height: 30,
      timestamp: this.startTime! / 1000,
      env: { SHELL: process.env.SHELL, TERM: "xterm-color" },
    };
    await fs.appendFile(this.castFile, JSON.stringify(header) + "\n");
  }

  private async writeCastData(data: string): Promise<void> {
    const elapsed = (Date.now() - this.startTime!) / 1000;
    const line = JSON.stringify([elapsed, "o", data]);
    await fs.appendFile(this.castFile, line + "\n");
  }

  private async flush(): Promise<void> {
    // Any final cleanup
  }
}
