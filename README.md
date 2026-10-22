# memory-chrome
Chrome extension (Manifest V3) that unloads tabs using more memory than a limit set in its popup.
Load via `chrome://extensions` → Developer mode → Load unpacked. Checks every 30s using an alarm
(no persistent background page). Per-tab memory comes from `chrome.processes` (Dev/Canary channel);
on other channels it falls back to the page's JS heap size.
