const input = document.getElementById('limit');
const msg = document.getElementById('msg');
chrome.storage.sync.get({ limitMb: 500 }).then((v) => (input.value = v.limitMb));
document.getElementById('save').addEventListener('click', async () => {
  const n = Math.max(0, Number(input.value) || 0);
  await chrome.storage.sync.set({ limitMb: n });
  msg.textContent = 'Saved';
});
