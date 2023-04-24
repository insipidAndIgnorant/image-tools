import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload';
import EventName from '../main/event/name'

// Custom APIs for renderer
const api = {
  invoke_open_foler: () => ipcRenderer.invoke(EventName.OPEN_FOLDER),
  register_win: () => ipcRenderer.send(EventName.REGISTER_WIN),
  remove_win: () => ipcRenderer.send(EventName.REMOVE_WIN),
  start_process: (images, templates) => ipcRenderer.send(EventName.START_PROCESS, images, templates),
  on_process: callback => {
    ipcRenderer.removeAllListeners(EventName.PRECESS_STATUS);
    ipcRenderer.on(EventName.PRECESS_STATUS, callback)
  },
  remove_on_process: () => {
    ipcRenderer.removeAllListeners(EventName.PRECESS_STATUS);
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
