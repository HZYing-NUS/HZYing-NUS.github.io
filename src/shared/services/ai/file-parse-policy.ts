export type FileParseResult<T> =
  | { status: 'parsed'; file: T; chargeable: true; attemptId: string }
  | { status: 'failed'; chargeable: true; attemptId: string; error: Error }
  | { status: 'reused'; file: T | undefined; chargeable: false }
  | { status: 'in_progress'; chargeable: false };

export function getFileParseClaimTtlMs(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 120_000;
}

export function sumChargeableParseCosts<T extends { chargeable: boolean }>(
  attempts: Array<T & { costUsd: number }>
) {
  return attempts.reduce(
    (total, attempt) => total + (attempt.chargeable ? attempt.costUsd : 0),
    0
  );
}
