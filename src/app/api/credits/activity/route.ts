import { respData, respErr } from '@/shared/lib/resp';
import { getRemainingCredits } from '@/shared/models/credit';
import { getCreditReservations, getUsageLedger } from '@/shared/models/usage';
import { getUserInfo } from '@/shared/models/user';

export async function GET() {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const [balance, reservations, ledger] = await Promise.all([
    getRemainingCredits(user.id),
    getCreditReservations(user.id),
    getUsageLedger(user.id),
  ]);
  return respData({
    balance,
    reservations: reservations.map((item: (typeof reservations)[number]) => ({
      id: item.id,
      requestId: item.requestId,
      reservedCredits: item.reservedCredits,
      settledCredits: item.settledCredits,
      refundedCredits: item.refundedCredits,
      status: item.status,
      expiresAt: item.expiresAt,
      settledAt: item.settledAt,
      createdAt: item.createdAt,
      interrupted: Boolean(item.failureReason),
    })),
    ledger: ledger.map((item: (typeof ledger)[number]) => ({
      id: item.id,
      requestId: item.requestId,
      reservationId: item.reservationId,
      entryType: item.entryType,
      inputTokens: item.inputTokens,
      outputTokens: item.outputTokens,
      cacheReadTokens: item.cacheReadTokens,
      cacheWriteTokens: item.cacheWriteTokens,
      chargedCredits: item.chargedCredits,
      refundedCredits: item.refundedCredits,
      status: item.status,
      createdAt: item.createdAt,
      interrupted: Boolean(item.failureReason),
    })),
  });
}
