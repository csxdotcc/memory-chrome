const input = document.getElementById('limit');
const cpuInput = document.getElementById('cpu-limit');
const msg = document.getElementById('msg');
chrome.storage.sync.get({ limitMb: 777, cpuLimit: 100 }).then((v) => {
  input.value = v.limitMb;
  cpuInput.value = v.cpuLimit;
});
document.getElementById('save').addEventListener('click', async () => {
  const n = Math.max(0, Number(input.value) || 0);
  const cpu = Math.max(0, Number(cpuInput.value) || 0);
  await chrome.storage.sync.set({ limitMb: n, cpuLimit: cpu });
  msg.textContent = 'Saved';
});
