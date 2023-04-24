
import { Pixels, PixelsBox } from "./parse";


/**@param {Pixels} pixels */
export function get_template_marks(pixels) {
  const horizontal  = split_horizontal(pixels);
  if (horizontal) {
    return horizontal;
  }
  const vertical = split_vertical(pixels);
  if (vertical) {
    return vertical;
  }
  throw "未能找到标志位！";
}

/**@param {Pixels} image_pixes */
function split_horizontal(image_pixes) {
  const { width, height } = image_pixes;
  const half = ~~(width / 2);
  const left = new Pixels(half, height);
  const right = new Pixels(width - half, height);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const pixel = image_pixes.get(x, y).slice();
      if (x < half) {
        left.pixels.push(pixel);
      } else {
        right.pixels.push(pixel);
      }
    }
  }

  const left_rect = find_content_rect(left);
  if (!is_rect_available(left_rect, left)) {
    return null
  }
  const right_rect = find_content_rect(right);
  if (!is_rect_available(right_rect, right)) {
    return null
  }

  if (left_rect.right == 0 && right.left == 0) {
    if (left_rect.top == right_rect.top || left_rect.bottom == right_rect.bottom) {
      return null;
    }
  }
  
  const left_box = PixelsBox.from_rect(left_rect, left, true);
  const right_box = PixelsBox.from_rect(right_rect, right, true);
  return [left_box, right_box];
}

/**@param {Pixels} image_pixes */
function split_vertical(image_pixes) {
  const { width, height } = image_pixes;
  const half = ~~(height / 2);
  const left = new Pixels(width, half);
  const right = new Pixels(width, height - half);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = image_pixes.get(x, y).slice();
      if (y < half) {
        left.pixels.push(pixel);
      } else {
        right.pixels.push(pixel);
      }
    }
  }

  const top_rect = find_content_rect(left);
  if (!is_rect_available(top_rect, left)) {
    return null
  }
  const bottom_rect = find_content_rect(right);
  if (!is_rect_available(bottom_rect, right)) {
    return null
  }

  if (top_rect.right == 0 && right.left == 0) {
    if (top_rect.top == bottom_rect.top || top_rect.bottom == bottom_rect.bottom) {
      return null;
    }
  }
  
  const top_box = PixelsBox.from_rect(top_rect, left, true);
  const bottom_box = PixelsBox.from_rect(bottom_rect, right, true);
  return [top_box, bottom_box];
}


/**@param {Pixels} image_pixes */
function find_content_rect(image_pixes) {
  const { width, height } = image_pixes;
  const rect = {
    top: Number.MAX_SAFE_INTEGER, 
    left: Number.MAX_SAFE_INTEGER, 
    bottom: Number.MAX_SAFE_INTEGER, 
    right: Number.MAX_SAFE_INTEGER,
    width: 0,
    height: 0
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const { top, left, bottom, right } = image_pixes.coor_to_rect(x, y);
      const [r, g, b, a] = image_pixes.get(x, y);
      if (a == 0) continue; // 透明忽略

      image_pixes.r_total += r;
      image_pixes.g_total += g;
      image_pixes.b_total += b;
      image_pixes.pixel_total += 1;

      rect.top = Math.min(top, rect.top);
      rect.left = Math.min(left, rect.left);
      rect.bottom = Math.min(bottom, rect.bottom);
      rect.right = Math.min(right, rect.right);
    }
  }
  rect.width = width - rect.left - rect.width;
  rect.height = height - rect.top - rect.bottom;

  return rect;
}

/**@param {Pixels} image_pixes */
function is_rect_available(rect, image_pixes) {
  if (rect.top < 0 || rect.top > image_pixes.height) return false;
  if (rect.bottom < 0 || rect.bottom > image_pixes.height) return false;

  if (rect.left < 0 || rect.left > image_pixes.width) return false;
  if (rect.right < 0 || rect.right > image_pixes.width) return false;

  if (rect.width <= 0 || rect.width > image_pixes.width) return false;
  if (rect.height <= 0 || rect.height > image_pixes.height) return false;

  return true;
}