const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  openJsonFile: () =>
    ipcRenderer.invoke("dialog:openJsonFile"),
  saveFile: (options) =>
    ipcRenderer.invoke("dialog:saveFile", options)
});
