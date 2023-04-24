import { app, Menu, BrowserWindow } from 'electron'
import EventName from './event/name';

/**
 *
 * @param { BrowserWindow } win
 */
export function createMenu(win) {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Open Folder', click: () => win.webContents.send(EventName.OPEN_FOLDER) },
        { label: 'Exit', role: 'quit' }
      ]
    },
    {
      label: "edit",
      role: "editMenu",
    },
    {
      label: "view",
      role: "viewMenu",
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
