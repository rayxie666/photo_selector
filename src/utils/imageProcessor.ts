const RAW_EXTENSIONS = [
  '.cr2', // Canon
  '.nef', // Nikon
  '.arw', // Sony
  '.dng', // Adobe / generic
  '.3fr', // Hasselblad H/X system
  '.fff', // Hasselblad / Imacon (legacy)
];

const ANALYSIS_MAX = 800;
const THUMBNAIL_QUALITY = 0.85;

export function isRawFormat(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return RAW_EXTENSIONS.includes(ext);
}

export function isSupportedFormat(file: File): boolean {
  const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (supportedMimeTypes.includes(file.type)) return true;
  return isRawFormat(file.name);
}

export interface ProcessedImage {
  /** Blob URL (objectURL) for displaying the downscaled thumbnail. */
  thumbnailUrl: string;
  /** Pixel data of the same downscaled image; transferred to the analysis worker. */
  imageData: ImageData;
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  if (!isSupportedFormat(file)) {
    throw new Error(`Unsupported file format: ${file.type || file.name}`);
  }

  const sourceBlob = isRawFormat(file.name) ? await extractRawPreview(file) : file;
  const bitmap = await createImageBitmap(sourceBlob);
  try {
    const ratio = Math.min(ANALYSIS_MAX / bitmap.width, ANALYSIS_MAX / bitmap.height, 1);
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: THUMBNAIL_QUALITY });
    const thumbnailUrl = URL.createObjectURL(blob);
    return { thumbnailUrl, imageData };
  } finally {
    bitmap.close();
  }
}

async function extractRawPreview(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const segment = findLargestEmbeddedJpeg(bytes);
  if (!segment) {
    throw new Error('Could not extract preview from RAW file');
  }
  const jpegData = bytes.slice(segment.start, segment.end + 1);
  return new Blob([jpegData], { type: 'image/jpeg' });
}

// Scan the entire RAW container for valid JPEG segments (each starts at 0xFF 0xD8
// and ends at 0xFF 0xD9) and return the biggest one — typically the full-size
// preview rather than the small thumbnail.
function findLargestEmbeddedJpeg(
  bytes: Uint8Array,
): { start: number; end: number } | null {
  let best: { start: number; end: number; size: number } | null = null;
  const len = bytes.length;
  let i = 0;
  while (i < len - 1) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8) {
      const start = i;
      let end = -1;
      // Walk forward looking for the matching EOI (FF D9).
      let j = i + 2;
      while (j < len - 1) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          end = j + 1;
          break;
        }
        j += 1;
      }
      if (end !== -1) {
        const size = end - start + 1;
        if (!best || size > best.size) best = { start, end, size };
        i = end + 1;
      } else {
        // Unterminated — stop scanning further; nothing usable past this.
        break;
      }
    } else {
      i += 1;
    }
  }
  return best ? { start: best.start, end: best.end } : null;
}

export async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}
