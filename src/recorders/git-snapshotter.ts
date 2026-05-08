/**
 * Git Snapshotter
 * Captures git state before and after agent runs
 */

import { execSync } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { GitInfo } from "../types/index.js";

export class GitSnapshotter {
  private beforePatch?: string;
  private afterPatch?: string;
  private workspacePath?: string;

  setWorkspace(path: string): void {
    this.workspacePath = path;
  }

  async captureBefore(): Promise<void> {
    if (!this.workspacePath) return;
    
    const isRepo = await this.isGitRepo();
    if (!isRepo) return;

    this.beforePatch = this.getGitDiff();
    
    await fs.writeFile(
      path.join(this.workspacePath, "git-before.patch"),
      this.beforePatch || ""
    );
  }

  async captureAfter(): Promise<void> {
    if (!this.workspacePath) return;
    
    const isRepo = await this.isGitRepo();
    if (!isRepo) return;

    this.afterPatch = this.getGitDiff();
    
    await fs.writeFile(
      path.join(this.workspacePath, "git-after.patch"),
      this.afterPatch || ""
    );
  }

  async getInfo(): Promise<GitInfo> {
    const isRepo = await this.isGitRepo();
    if (!isRepo) {
      return { isRepo: false };
    }

    try {
      const branch = execSync("git branch --show-current", { encoding: "utf-8" }).trim();
      const commit = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
      const status = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
      const remote = execSync("git remote get-url origin", { encoding: "utf-8" }).trim().catch(() => undefined);

      return {
        isRepo: true,
        branch,
        commit,
        dirty: status.length > 0,
        remoteUrl: remote,
      };
    } catch {
      return { isRepo: true };
    }
  }

  private getGitDiff(): string {
    try {
      return execSync("git diff", { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    } catch {
      return "";
    }
  }

  private async isGitRepo(): Promise<boolean> {
    try {
      execSync("git rev-parse --git-dir", { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }
}
