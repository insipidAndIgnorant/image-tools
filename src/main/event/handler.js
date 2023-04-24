import { BrowserWindow, dialog, ipcMain, ipcRenderer } from 'electron';
import EventName from './name';
import { sleep } from '../utils/tools'
import { handle_images_marks } from '../images/index'


function open_folder() {
  return dialog.showOpenDialog({ properties: ['openDirectory'] }).then(res => {
    if (!res.canceled) {
      return res.filePaths[0];
    }
  })
}

/**@type { BrowserWindow[] } */
const wins = [];
function register_win(event) {
  const webContents = event.sender
  const win = BrowserWindow.fromWebContents(webContents)
  if (wins.every(v => v.id != win.id)) {
    wins.push(win);
  }
}

function remove_win(event) {
  const webContents = event.sender
  const win = BrowserWindow.fromWebContents(webContents)
  let last = wins.length - 1;
  for (let i = 0; i < wins.length; i++) {
    if (wins[i].id == win.id) {
      [wins[i], wins[last]] = [wins[last], wins[i]];
      last -= 1;
    }
  }
  wins.length = last + 1;
}


let is_process = false;
function start_process(event, image_folder, template_folder) {
  console.log('cwd is ', process.cwd())
  if (is_process) {
    return send_process_status("正在处理中，请完成后再试！", "error")
  }
  if (image_folder == template_folder) {
    return send_process_status("图片路径和模板路径不能相同！", "error")
  }


  is_process = true;
  // const p1 = "D:\\WorkSpace\\KOC_TASK\\image-tools\\images\\files";
  // const p2 = "D:\\WorkSpace\\KOC_TASK\\image-tools\\images\\template";
  // handle_images_marks(p1, p2).catch(err => {
  handle_images_marks(image_folder, template_folder).catch(err => {
    send_process_status("图片处理失败，" + err.message || err, "error")
  }).finally(() => {
    is_process = false;
  });
}

export function send_process_status(msg, status = "process") {
  wins.forEach(v => {
    v.webContents.send(EventName.PRECESS_STATUS, msg, status);
  })
}

export function register_handler() {
  ipcMain.handle(EventName.OPEN_FOLDER, open_folder)
  
}

export function register_listener() {
  ipcMain.on(EventName.REGISTER_WIN, register_win);
  ipcMain.on(EventName.REMOVE_WIN, remove_win);
  ipcMain.on(EventName.START_PROCESS, start_process)
}