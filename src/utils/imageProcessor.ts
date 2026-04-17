const RAW_EXTENSIONS = ['.cr2', '.nef', '.arw', '.dng'];

export function isRawFormat(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return RAW_EXTENSIONS.includes(ext);
}

export function isSupportedFormat(file: File): boolean {
  const supportedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
  ];

  if (supportedMimeTypes.includes(file.type)) {
    return true;
  }

  return isRawFormat(file.name);
}

export async function processImageFile(file: File): Promise<string> {
  if (!isSupportedFormat(file)) {
    throw new Error(`Unsupported file format: ${file.type || file.name}`);
  }

  if (isRawFormat(file.name)) {
    return processRawFile(file);
  }

  return readFileAsDataUrl(file);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function processRawFile(file: File): Promise<string> {
  // For raw files, we'll try to extract the embedded JPEG preview
  // Most raw files contain a JPEG preview that we can extract
  // This is a simplified approach - full raw processing would require libraw.js

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Look for JPEG markers (FFD8 start, FFD9 end)
  const jpegStart = findJpegStart(bytes);
  const jpegEnd = findJpegEnd(bytes, jpegStart);

  if (jpegStart !== -1 && jpegEnd !== -1) {
    const jpegData = bytes.slice(jpegStart, jpegEnd + 2);
    const blob = new Blob([jpegData], { type: 'image/jpeg' });
    return readFileAsDataUrl(new File([blob], 'preview.jpg', { type: 'image/jpeg' }));
  }

  // If no embedded JPEG found, create a placeholder
  // In a production app, we'd use libraw.js here
  throw new Error('Could not extract preview from raw file. Raw format may not be fully supported.');
}

function findJpegStart(bytes: Uint8Array): number {
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8) {
      return i;
    }
  }
  return -1;
}

function findJpegEnd(bytes: Uint8Array, startFrom: number): number {
  if (startFrom === -1) return -1;

  for (let i = bytes.length - 2; i > startFrom; i--) {
    if (bytes[i] === 0xFF && bytes[i + 1] === 0xD9) {
      return i;
    }
  }
  return -1;
}

export async function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}
