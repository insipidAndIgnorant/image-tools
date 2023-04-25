import quantize from 'quantize'
import { ErrorType, ColorError } from './error'

/**
 * @typedef { import("./parse").PixelsBox } PixelsBox
 */

/**
 * @param { PixelsBox } box
 * @returns { number[] }
 */
export function extract_theme_colors(box) {
  let iter = Math.ceil((box.width * box.height) / 256)
  if (iter < 2) iter = 4
  if (iter > 128) iter = 128
  const pixels = box.pixels.filter(v => v[3] != 0);
  iter = 3;
  return extract_colors(pixels, iter);
}

/**
 * @param { PixelsBox } box
 */
export function extract_border_color(box) {
  let border_wdith = Math.min(box.width, box.height) / 8;
  if (border_wdith < 4) border_wdith = 4;

  const pixels = [];
  for (let i = 0; i < box.width; i++) {
    for (let j = 0; j < box.height; j++) {
      if (i < border_wdith || box.width - i <= border_wdith) {
        if (j < border_wdith || box.height - j <= border_wdith) {
          const p = box.pixels[i][j];
          if (p[3] != 0) {
            pixels.push(p);
          }
        }
      }
    }
  }

  let iter = Math.ceil(pixels.length / 256)
  if (iter < 2) iter = 4
  if (iter > 128) iter = 128

  return extract_colors(pixels, iter);
}


function extract_colors(pixels, iter) {
  fix_color_overflow(pixels);
  const color_map = quantize(pixels, iter)
  if (!color_map) throw new ColorError('iter error', ErrorType.QuantizeGetError)
  const colors = color_map.palette();
  return find_middle_color(colors);
}


function fix_color_overflow(colors = []) {
  colors.forEach(v => {
    // quantize fn doCut r1+1
    // fn avg ntot==0  => (r1+r2+1)/2*8
    // 255/8 = 31; (31+1)*8 = 256
    if (v[0] >= 255) v[0] = 247;
    if (v[1] >= 255) v[1] = 247;
    if (v[2] >= 255) v[2] = 247;
  })
}

function find_middle_color(colors = []) {
  const cache = {}
  let min_variance = Number.MAX_SAFE_INTEGER;
  let middle_color = null;
  for (let i = 0; i < colors.length; i++) {
    let variance = 0;
    const c1 = colors[i];
    for (let j = 0; j < colors.length; j++) {
      if (i == j) continue;
      const cache_key = [i, j].sort().join('-');
      if (cache[cache_key]) {
        variance += cache[cache_key];
      } else {
        const c2 = colors[j];
        const diff = calc_color_diff(c1, c2);
        cache[cache_key] = diff;
        variance += diff;
      }
    }
    if (variance < min_variance) {
      min_variance = variance;
      middle_color = c1;
    }
  }

  return middle_color;
}

export function calc_color_diff(c1, c2) {
  return Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2) + Math.pow(c1[2] - c2[2], 2)
}
