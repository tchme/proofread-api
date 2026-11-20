// Service worker: the only place that calls the API (host permissions skip the page's CORS) and opens extension tabs.
importScripts('api.js');

const getSettings = async () => ({ ...DEFAULTS, ...(await chrome.storage.local.get(['base', 'key', 'model'])) });

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === 'run') {
    getSettings()
      .then(s => complete(s, msg.action, msg.text))
      .then(text => reply({ text }), e => reply({ error: e.message }));
    return true; // the reply comes later
  }
  if (msg.type === 'editor') {
    chrome.storage.session.set({ editorText: msg.text })
      .then(() => chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') }));
  }
  if (msg.type === 'settings') chrome.runtime.openOptionsPage();
});

// First install: the key has to be entered before anything works.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') chrome.runtime.openOptionsPage();
});
