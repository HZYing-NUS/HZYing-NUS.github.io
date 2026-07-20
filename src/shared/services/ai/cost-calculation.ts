export function calculateContextAddonCosts({
  fileContextTokens,
  memoryContextTokens,
  fileContextCostPerMillionTokens,
  memoryContextCostPerMillionTokens,
}: {
  fileContextTokens: number;
  memoryContextTokens: number;
  fileContextCostPerMillionTokens: number;
  memoryContextCostPerMillionTokens: number;
}) {
  return {
    fileCostUsd:
      (Math.max(0, fileContextTokens) * fileContextCostPerMillionTokens) /
      1_000_000,
    memoryCostUsd:
      (Math.max(0, memoryContextTokens) * memoryContextCostPerMillionTokens) /
      1_000_000,
  };
}

export function calculateFileParseCostUsd(
  sizeBytes: number,
  fileParseCostPerMbUsd: number
) {
  return (Math.max(0, sizeBytes) / (1024 * 1024)) * fileParseCostPerMbUsd;
}

export function calculateAddonOnlyPrice({
  internalCostUsd,
  multiplier,
  creditValueUsd,
  minimumMarginUsd,
}: {
  internalCostUsd: number;
  multiplier: number;
  creditValueUsd: number;
  minimumMarginUsd: number;
}) {
  if (internalCostUsd <= 0) {
    return { internalCostUsd: 0, retailCostUsd: 0, rawCredits: 0, credits: 0 };
  }
  const retailCostUsd = Math.max(
    internalCostUsd * multiplier,
    internalCostUsd + minimumMarginUsd
  );
  const rawCredits = retailCostUsd / creditValueUsd;
  return {
    internalCostUsd,
    retailCostUsd,
    rawCredits,
    credits: Math.ceil(rawCredits - 1e-9),
  };
}
