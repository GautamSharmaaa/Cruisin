export interface NetworkQualitySnapshot {
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
}

export const adaptiveImageQuality = (connection?: NetworkQualitySnapshot): number => {
  if (!connection) return 85;
  if (connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') return 60;
  if ((connection.downlink !== undefined && connection.downlink < 5) || connection.effectiveType === '3g') return 75;
  if (connection.effectiveType === '4g' || (connection.downlink !== undefined && connection.downlink >= 5)) return 92;
  return 85;
};
