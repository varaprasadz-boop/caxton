export function formatJobNumber(jobNumber: number, createdAt: Date | string | null): string {
  if (!createdAt) return `CAX${String(jobNumber).padStart(4, '0')}`;
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const paddedNumber = String(jobNumber).padStart(4, '0');
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const fyStart = month >= 4 ? year : year - 1;
  const fyEnd = String(fyStart + 1).slice(-2);
  return `CAX${paddedNumber}/${fyStart}-${fyEnd}`;
}
