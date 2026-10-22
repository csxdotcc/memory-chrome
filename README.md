# memory-chrome
Chrome extension (Manifest V3) that unloads tabs exceeding the memory or CPU limit set in its popup.
The CPU limit defaults to 100%. Load via `chrome://extensions` → Developer mode → Load unpacked.
Checks every 3s using an alarm (no persistent background page). Per-tab memory and CPU come from
`chrome.processes` (Dev/Canary channel); other channels fall back to the page's JS heap size for
memory. Chrome does not allow the currently active tab to be discarded.
