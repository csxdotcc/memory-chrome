// Periodically checks every tab's memory and discards tabs above the limit.
const DEFAULT_LIMIT_MB = 777;
const DEFAULT_CPU_LIMIT = 100;
const ALARM = 'check-memory';
const PERIOD_MIN = 0.05; // 3s: minimum alarm period, keeps resource use low

const MB = 1024 * 1024;

function getLimits() {
  return chrome.storage.sync.get({
    limitMb: DEFAULT_LIMIT_MB,
    cpuLimit: DEFAULT_CPU_LIMIT
  }).then((v) => ({
    memoryMb: Number(v.limitMb) || 0,
    cpuPercent: Number(v.cpuLimit) || 0
  }));
}

function scheduleAlarm() {
  chrome.alarms.get(ALARM, (a) => {
    if (!a) chrome.alarms.create(ALARM, { periodInMinutes: PERIOD_MIN });
  });
}

// Memory in bytes and CPU percentage used by a tab. Uses chrome.processes when
// available, otherwise falls back to the JS heap size for memory.
async function tabStats(tab) {
  let cpu = 0;
  if (chrome.processes && chrome.processes.getProcessIdForTab) {
    try {
      const pid = await new Promise((res, rej) =>
        chrome.processes.getProcessIdForTab(tab.id, (id) =>
          chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(id)
        )
      );
      const info = await new Promise((res, rej) =>
        chrome.processes.getProcessInfo(pid, true, (p) =>
          chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(p)
        )
      );
      const proc = info[pid] || Object.values(info)[0];
      if (proc) {
        cpu = Number(proc.cpu) || 0;
        if (proc.privateMemory != null) {
          return { memory: proc.privateMemory, cpu };
        }
      }
    } catch (e) {
      /* fall through to the heap fallback */
    }
  }
  try {
    const [r] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (performance.memory ? performance.memory.usedJSHeapSize : 0)
    });
    return { memory: (r && r.result) || 0, cpu };
  } catch (e) {
    return { memory: 0, cpu }; // restricted page (chrome://, web store, ...)
  }
}

async function check() {
  const limits = await getLimits();
  if (limits.memoryMb <= 0 && limits.cpuPercent <= 0) return;
  const tabs = await chrome.tabs.query({ discarded: false });
  for (const tab of tabs) {
    const stats = await tabStats(tab);
    const overMemoryLimit =
      limits.memoryMb > 0 && stats.memory > limits.memoryMb * MB;
    const overCpuLimit =
      limits.cpuPercent > 0 && stats.cpu > limits.cpuPercent;
    if (overMemoryLimit || overCpuLimit) {
      chrome.tabs.discard(tab.id).catch(() => {});
    }
  }
}

chrome.runtime.onInstalled.addListener(scheduleAlarm);
chrome.runtime.onStartup.addListener(scheduleAlarm);
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === ALARM) check();
});
