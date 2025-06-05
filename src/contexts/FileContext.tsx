import { createContext, useContext, useState, ReactNode } from 'react';
import exifr from 'exifr';
import { CameraUsageData } from '../types';

interface FileContextType {
  files: File[];
  setFiles: (files: File[]) => void;
  cameraUsageData: CameraUsageData[];
  setCameraUsageData: React.Dispatch<React.SetStateAction<CameraUsageData[]>>;
  isLoadingExif: boolean;
  photosByYear: { year: number; count: number }[];
}

const FileContext = createContext<FileContextType | null>(null);

// Helper function to extract year from ISO date string
const getYearFromDate = (dateString: string): number => {
  return new Date(dateString).getFullYear();
};

export const useFiles = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
};

export const FileProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFilesState] = useState<File[]>([]);
  const [cameraUsageData, setCameraUsageData] = useState<CameraUsageData[]>([]);
  const [isLoadingExif, setIsLoadingExif] = useState(false);
  const [photosByYear, setPhotosByYear] = useState<{ year: number; count: number }[]>([]);

  const processFiles = async (newFiles: File[]) => {
    setIsLoadingExif(true);
    const cameraDataMap = new Map<string, { make?: string; model: string; dates: Set<string>; photoCount: number; lensUsage: Array<{ make?: string; model: string; count: number }>; photosByYear: Record<number, number> }>();
    const yearlyPhotoCounts: Record<number, number> = {};

    for (const file of newFiles) {
      try {
        const exif = await exifr.parse(file, ['Make', 'Model', 'DateTimeOriginal', 'LensMake', 'LensModel']); // Added 'LensMake'
        if (exif && exif.Model && exif.DateTimeOriginal) {
          const make = exif.Make ? exif.Make.trim() : undefined;
          const model = exif.Model.trim();
          const date = new Date(exif.DateTimeOriginal).toISOString().split('T')[0];
          let lensMake = exif.LensMake ? exif.LensMake.trim() : undefined;
          const lensModel = exif.LensModel ? exif.LensModel.trim() : 'Unknown Lens';

          if (!lensMake && lensModel !== 'Unknown Lens') {
            const knownLensMakes = ['Canon', 'Nikon', 'Sony', 'FUJIFILM', 'Sigma', 'Tamron', 'Olympus', 'Panasonic', 'Leica', 'Voigtlander', 'Zeiss', 'Samyang', 'Rokinon', 'Pentax'];
            for (const knownMake of knownLensMakes) {
              if (lensModel.toUpperCase().startsWith(knownMake.toUpperCase())) {
                lensMake = knownMake;
                break;
              }
            }
          }

          const cameraKey = make ? `${make}-${model}` : model;

          if (!cameraDataMap.has(cameraKey)) {
            cameraDataMap.set(cameraKey, { make, model, dates: new Set(), photoCount: 0, lensUsage: [], photosByYear: {} });
          }

          const year = getYearFromDate(date);
          yearlyPhotoCounts[year] = (yearlyPhotoCounts[year] || 0) + 1;

          const cameraEntry = cameraDataMap.get(cameraKey)!;
          cameraEntry.dates.add(date);
          cameraEntry.photoCount += 1;
          cameraEntry.photosByYear[year] = (cameraEntry.photosByYear[year] || 0) + 1;

          const lensIdentifier = lensModel; // Using model as primary identifier for now, make can be added if needed for uniqueness
          let lensEntry = cameraEntry.lensUsage.find(l => l.model === lensIdentifier && l.make === lensMake);
          if (lensEntry) {
            lensEntry.count += 1;
          } else {
            cameraEntry.lensUsage.push({ make: lensMake, model: lensModel, count: 1 });
          }
        }
      } catch (error) {
        console.error(`Error parsing EXIF for ${file.name}:`, error);
      }
    }

    const processedData: CameraUsageData[] = Array.from(cameraDataMap.values()).map((data) => { // Iterate over values directly
      const sortedDates = Array.from(data.dates).sort();
      return {
        make: data.make,
        model: data.model,
        dates: sortedDates,
        startDate: sortedDates[0],
        endDate: sortedDates[sortedDates.length - 1],
        isExcluded: false,
        photoCount: data.photoCount,
        lensUsage: data.lensUsage.sort((a, b) => b.count - a.count), // Sort lenses by count desc
        photosByYear: data.photosByYear,
      };
    });

    setCameraUsageData(processedData);
    const aggregatedPhotosByYear = Object.entries(yearlyPhotoCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);
    setPhotosByYear(aggregatedPhotosByYear);
    setIsLoadingExif(false);
  };

  const setFiles = (newFiles: File[]) => {
    setFilesState(newFiles);
    if (newFiles.length > 0) {
      processFiles(newFiles);
    } else {
      setCameraUsageData([]);
      setPhotosByYear([]);
    }
  };

  return (
    <FileContext.Provider value={{ files, setFiles, cameraUsageData, setCameraUsageData, isLoadingExif, photosByYear }}>
      {children}
    </FileContext.Provider>
  );
};
