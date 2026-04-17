import type { AnalysisResult, AnalysisSettings } from '@/types';
import { loadImageElement } from './imageProcessor';

export interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
  luminosity: number[];
  totalSaturation: number;
  pixelCount: number;
}

export function calculateHistogram(imageData: ImageData): HistogramData {
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);
  const luminosity = new Array(256).fill(0);
  let totalSaturation = 0;

  const data = imageData.data;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const rVal = data[i] / 255;
    const gVal = data[i + 1] / 255;
    const bVal = data[i + 2] / 255;

    r[Math.round(rVal * 255)]++;
    g[Math.round(gVal * 255)]++;
    b[Math.round(bVal * 255)]++;

    // Calculate luminosity using standard formula
    const lum = Math.round(0.299 * rVal * 255 + 0.587 * gVal * 255 + 0.114 * bVal * 255);
    luminosity[lum]++;

    // Calculate HSL saturation for gray-flat detection
    const max = Math.max(rVal, gVal, bVal);
    const min = Math.min(rVal, gVal, bVal);
    const l = (max + min) / 2;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    }
    totalSaturation += s * 100;
  }

  return { r, g, b, luminosity, totalSaturation, pixelCount };
}

export function calculateMeanLuminosity(histogram: HistogramData): number {
  let sum = 0;
  let count = 0;

  for (let i = 0; i < 256; i++) {
    sum += i * histogram.luminosity[i];
    count += histogram.luminosity[i];
  }

  return count > 0 ? sum / count : 0;
}

export function detectHighlightClipping(histogram: HistogramData, threshold: number = 0.05): boolean {
  const totalPixels = histogram.luminosity.reduce((a, b) => a + b, 0);
  const clippedPixels = histogram.luminosity[255];
  return clippedPixels / totalPixels > threshold;
}

export function detectShadowClipping(histogram: HistogramData, threshold: number = 0.05): boolean {
  const totalPixels = histogram.luminosity.reduce((a, b) => a + b, 0);
  const clippedPixels = histogram.luminosity[0];
  return clippedPixels / totalPixels > threshold;
}

export function detectGrayFlat(histogram: HistogramData, threshold: number = 15): boolean {
  if (histogram.pixelCount === 0) return false;
  const avgSaturation = histogram.totalSaturation / histogram.pixelCount;
  return avgSaturation < threshold;
}

export function detectPureBlack(histogram: HistogramData, threshold: number = 60): boolean {
  const totalPixels = histogram.pixelCount;
  if (totalPixels === 0) return false;
  // Count pixels with luminosity < 5
  let extremeDarkPixels = 0;
  for (let i = 0; i < 5; i++) {
    extremeDarkPixels += histogram.luminosity[i];
  }
  return (extremeDarkPixels / totalPixels) * 100 > threshold;
}

export function detectBlur(imageData: ImageData, threshold: number = 100): boolean {
  const { width, height, data } = imageData;

  // Convert to grayscale and apply Laplacian kernel [0,1,0,1,-4,1,0,1,0]
  const responses: number[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const top = (((y - 1) * width + x) * 4);
      const bottom = (((y + 1) * width + x) * 4);
      const left = ((y * width + (x - 1)) * 4);
      const right = ((y * width + (x + 1)) * 4);

      // Grayscale of center and neighbors
      const center = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const topG = 0.299 * data[top] + 0.587 * data[top + 1] + 0.114 * data[top + 2];
      const bottomG = 0.299 * data[bottom] + 0.587 * data[bottom + 1] + 0.114 * data[bottom + 2];
      const leftG = 0.299 * data[left] + 0.587 * data[left + 1] + 0.114 * data[left + 2];
      const rightG = 0.299 * data[right] + 0.587 * data[right + 1] + 0.114 * data[right + 2];

      const lap = topG + bottomG + leftG + rightG - 4 * center;
      responses.push(lap);
    }
  }

  if (responses.length === 0) return false;

  const mean = responses.reduce((a, b) => a + b, 0) / responses.length;
  const variance = responses.reduce((sum, v) => sum + (v - mean) ** 2, 0) / responses.length;

  return variance < threshold;
}

export type ExposureStatus = 'correct' | 'overexposed' | 'underexposed';
export type BrightnessStatus = 'correct' | 'tooDark' | 'tooBright';

export function analyzeExposure(histogram: HistogramData, settings: AnalysisSettings): ExposureStatus {
  const totalPixels = histogram.luminosity.reduce((a, b) => a + b, 0);

  // Count pixels in high range (>240) and low range (<15)
  let highPixels = 0;
  let lowPixels = 0;

  for (let i = 0; i < 15; i++) {
    lowPixels += histogram.luminosity[i];
  }

  for (let i = 240; i < 256; i++) {
    highPixels += histogram.luminosity[i];
  }

  const highRatio = highPixels / totalPixels;
  const lowRatio = lowPixels / totalPixels;

  // Adjust thresholds based on sensitivity setting (0.01 to 0.20)
  const overexposedThreshold = 0.15 - (settings.exposureSensitivity * 0.1);
  const underexposedThreshold = 0.15 - (settings.exposureSensitivity * 0.1);

  if (highRatio > overexposedThreshold) {
    return 'overexposed';
  }

  if (lowRatio > underexposedThreshold) {
    return 'underexposed';
  }

  return 'correct';
}

export function analyzeBrightness(meanLuminosity: number, settings: AnalysisSettings): BrightnessStatus {
  if (meanLuminosity < settings.darkThreshold) {
    return 'tooDark';
  }

  if (meanLuminosity > settings.brightThreshold) {
    return 'tooBright';
  }

  return 'correct';
}

export async function analyzeImage(dataUrl: string, settings: AnalysisSettings): Promise<AnalysisResult> {
  const img = await loadImageElement(dataUrl);

  // Create canvas and draw image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Use a smaller size for analysis to improve performance
  const maxSize = 800;
  let width = img.width;
  let height = img.height;

  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = (height / width) * maxSize;
      width = maxSize;
    } else {
      width = (width / height) * maxSize;
      height = maxSize;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const histogram = calculateHistogram(imageData);
  const meanLuminosity = calculateMeanLuminosity(histogram);

  const exposureStatus = analyzeExposure(histogram, settings);
  const brightnessStatus = analyzeBrightness(meanLuminosity, settings);
  const hasClippedHighlights = detectHighlightClipping(histogram, settings.highlightClipThreshold);
  const hasClippedShadows = detectShadowClipping(histogram, settings.shadowClipThreshold);
  const isGrayFlat = detectGrayFlat(histogram, settings.grayFlatThreshold);
  const isPureBlack = detectPureBlack(histogram, settings.pureBlackThreshold);
  const isBlurry = detectBlur(imageData, settings.blurThreshold);

  const isFlagged =
    exposureStatus !== 'correct' ||
    brightnessStatus !== 'correct' ||
    hasClippedHighlights ||
    hasClippedShadows ||
    isGrayFlat ||
    isPureBlack ||
    isBlurry;

  return {
    exposureStatus,
    brightnessStatus,
    meanLuminosity,
    hasClippedHighlights,
    hasClippedShadows,
    isGrayFlat,
    isPureBlack,
    isBlurry,
    isFlagged,
  };
}
