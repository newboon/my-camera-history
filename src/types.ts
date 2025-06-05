export interface FocalLengthData {
  fileName: string;
  focalLength: number | null;
}

export interface CameraUsageData {
  make?: string;
  model: string;
  dates: string[];
  startDate?: string;
  endDate?: string;
  isExcluded: boolean;
  photoCount?: number;
  lensUsage?: Array<{ make?: string; model: string; count: number }>;
  photosByYear?: Record<number, number>; // 연도별 사진 수
}

export interface ChartData {
  focalLength: string | number;
  count: number;
}
