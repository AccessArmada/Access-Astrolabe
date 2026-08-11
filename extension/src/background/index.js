chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
  console.log("Screen Reader Inspector Installed");

  chrome.contextMenus.create({
    id: "inspect-element",
    title: "Inspect with Access Astrolabe",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "inspect-element" && tab?.id) {
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    chrome.tabs.sendMessage(tab.id, { type: 'INSPECT_ELEMENT' }).catch(() => {});
  }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background: Received", message.type, "from", sender.tab ? `tab ${sender.tab.id}` : "component");

  if (message.type === 'FOCUS_CHANGE' && sender.tab) {
    console.log("Background: Relaying FOCUS_CHANGE to runtime...");
    chrome.runtime.sendMessage(message)
      .then(() => console.log("Background: Relay SUCCESS"))
      .catch((err) => {
        // Silently fail relay if no one is listening (e.g. side panel closed)
        if (!err.message?.includes("Could not establish connection")) {
          console.error("Background: Relay FAILED", err);
        }
      });
  }
});
