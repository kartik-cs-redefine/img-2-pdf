import { PDFDocument } from 'pdf-lib';
import type { UploadedImage } from '../types/images';

export type ConversionStage = 'preparing' | 'building' | 'finalizing';

export type ConversionProgress = {
  stage: ConversionStage;
  completed: number;
  total: number;
};

export type ConversionResult = {
  blob: Blob;
  pageCount: number;
};

export class PdfConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfConversionError';
  }
}

function isWebp(image: UploadedImage) {
  return image.type === 'image/webp' || /\.webp$/i.test(image.name);
}

function getImageMimeType(image: UploadedImage) {
  if (image.type === 'image/png' || /\.png$/i.test(image.name)) return 'image/png';
  if (image.type === 'image/jpeg' || /\.jpe?g$/i.test(image.name)) return 'image/jpeg';
  return image.type;
}

async function decodeWebpAsPng(file: File): Promise<Uint8Array> {
  let bitmap: ImageBitmap | undefined;
  let objectUrl: string | undefined;

  try {
    bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) throw new PdfConversionError('Your browser could not prepare this WEBP image.');
    context.drawImage(bitmap, 0, 0);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) throw new PdfConversionError('Your browser could not prepare this WEBP image.');
    return new Uint8Array(await pngBlob.arrayBuffer());
  } catch (error) {
    if (error instanceof PdfConversionError) throw error;

    objectUrl = URL.createObjectURL(file);
    const image = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new PdfConversionError('One of the WEBP images could not be read.'));
        image.src = objectUrl ?? '';
      });
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new PdfConversionError('Your browser could not prepare this WEBP image.');
      context.drawImage(image, 0, 0);
      const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!pngBlob) throw new PdfConversionError('Your browser could not prepare this WEBP image.');
      return new Uint8Array(await pngBlob.arrayBuffer());
    } finally {
      image.src = '';
      URL.revokeObjectURL(objectUrl);
    }
  } finally {
    bitmap?.close();
  }
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export async function convertImagesToPdf(images: UploadedImage[], onProgress: (progress: ConversionProgress) => void): Promise<ConversionResult> {
  if (!images.length) throw new PdfConversionError('Add at least one image before creating a PDF.');

  try {
    const pdf = await PDFDocument.create();
    onProgress({ stage: 'preparing', completed: 0, total: images.length });
    await yieldToBrowser();

    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      onProgress({ stage: 'building', completed: index, total: images.length });
      await yieldToBrowser();

      const embeddedImage = isWebp(image)
        ? await pdf.embedPng(await decodeWebpAsPng(image.file))
        : getImageMimeType(image) === 'image/png'
          ? await pdf.embedPng(await image.file.arrayBuffer())
          : getImageMimeType(image) === 'image/jpeg'
            ? await pdf.embedJpg(await image.file.arrayBuffer())
            : (() => { throw new PdfConversionError(`${image.name} is not a supported image type.`); })();

      const page = pdf.addPage([embeddedImage.width, embeddedImage.height]);
      page.drawImage(embeddedImage, { x: 0, y: 0, width: embeddedImage.width, height: embeddedImage.height });
      onProgress({ stage: 'building', completed: index + 1, total: images.length });
    }

    onProgress({ stage: 'finalizing', completed: images.length, total: images.length });
    await yieldToBrowser();
    return { blob: new Blob([await pdf.save()], { type: 'application/pdf' }), pageCount: images.length };
  } catch (error) {
    if (error instanceof PdfConversionError) throw error;
    throw new PdfConversionError('We could not create your PDF. Please make sure every image is valid and try again.');
  }
}

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
