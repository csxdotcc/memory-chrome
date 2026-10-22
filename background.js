// Periodically checks every tab's memory and discards tabs above the limit.
const DEFAULT_LIMIT_MB = 777;
const ALARM = 'check-memory';
const PERIOD_MIN = 0.05; // 3s: minimum alarm period, keeps resource use low

const MB = 1024 * 1024;

function getLimitMb() {
  return chrome.storage.sync
    .get({ limitMb: DEFAULT_LIMIT_MB })
    .then((v) => Number(v.limitMb) || 0);
}

function scheduleAlarm() {
  chrome.alarms.get(ALARM, (a) => {
    if (!a) chrome.alarms.create(ALARM, { periodInMinutes: PERIOD_MIN });
  });
}

// Memory in bytes used by a tab. Uses chrome.processes (private memory of the
// tab's process) when available, otherwise falls back to the JS heap size.
async function tabMemory(tab) {
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
      if (proc && proc.privateMemory != null) return proc.privateMemory;
    } catch (e) {
      /* fall through to the heap fallback */
    }
  }
  try {
    const [r] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (performance.memory ? performance.memory.usedJSHeapSize : 0)
    });
    return (r && r.result) || 0;
  } catch (e) {
    return 0; // restricted page (chrome://, web store, ...)
  }
}

async function check() {
  const limit = await getLimitMb();
  if (limit <= 0) return;
  const tabs = await chrome.tabs.query({ discarded: false, active: false, audible: false });
  for (const tab of tabs) {
    if (tab.pinned) continue;
    const bytes = await tabMemory(tab);
    if (bytes > limit * MB) {
      chrome.tabs.discard(tab.id).catch(() => {});
    }
  }
}

chrome.runtime.onInstalled.addListener(scheduleAlarm);
chrome.runtime.onStartup.addListener(scheduleAlarm);
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === ALARM) check();
});
