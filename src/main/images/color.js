import { ErrorType, ColorError } from './error'
import quantize from './quantize'

/**
 * @typedef { import("./parse").PixelsBox } PixelsBox
 */

/**
 * @param { PixelsBox } box
 * @returns { number[] }
 */
export function extract_theme_colors(box) {
  const pixels = box.pixels.filter(v => v[3] != 0);
  let iter = Math.ceil(pixels.length / 256)
  if (iter < 2) iter = 4
  if (iter > 128) iter = 128

  return check_color(extract_colors(pixels, iter));
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
  // fix_color_overflow(pixels);
  const color_map = quantize(pixels, iter)
  if (!color_map) throw new ColorError('iter error', ErrorType.QuantizeGetError)
  const colors = color_map.palette();
  return find_middle_color(colors);
}

function check_color(color) {
  if (color[0] > 255) throw "error rgb > 255";
  if (color[1] > 255) throw "error rgb > 255";
  if (color[2] > 255) throw "error rgb > 255";
  return color;
}

function fix_color_overflow(colors = []) {
  colors.forEach(v => {
    // quantize fn doCut r1+1
    // fn avg ntot==0  => (r1+r2+1)/2*8
    // 255/8 = 31; (31+1)*8 = 256
    if (v[0] >= 255) tiny_color(v);
    if (v[1] >= 255) tiny_color(v);
    if (v[2] >= 255) tiny_color(v);
  })
}

function tiny_color(color) {
  const tint  = -9 / 255;
  color[0] += Math.round(tint * color[0]);
  color[1] += Math.round(tint * color[1]);
  color[2] += Math.round(tint * color[2]);
}


function find_middle_color(colors = []) {
  const len = colors.length;
  const cache = {} // 
  const variances = {}; // 方差
  const counter = {}; // 数量

  let min_variance = Number.MAX_SAFE_INTEGER;
  let middle_color = null;
  
  for (let i = 0; i < colors.length; i++) {
    const c1 = colors[i];
    const c1_hex = color_to_hex(c1);

    counter[c1_hex] = (counter[c1_hex] || 0) + 1;
    if (variances[c1_hex]) continue;

    let variance = 0;
    for (let j = 0; j < colors.length; j++) {
      if (i == j) continue;

      const c2 = colors[j];
      const cache_key = [i, j].sort().join('-');

      if (cache[cache_key]) {
        variance += cache[cache_key];
      } else {
        const diff = calc_color_diff(c1, c2);
        cache[cache_key] = diff;
        variance += diff;
      }
    }
    variances[c1_hex] = variance;

    if (variance < min_variance) {
      min_variance = variance;
      middle_color = c1;
    }
  }

  let max_count = 0;
  let count_color = null;
  for (const hex in counter) {
    if (Object.hasOwnProperty.call(counter, hex)) {
      const count = counter[hex];
      if (count >= max_count) {
        max_count = count;
        count_color = hex;
      }
    }
  }
  count_color = hex_to_color(count_color);
  if (len / max_count < 4) {
    // 超过25% 认为主题色
    return count_color;
  }
  // 否则选取方差最小的
  return middle_color;
}

export function color_to_hex(color) {
  let red = color[0].toString(16).padStart('2', '0');
  let green = color[1].toString(16).padStart('2', '0');
  let blue = color[2].toString(16).padStart('2', '0');

  return `#${red}${green}${blue}`;
}

export function hex_to_color(hex) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  return [r, g, b];
}



const sRGBtrc = 2.218;	
const Rco = 0.2126;		// sRGB Red Coefficient
const Gco = 0.7156;		// sRGB Green Coefficient
const Bco = 0.0722;		// sRGB Blue Coefficient

const scaleBoW = 161.8;	// Scaling for dark text on light (phi * 100)
const scaleWoB = 161.8;	// Scaling for light text on dark â€” same as BoW, but

const normBGExp = 0.38;		// Constants for Power Curve Exponents.
const normTXTExp = 0.43;	// One pair for normal text,and one for REVERSE
const revBGExp = 0.5;		// FUTURE: These will eventually be dynamic
const revTXTExp = 0.43;		// as a function of light adaptation and context

const blkThrs = 0.02;	// Level that triggers the soft black clamp
const blkClmp = 1.75;	// Exponent for the soft black clamp curve


function calc_trc(val) {
  return (val / 255) ** sRGBtrc;
}

function calc_sapc(c1, c2) {
  let sapc = 0;
  const Rbg = calc_trc(c1[0]);
  const Gbg = calc_trc(c1[1]);
  const Bbg = calc_trc(c1[2]);

  const Rtxt = calc_trc(c2[0]);
  const Gtxt = calc_trc(c2[1]);
  const Btxt = calc_trc(c2[2]);

  var Ybg = Rbg * Rco + Gbg * Gco + Bbg * Bco
  var Ytxt = Rtxt * Rco + Gtxt * Gco + Btxt * Bco

  if (Ybg > Ytxt) {
    // For normal polarity, black text on white

    // soft clamp darkest color if near black.
    Ytxt = Ytxt > blkThrs ? Ytxt : Ytxt + Math.abs(Ytxt - blkThrs) ** blkClmp
    sapc = (Ybg ** normBGExp - Ytxt ** normTXTExp) * scaleBoW

    return sapc < 15 ? 0 : sapc.toPrecision(3)
  } else {
    // For reverse polarity, white text on black
    Ybg = Ybg > blkThrs ? Ybg : Ybg + Math.abs(Ybg - blkThrs) ** blkClmp
    sapc = (Ybg ** revBGExp - Ytxt ** revTXTExp) * scaleWoB

    return sapc > -15 ? 0 : sapc.toPrecision(3)
  }
}

export function calc_color_diff(c1, c2) {
  let sapc = calc_sapc(c1, c2);
  // console.log(sapc);
  return Math.pow(sapc, 2);
  // return Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2) + Math.pow(c1[2] - c2[2], 2)
}
