import fs from 'fs/promises'
import { shell } from 'electron'
import path from 'path'
import sharp from 'sharp'
import { get_pixels, PixelsBox } from './parse'
import { get_template_marks } from './position'
import { extract_theme_colors, calc_color_diff } from './color'
import { ColorError, ErrorType } from './error'
import { send_process_status } from '../event/handler'

/**
 * @typedef { Object } Rect
 * @property { number } top
 * @property { number } left
 * @property { number } width
 * @property { number } height
 */

/**
 * @typedef { Object } Mark
 * @property { number[] } color
 * @property { Rect } rect
 */

/**
 * @typedef { Object } TemplateRecord
 * @property { number } width
 * @property { number } height
 * @property { Mark[] } marks
 * @property { string } path
 */


let output_path = '';
let error_path = '';
let image_folder = '';
let template_folder = '';
export async function handle_images_marks(input_image_folder, input_template_folder) {
  image_folder = fix_path_sep(input_image_folder);
  template_folder = fix_path_sep(input_template_folder);
  set_output_path(image_folder);
  let error_count = 0;

  send_process_status("正在解析模板...", "process")
  await read_templates(template_folder)
  send_process_status("模板解析完成，查找图片中...", "success")
  const files_path = await get_files_path(image_folder);

  for (let i = 0; i < files_path.length; i++) {
    const name = path.parse(files_path[i]).name;
    try {
      send_process_status("开始处理" + name + '...',  "process")
      await handle_images(files_path[i]);
      send_process_status(name + '添加成功！',  "success");
    } catch(err) {
      error_count += 1;
      await copy_unhandle_files(files_path[i]);
      const msg = err.message || err || '添加失败，原因未知';
      send_process_status(name + msg, "error");
    }
  }
  send_process_status(`所有图片处理完成，请前往${output_path}查看`, "success");
  shell.openPath(output_path);
  if (error_count > 0) {
    send_process_status(`有${error_count}个文件添加失败，请前往${error_path}查看`, "error");
    shell.openPath(error_path);
  }
}

/**@type { Map<string, TemplateRecord> } */
const TempalteMap = new Map()
async function read_templates(template_folder) {
  TempalteMap.clear()
  const templates = await fs.readdir(template_folder, { withFileTypes: true })
  for (let i = 0; i < templates.length; i++) {
    const dirent = templates[i]
    if (dirent.isDirectory()) continue

    send_process_status("正在解析模板" + dirent.name + '...', "process")

    const file_path = fix_path_sep(template_folder + path.sep + dirent.name)
    const pixels = await get_pixels(file_path)
    const record = {
      width: pixels.width,
      height: pixels.height,
      marks: [],
      path: file_path
    }
    const boxs = get_template_marks(pixels)
    record.marks = boxs.map((v) => {
      return {
        rect: v.rect,
        color: extract_theme_colors(v)
      }
    })
    send_process_status("模板" + dirent.name + '解析完成', "process")

    TempalteMap.set(file_path, record)
  }
}

async function get_files_path(image_folder) {
  const dirs = [image_folder]
  const files = []

  while (dirs.length > 0) {
    const dir_path = dirs.pop()
    const dirents = await fs.readdir(dir_path, { withFileTypes: true })
    for (let i = 0; i < dirents.length; i++) {
      const dirent = dirents[i]
      const dirent_path = fix_path_sep(dir_path + path.sep + dirent.name)
      if (dirent.isDirectory()) {
        dirs.push(dirent_path)
      } else {
        send_process_status(dirent.name + '加入待处理队列...', "process")
        files.push(dirent_path)
      }
    }
  }
  return files
}

async function handle_images(image_path) {
  const pixels = await get_pixels(image_path)

  /**@type { TemplateRecord[] } */
  const templates = []

  TempalteMap.forEach((v) => {
    if (v.width == pixels.width && v.height == pixels.height) {
      templates.push(v)
    }
  })
  if (!templates.length) throw new ColorError('未找到宽高匹配的模板！', ErrorType.NoMatchTemplate)

  let max_diff = 0
  /**@type { TemplateRecord } */
  let template = null
  for (let i = 0; i < templates.length; i++) {
    const { marks } = templates[i]
    let mark_diff = 0
    for (let j = 0; j < marks.length; j++) {
      const { rect, color } = marks[j]
      const box = PixelsBox.from_rect(rect, pixels, true)
      const image_color = extract_theme_colors(box)
      const diff = calc_color_diff(image_color, color)
      mark_diff += diff
    }
    if (mark_diff > max_diff) {
      max_diff = mark_diff
      template = templates[i]
    }
  }

  return merge_image(image_path, template.path);
}

async function merge_image(image_path, template_path) {
  let new_file = sharp(image_path).composite([{ input: template_path, gravity: 'centre' }])
  if (image_path.indexOf('jpg') != -1) new_file.jpeg({ quality: 100 })
  if (image_path.indexOf('jpeg') != -1) new_file.jpeg({ quality: 100 })
  let buffer = await new_file.toBuffer();
  let new_file_path = get_new_file_path(image_path);

  await mk_new_file_dir(new_file_path);
  return fs.writeFile(new_file_path, buffer);
}

async function copy_unhandle_files(image_path) {
  let new_file_path = get_new_file_path(image_path, error_path);
  await mk_new_file_dir(new_file_path);
  return fs.copyFile(image_path, new_file_path);
}

function get_new_file_path(image_path, pre_path = output_path) {
  let rest_path = image_path.replace(image_folder, '');
  return path.normalize(pre_path + path.sep + rest_path);
}
function mk_new_file_dir(new_file_path) {
  const dir = path.parse(new_file_path).dir;
  return fs.mkdir(dir, { recursive: true });
}

function set_output_path(image_folder) {
  output_path = path.normalize(image_folder + path.sep + '..' + path.sep + 'output');
  error_path = path.normalize(image_folder + path.sep + '..' + path.sep + 'error');
}

function fix_path_sep(file_path) {
  return file_path.replace(/\//g, path.sep).replace(/\\/g, path.sep)
}
