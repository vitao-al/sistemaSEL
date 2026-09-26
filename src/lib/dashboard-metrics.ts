export function calculatePercentVariation(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  const variation = ((current - previous) / previous) * 100;
  return Number(variation.toFixed(1));
}

export function calculatePercentShare(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  const share = (value / total) * 100;
  return Number(share.toFixed(1));
}

export function getTrendDirection(value: number): boolean {
  return value >= 0;
}

export function getPageLabel(pageNumber: number, totalPages: number): string {
  return `${pageNumber} de ${totalPages}`;
}
