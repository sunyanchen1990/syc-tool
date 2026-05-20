import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const MAX_OUTPUT_CHARS = 200_000;
const COMMAND_TIMEOUT_MS = 120_000;

export interface TerminalRunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  cwd: string;
  durationMs: number;
}

export interface TerminalInfo {
  cwd: string;
  shell: string;
  homedir: string;
  hostname: string;
  username: string;
}

export interface TerminalCompleteResult {
  matches: string[];
  replaceFrom: number;
  replaceTo: number;
}

let sessionCwd = os.homedir();

function splitLineForComplete(line: string): { before: string; partial: string } {
  const m = line.match(/^(.*\s)?(\S*)$/);
  return { before: m?.[1] ?? '', partial: m?.[2] ?? '' };
}

function pathCompletions(partial: string, cwd: string): string[] {
  if (partial.startsWith('~')) {
    const expanded = partial.replace(/^~(?=\/|$)/, os.homedir());
    return pathCompletions(expanded, cwd);
  }

  let searchDir = cwd;
  let dirPrefix = '';
  let namePrefix = partial;

  if (partial.includes('/')) {
    const slash = partial.lastIndexOf('/');
    dirPrefix = partial.slice(0, slash + 1);
    namePrefix = partial.slice(slash + 1);
    searchDir = path.resolve(cwd, dirPrefix);
  }

  try {
    return fs
      .readdirSync(searchDir)
      .filter((n) => namePrefix.startsWith('.') || !n.startsWith('.'))
      .filter((n) => n.startsWith(namePrefix))
      .map((n) => {
        const full = path.join(searchDir, n);
        let suffix = n;
        try {
          if (fs.statSync(full).isDirectory()) suffix += '/';
        } catch {
          /* ignore */
        }
        return dirPrefix + suffix;
      })
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function commandCompletions(partial: string): Promise<string[]> {
  const safe = partial.replace(/[^\w.-]/g, '');
  if (!safe) return Promise.resolve([]);

  const script = `print -l \${(f)\${(k)commands[(I)${safe}*]}} \${(f)\${(k)aliases[(I)${safe}*]}} 2>/dev/null | head -35`;

  return new Promise((resolve) => {
    const child = spawn('/bin/zsh', ['-lic', script], { env: process.env });
    let out = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, 8000);
    child.stdout?.on('data', (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on('error', () => {
      clearTimeout(timer);
      resolve([]);
    });
    child.on('close', () => {
      clearTimeout(timer);
      resolve(
        out
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      );
    });
  });
}

async function buildCompletions(
  line: string,
  cwd: string,
  history: string[]
): Promise<TerminalCompleteResult> {
  const { before, partial } = splitLineForComplete(line);
  const replaceFrom = before.length;
  const replaceTo = line.length;
  const firstWord = before.trim() === '';

  const pathLike =
    partial.startsWith('./') ||
    partial.startsWith('../') ||
    partial.startsWith('/') ||
    partial.startsWith('~') ||
    partial.includes('/') ||
    /\bcd\s*$/.test(before);

  let matches: string[] = [];

  if (pathLike || (!firstWord && partial)) {
    matches = pathCompletions(partial, cwd);
  }

  if (firstWord) {
    if (partial) {
      const cmds = await commandCompletions(partial);
      const hist = history.filter((h) => h.startsWith(partial));
      matches = [...new Set([...cmds, ...hist, ...matches])];
    } else {
      matches = [...new Set(history.slice(-12).reverse())];
    }
  } else if (matches.length === 0 && partial) {
    const cmds = await commandCompletions(partial);
    matches = cmds;
  }

  return {
    matches: matches.slice(0, 40),
    replaceFrom,
    replaceTo,
  };
}

function truncateOutput(text: string): string {
  if (text.length <= MAX_OUTPUT_CHARS) return text;
  return `${text.slice(0, MAX_OUTPUT_CHARS)}\n…（输出已截断）`;
}

function resolveCd(arg: string): string | null {
  const raw = arg.trim();
  const target = raw === '' || raw === '~' ? os.homedir() : raw.replace(/^~(?=\/|$)/, os.homedir());
  const next = path.resolve(sessionCwd, target);
  try {
    const stat = fs.statSync(next);
    if (stat.isDirectory()) return next;
  } catch {
    /* not found */
  }
  return null;
}

function runShell(command: string): Promise<TerminalRunResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const shell = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : '/bin/zsh';
    const args =
      process.platform === 'win32' ? ['/c', command] : ['-l', '-c', command];

    const child = spawn(shell, args, {
      cwd: sessionCwd,
      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
    }, COMMAND_TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout: '',
        stderr: err.message,
        cwd: sessionCwd,
        durationMs: Date.now() - start,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) {
        stderr = `${stderr}\n（命令超时 ${COMMAND_TIMEOUT_MS / 1000}s，已终止）`.trim();
      }
      resolve({
        exitCode: code,
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
        cwd: sessionCwd,
        durationMs: Date.now() - start,
      });
    });
  });
}

export function registerTerminalIpc() {
  ipcMain.handle('terminal:getInfo', (): TerminalInfo => {
    let username = 'user';
    try {
      username = os.userInfo().username;
    } catch {
      /* ignore */
    }
    return {
      cwd: sessionCwd,
      shell: process.platform === 'win32' ? 'cmd' : 'zsh',
      homedir: os.homedir(),
      hostname: os.hostname().split('.')[0] || 'mac',
      username,
    };
  });

  ipcMain.handle('terminal:run', async (_e, command: string): Promise<TerminalRunResult> => {
    const cmd = String(command ?? '').trim();
    if (!cmd) {
      return { exitCode: 0, stdout: '', stderr: '', cwd: sessionCwd, durationMs: 0 };
    }

    if (cmd === 'cd' || cmd.startsWith('cd ')) {
      const arg = cmd === 'cd' ? '' : cmd.slice(3);
      const next = resolveCd(arg);
      if (!next) {
        const label = arg.trim() || '~';
        return {
          exitCode: 1,
          stdout: '',
          stderr: `cd: no such file or directory: ${label}`,
          cwd: sessionCwd,
          durationMs: 0,
        };
      }
      sessionCwd = next;
      return { exitCode: 0, stdout: '', stderr: '', cwd: sessionCwd, durationMs: 0 };
    }

    return runShell(cmd);
  });

  ipcMain.handle('terminal:resetCwd', () => {
    sessionCwd = os.homedir();
    return sessionCwd;
  });

  ipcMain.handle(
    'terminal:complete',
    async (_e, payload: { line: string; history?: string[] }): Promise<TerminalCompleteResult> => {
      const line = String(payload?.line ?? '');
      const history = Array.isArray(payload?.history)
        ? payload.history.filter((h) => typeof h === 'string')
        : [];
      return buildCompletions(line, sessionCwd, history);
    }
  );
}
