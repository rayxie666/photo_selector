import { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { usePhotoContext } from '@/contexts/PhotoContext';
import { processImageFile } from '@/utils/imageProcessor';
import { analyzeImage } from '@/utils/imageAnalysis';
import { useSettings } from '@/contexts/SettingsContext';

const SUPPORTED_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  '.cr2',
  '.nef',
  '.arw',
  '.dng',
];

export function PhotoUploader() {
  const { t } = useTranslation();
  const { dispatch } = usePhotoContext();
  const { settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      try {
        const imageData = await processImageFile(file);
        const analysis = await analyzeImage(imageData, settings);

        dispatch({
          type: 'ADD_PHOTO',
          payload: {
            id: crypto.randomUUID(),
            file,
            name: file.name,
            thumbnailUrl: imageData,
            analysis,
            isSelected: false,
            isManuallyFlagged: false,
          },
        });
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
      }

      setProgress(((i + 1) / fileArray.length) * 100);
    }

    setIsProcessing(false);
    setProgress(0);
  }, [dispatch, settings]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const acceptTypes = SUPPORTED_FORMATS.join(',');

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center
            transition-colors cursor-pointer
            ${isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptTypes}
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            {isProcessing ? (
              <>
                <Upload className="h-12 w-12 text-primary animate-pulse" />
                <p className="text-lg font-medium">{t('upload.processing')}</p>
                <Progress value={progress} className="w-full max-w-xs" />
              </>
            ) : (
              <>
                <ImagePlus className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">{t('upload.dragDrop')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('upload.or')}
                  </p>
                </div>
                <Button variant="secondary" size="lg">
                  {t('upload.selectFiles')}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('upload.supportedFormats')}
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
