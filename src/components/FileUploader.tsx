import { useFiles } from '../contexts/FileContext';
import { cn } from '../utils/styles';
import { GlassCard } from './common/GlassCard';
import { parse } from 'exifr';
import { useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export const FileUploader = () => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [unsupportedExtensions, setUnsupportedExtensions] = useState<string[]>(
    [],
  );
  const { files: selectedFiles, setFiles: setSelectedFiles } = useFiles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploaded = selectedFiles.length > 0;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const unsupported = new Set<string>();
      const supportChecks = await Promise.all(
        Array.from(files).map(async file => {
          const isSupported = await checkExifSupport(file);
          if (!isSupported) {
            const extension = getFileExtension(file.name);
            if (extension) {
              unsupported.add(extension);
            }
          }
          return { file, isSupported };
        }),
      );

      const supportedNewFiles = supportChecks
        .filter(({ isSupported }) => isSupported)
        .map(({ file }) => file);

      const newFiles = supportedNewFiles.filter(newFile => {
        const newFileNameWithoutExt = newFile.name.substring(0, newFile.name.lastIndexOf('.')) || newFile.name;
        return !selectedFiles.some(existingFile => {
          const existingFileNameWithoutExt = existingFile.name.substring(0, existingFile.name.lastIndexOf('.')) || existingFile.name;
          return existingFileNameWithoutExt === newFileNameWithoutExt;
        });
      });

      // Filter out duplicates from the newly added files themselves
      const uniqueNewFiles = newFiles.reduce((acc, currentFile) => {
        const currentFileNameWithoutExt = currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name;
        if (!acc.find(file => {
          const accFileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          return accFileNameWithoutExt === currentFileNameWithoutExt;
        })) {
          acc.push(currentFile);
        }
        return acc;
      }, [] as File[]);


      if (unsupported.size > 0) {
        setUnsupportedExtensions(Array.from(unsupported));
        setTimeout(() => setUnsupportedExtensions([]), 3000);
      }

      if (uniqueNewFiles.length > 0) {
        setSelectedFiles([...selectedFiles, ...uniqueNewFiles]);
      }
    },
    [selectedFiles, setSelectedFiles],
  );

  const processEntry = useCallback(
    async (entry: FileSystemEntry): Promise<File[]> => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        return new Promise<File[]>(resolve => {
          fileEntry.file(async file => {
            const isSupported = await checkExifSupport(file);
            if (!isSupported) {
              const extension = getFileExtension(file.name);
              if (extension) {
                setUnsupportedExtensions(prev => [
                  ...new Set([...prev, extension]),
                ]);
                setTimeout(() => setUnsupportedExtensions([]), 3000);
              }
            }
            resolve(isSupported ? [file] : []);
          });
        });
      }

      if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const dirReader = dirEntry.createReader();

        const entries = await new Promise<FileSystemEntry[]>(resolve => {
          dirReader.readEntries(entries => resolve(entries));
        });

        const filePromises: Promise<File[]>[] = entries.map(entry =>
          processEntry(entry),
        );
        const fileArrays = await Promise.all(filePromises);
        return fileArrays.flat();
      }

      return [];
    },
    [],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target as HTMLElement;

    if (
      target.closest('.upload-area') &&
      !target.isEqualNode(e.currentTarget as HTMLElement)
    ) {
      return;
    }

    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const items = e.dataTransfer?.items;
      if (!items) return;

      const entries = Array.from(items)
        .map(item => item.webkitGetAsEntry())
        .filter((entry): entry is FileSystemEntry => entry !== null);

      const filePromises = entries.map(entry => processEntry(entry));
      const fileArrays = await Promise.all(filePromises);
      const files = fileArrays.flat();

      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles, processEntry],
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <GlassCard
      className={cn(
        'p-0', // overwrite GlassCard default style
        'upload-area text-center cursor-pointer',
        'border-2 border-dashed border-gray/40',
        isDragging && 'border-blue-400/50 bg-blue-50/50',
        'hover:border-blue-300/50 hover:bg-blue-50/30',
      )}
      onClick={handleClick}
    >
      <div
        className={cn('transition-all p-8', !isUploaded && 'py-25')}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <div>
          <p className="mb-2 text-slate-600 text-balance break-keep">
            {t('fileUploader.dropzone')}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {t('fileUploader.notice.unsupportedFormat')}
            <br />
            {t('fileUploader.notice.exifRequired')}
          </p>
          {unsupportedExtensions.length > 0 && (
            <p className="mt-2 text-xs text-amber-500 animate-fade-in">
              {t('fileUploader.notice.unsupportedFiles')}
              <br />
              {unsupportedExtensions.join(', ')}
            </p>
          )}
          <p className="mt-4 text-sm text-slate-500">
            {isUploaded
              ? t('fileUploader.notice.selectedFiles', {
                  count: selectedFiles.length,
                })
              : t('fileUploader.notice.noFiles')}
          </p>
        </div>
      </div>
    </GlassCard>
  );
};

const checkExifSupport = async (file: File): Promise<boolean> => {
  try {
    // Check for essential EXIF fields that most cameras should have
    const data = await parse(file, {
      pick: ['Make', 'Model', 'DateTimeOriginal', 'DateTime', 'DateTimeDigitized', 'FocalLength', 'FocalLengthIn35mmFormat', 'ExifVersion'],
    });

    // Return true if any of these essential fields exist
    return !!(data && (
      data.Make || 
      data.Model || 
      data.DateTimeOriginal || 
      data.DateTime || 
      data.DateTimeDigitized ||
      data.FocalLength ||
      data.FocalLengthIn35mmFormat ||
      data.ExifVersion
    ));
  } catch (error) {
    console.warn(`EXIF parsing failed for ${file.name}:`, error);
    return false;
  }
};

const getFileExtension = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return extension ? `.${extension}` : '';
};
