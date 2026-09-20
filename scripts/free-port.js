const { execSync } = require('child_process');

function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const pids = new Set();
      for (const line of output.trim().split('\n')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== process.pid.toString()) {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          process.kill(Number(pid), 'SIGKILL');
          console.log(`[free-port] Freed port ${port} by terminating PID ${pid}`);
        } catch {}
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
    }
  } catch {}
}

const targetPorts = process.argv.slice(2).map(Number).filter(Boolean);
const portsToFree = targetPorts.length > 0 ? targetPorts : [3001];
portsToFree.forEach(freePort);
