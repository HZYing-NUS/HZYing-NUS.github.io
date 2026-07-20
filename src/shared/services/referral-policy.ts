export const REFERRAL_ATTRIBUTION_DAYS = 30;
export const REFERRAL_REWARD_DELAY_HOURS = 24;
export const REFERRAL_PURCHASE_RECONCILIATION_MINUTES = 15;
export const REFERRAL_SIGNUP_REWARD_CREDITS = 10;
export const REFERRAL_MONTHLY_SIGNUP_CAP = 100;

export function referralExpiry(clickedAt: Date) {
  return new Date(
    clickedAt.getTime() + REFERRAL_ATTRIBUTION_DAYS * 24 * 60 * 60 * 1000
  );
}

export function referralRewardAvailableAt(createdAt: Date) {
  return new Date(
    createdAt.getTime() + REFERRAL_REWARD_DELAY_HOURS * 60 * 60 * 1000
  );
}

export function purchaseRewardAvailableAt(
  occurredAt: Date,
  observedAt = new Date()
) {
  const providerHold = referralRewardAvailableAt(occurredAt);
  const reconciliationHold = new Date(
    observedAt.getTime() + REFERRAL_PURCHASE_RECONCILIATION_MINUTES * 60 * 1000
  );
  return providerHold > reconciliationHold ? providerHold : reconciliationHold;
}

export function purchaseRewardSourceUpdate({
  currentSourceOrderNo,
  firstPurchase,
  observedAt = new Date(),
}: {
  currentSourceOrderNo: string | null;
  firstPurchase: {
    orderNo: string;
    packageCredits: number;
    occurredAt: Date;
  };
  observedAt?: Date;
}) {
  if (currentSourceOrderNo === firstPurchase.orderNo) return null;
  return {
    sourceOrderNo: firstPurchase.orderNo,
    credits: purchaseRewardCredits(firstPurchase.packageCredits),
    availableAt: purchaseRewardAvailableAt(
      firstPurchase.occurredAt,
      observedAt
    ),
  };
}

export function purchaseRewardCorrection({
  status,
  rewardId,
  currentSourceOrderNo,
  firstPurchase,
  observedAt = new Date(),
}: {
  status: string;
  rewardId: string;
  currentSourceOrderNo: string | null;
  firstPurchase: {
    orderNo: string;
    packageCredits: number;
    occurredAt: Date;
  };
  observedAt?: Date;
}) {
  const sourceUpdate = purchaseRewardSourceUpdate({
    currentSourceOrderNo,
    firstPurchase,
    observedAt,
  });
  if (!sourceUpdate) return null;
  if (status === 'pending') {
    return { action: 'update_pending' as const, sourceUpdate };
  }
  if (status === 'granted') {
    return {
      action: 'regrant' as const,
      sourceUpdate,
      idempotencyKey: `referral-source-correction:${rewardId}:${firstPurchase.orderNo}`,
    };
  }
  if (status === 'frozen') {
    return { action: 'update_frozen' as const, sourceUpdate };
  }
  return null;
}

export function referralGrantKey({
  rewardId,
  rewardType,
  sourceOrderNo,
}: {
  rewardId: string;
  rewardType: string;
  sourceOrderNo: string | null;
}) {
  return rewardType === 'first_purchase' && sourceOrderNo
    ? `referral-grant:${rewardId}:${sourceOrderNo}`
    : `referral-grant:${rewardId}`;
}

export function applyReferralCorrectionDebt(
  rewardCredits: number,
  owedCredits: number[]
) {
  let remainingCredits = rewardCredits;
  const remainingOwedCredits = owedCredits.map((owed) => {
    const recoveredCredits = Math.min(remainingCredits, owed);
    remainingCredits -= recoveredCredits;
    return owed - recoveredCredits;
  });
  return { remainingCredits, remainingOwedCredits };
}

export function referralMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function purchaseRewardCredits(packageCredits: number) {
  return Math.floor(packageCredits * 0.1);
}

export function canAttributeReferral({
  inviterUserId,
  referredUserId,
  expiresAt,
  now,
}: {
  inviterUserId: string;
  referredUserId: string;
  expiresAt: Date;
  now: Date;
}) {
  return inviterUserId !== referredUserId && expiresAt > now;
}

export function availableSignupRewardCredits(currentAwardedCredits: number) {
  return Math.max(
    0,
    Math.min(
      REFERRAL_SIGNUP_REWARD_CREDITS,
      REFERRAL_MONTHLY_SIGNUP_CAP - currentAwardedCredits
    )
  );
}

export function referralEventKey(
  eventType: 'first_ai_settlement' | 'first_purchase',
  referredUserId: string
) {
  return `referral:${eventType === 'first_ai_settlement' ? 'first-ai' : 'first-purchase'}:${referredUserId}`;
}

export function referralRewardKey(
  rewardType: 'first_ai_settlement' | 'first_purchase',
  referredUserId: string
) {
  return `referral-reward:${rewardType === 'first_ai_settlement' ? 'first-ai' : 'first-purchase'}:${referredUserId}`;
}

export function paymentRiskRewardStatus(status: string) {
  if (['pending', 'frozen', 'granted'].includes(status)) return 'revoked';
  return status;
}

const REWARD_TRANSITIONS: Record<string, string[]> = {
  pending: ['pending', 'frozen', 'revoked'],
  frozen: ['pending', 'revoked'],
  granted: ['frozen', 'revoked'],
  revoked: [],
};

export function canTransitionReferralReward(from: string, to: string) {
  return Boolean(REWARD_TRANSITIONS[from]?.includes(to));
}

export function nextReferralOutboxState(attempts: number) {
  const nextAttempts = attempts + 1;
  return {
    attempts: nextAttempts,
    status: nextAttempts >= 8 ? 'dead' : 'pending',
    delayMinutes: Math.min(24 * 60, 2 ** nextAttempts * 5),
  };
}

export function canReleaseReferralReward({
  status,
  availableAt,
  now,
  inviterRiskBlocked,
  referredRiskBlocked,
}: {
  status: string;
  availableAt: Date;
  now: Date;
  inviterRiskBlocked: boolean;
  referredRiskBlocked: boolean;
}) {
  return (
    status === 'pending' &&
    availableAt <= now &&
    !inviterRiskBlocked &&
    !referredRiskBlocked
  );
}
