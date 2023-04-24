import fs from 'fs/promises'
import path from 'path'
import { PNG } from 'pngjs' // 处理 png 文件
import jpeg from 'jpeg-js' // 处理 jpg/jpeg 文件

/**
 * @typedef { Object } ImageData
 * @property { number } width
 * @property { number } height
 * @property { Buffer } data
 */

export async function get_pixels(file_path) {
  const buffer = await fs.readFile(file_path)
  const image_data = await parse(buffer, get_mime_type(file_path))

  return new Pixels(image_data.width, image_data.height).parse(image_data.data)
}

function get_mime_type(file_path) {
  const ext = path.parse(file_path).ext
  switch (ext) {
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    default:
      return ext.replace('.', '')
  }
}

/**
 * @returns { Promise<ImageData>> }
 */
export async function parse(buffer, mime_type) {
  if (mime_type.includes(';')) {
    mime_type = mime_type.split(';')[0]
  }
  switch (mime_type) {
    case 'image/png':
      return handle_png(buffer)
    case 'image/jpg':
    case 'image/jpeg':
      return handle_jpeg(buffer)
    default:
      throw new Error('Unsupported file type: ' + mime_type)
  }
}

function handle_png(buffer) {
  return new Promise((rs, rj) => {
    try {
      const png = new PNG()
      png.parse(buffer, function (err, img_data) {
        // 解析png图片编码
        if (err) {
          return rj(err)
        }
        return rs(img_data)
      })
    } catch (e) {
      return rj(e)
    }
  })
}

function handle_jpeg(buffer) {
  return new Promise((rs, rj) => {
    let jpeg_data
    try {
      jpeg_data = jpeg.decode(buffer)
    } catch (e) {
      return rj(e)
    }
    if (!jpeg_data) {
      return rj('Error decoding jpeg')
    }
    return rs(jpeg_data)
  })
}

export class Pixels {
  width = 0
  height = 0
  /**@type { number[][] } */
  pixels = []
  constructor(width, height) {
    this.width = width
    this.height = height
  }

  /**@param { Buffer } data */
  parse(data) {
    const pixels = []
    for (let i = 0; i < data.length; i += 4) {
      if (i + 4 > data.length) break
      pixels.push([data[i], data[i + 1], data[i + 2], data[i + 3]])
    }
    this.pixels = pixels
    return this
  }

  to_index(x, y) {
    return y * this.width + x
  }

  to_coor(i) {
    const y = ~~(i / this.width)
    const x = i % y
    return { x, y }
  }

  coor_to_rect(x, y) {
    return {
      top: y,
      left: x,
      bottom: this.height - y,
      right: this.width - x
    }
  }

  get(x, y) {
    const i = this.to_index(x, y)
    return this.pixels[i]
  }
}

export class PixelsBox extends Pixels {
  r_total = 0
  g_total = 0
  b_total = 0

  pixel_total = 0;

  color_range = [[0,0], [0,0], [0,0]];
  volume = 0;
  priority = 0;
  rect = {
    left: 0,
    top: 0,
    width: 0,
    height: 0
  }

  constructor(width, height) {
    super(width, height)
  }

  /**
   * @param { Pixels } pixels 
   */
  static from_rect(rect, pixels, with_transparent = false) {
    const { top, left, width, height } = rect
    const box = new PixelsBox(rect.width, rect.height);
    box.rect = rect;
    const [r_range, g_range, b_range] = box.color_range;

    for (let x = left; x < left + width; x++) {
      for (let y = top; y < top + height; y++) {
        const p = pixels.get(x, y);
        if (p[3] !== 0) {
          box.r_total += p[0];
          box.g_total += p[1];
          box.b_total += p[2];
          box.pixel_total += 1;

          r_range[0] = Math.min(r_range[0], p[0]);
          r_range[1] = Math.max(r_range[1], p[0]);

          g_range[0] = Math.min(g_range[0], p[1]);
          g_range[1] = Math.max(g_range[1], p[1]);

          b_range[0] = Math.min(b_range[0], p[2]);
          b_range[1] = Math.max(b_range[1], p[2]);

          box.pixels.push(p);
        } else if (with_transparent) {
          box.pixels.push(p);
        }
      }
    }

    box.volume = (r_range[1] - r_range[0]) * (g_range[1] - g_range[0]) * (b_range[1] - b_range[0]);
    box.priority = box.volume * box.pixel_total;

    return box
  }
}
