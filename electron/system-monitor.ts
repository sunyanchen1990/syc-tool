import si from 'systeminformation';

export interface SystemStatsSnapshot {
  ts: number;
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    used: number;
    total: number;
    usedPercent: number;
  };
  disk: {
    used: number;
    total: number;
    usedPercent: number;
    mount: string;
  };
  network: {
    downloadBps: number;
    uploadBps: number;
    iface: string;
  };
  battery: {
    percent: number;
    isCharging: boolean;
    healthPercent: number | null;
    cycleCount: number | null;
    timeRemaining: number | null;
  } | null;
}

let lastNetSample: { rx: number; tx: number; ts: number; iface: string } | null = null;

function pickPrimaryInterface(
  stats: Awaited<ReturnType<typeof si.networkStats>>
): Awaited<ReturnType<typeof si.networkStats>>[number] | undefined {
  const up = stats.filter(
    (s) => s.operstate === 'up' && !s.iface.startsWith('lo') && !s.iface.startsWith('bridge')
  );
  return (
    up.find((s) => s.iface === 'en0') ??
    up[0] ??
    stats.find((s) => !s.iface.startsWith('lo'))
  );
}

function calcNetworkSpeed(
  iface: Awaited<ReturnType<typeof si.networkStats>>[number]
): { downloadBps: number; uploadBps: number } {
  const now = Date.now();
  let downloadBps = 0;
  let uploadBps = 0;

  if (lastNetSample && lastNetSample.iface === iface.iface && now > lastNetSample.ts) {
    const sec = (now - lastNetSample.ts) / 1000;
    if (sec > 0) {
      downloadBps = Math.max(0, (iface.rx_bytes - lastNetSample.rx) / sec);
      uploadBps = Math.max(0, (iface.tx_bytes - lastNetSample.tx) / sec);
    }
  }

  lastNetSample = {
    rx: iface.rx_bytes,
    tx: iface.tx_bytes,
    ts: now,
    iface: iface.iface,
  };

  return { downloadBps, uploadBps };
}

export async function collectSystemStats(): Promise<SystemStatsSnapshot> {
  const [load, cpu, mem, fsSizes, netStats, battery] = await Promise.all([
    si.currentLoad(),
    si.cpu(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.battery(),
  ]);

  const primaryDisk =
    fsSizes.find((d) => d.mount === '/') ??
    fsSizes.find((d) => d.mount === '/System/Volumes/Data') ??
    fsSizes[0];

  const diskUsed = primaryDisk?.used ?? 0;
  const diskTotal = primaryDisk?.size ?? 0;

  const primaryNet = pickPrimaryInterface(netStats);
  const netSpeed = primaryNet
    ? calcNetworkSpeed(primaryNet)
    : { downloadBps: 0, uploadBps: 0 };

  let batteryInfo: SystemStatsSnapshot['battery'] = null;
  if (battery.hasBattery) {
    const design = battery.designedCapacity ?? 0;
    const maxCap = battery.maxCapacity ?? 0;
    let healthPercent: number | null = null;
    if (design > 0 && maxCap > 0) {
      healthPercent = Math.min(100, Math.round((maxCap / design) * 100));
    }

    batteryInfo = {
      percent: Math.round(battery.percent ?? 0),
      isCharging: Boolean(battery.isCharging),
      healthPercent,
      cycleCount: battery.cycleCount ?? null,
      timeRemaining: battery.timeRemaining ?? null,
    };
  }

  return {
    ts: Date.now(),
    cpu: {
      usage: Math.round((load.currentLoad ?? 0) * 10) / 10,
      cores: cpu.cores ?? 0,
      model: (cpu.brand ?? cpu.model ?? 'CPU').replace(/\s+/g, ' ').trim(),
    },
    memory: {
      used: mem.active ?? mem.used ?? 0,
      total: mem.total ?? 0,
      usedPercent: mem.total ? Math.round(((mem.active ?? mem.used) / mem.total) * 1000) / 10 : 0,
    },
    disk: {
      used: diskUsed,
      total: diskTotal,
      usedPercent: diskTotal ? Math.round((diskUsed / diskTotal) * 1000) / 10 : 0,
      mount: primaryDisk?.mount ?? '/',
    },
    network: {
      ...netSpeed,
      iface: primaryNet?.iface ?? '—',
    },
    battery: batteryInfo,
  };
}
