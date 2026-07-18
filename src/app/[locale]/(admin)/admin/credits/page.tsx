import type React from 'react';
import { revalidatePath } from 'next/cache';
import { setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requireAllPermissions } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { getUuid } from '@/shared/lib/hash';
import {
  adminFreezeUserCredits,
  adminUnfreezeUserCredits,
  consumeCredits,
  getCredits,
  grantCreditsForUser,
} from '@/shared/models/credit';
import { getPaymentRiskEvents } from '@/shared/models/payment_risk';
import {
  getAdminCreditReservations,
  getAdminUsageLedger,
} from '@/shared/models/usage';
import { findUserById, getUsers, updateUser } from '@/shared/models/user';
import { Crumb } from '@/shared/types/blocks/common';

function requiredText(data: FormData, name: string) {
  const value = String(data.get(name) || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function positiveInteger(data: FormData, name: string) {
  const value = Number(requiredText(data, name));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(data: FormData, name: string) {
  const value = Number(data.get(name) || 0);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

export default async function AdminCreditsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ userId?: string }>;
}) {
  const { locale } = await params;
  const { userId } = await searchParams;
  setRequestLocale(locale);
  await requireAllPermissions({
    codes: [PERMISSIONS.CREDITS_READ, PERMISSIONS.CREDITS_WRITE],
    redirectUrl: '/admin/no-permission',
    locale,
  });
  const isZh = locale === 'zh';
  const [users, reservations, usage, risks, transactions] = await Promise.all([
    getUsers({ limit: 100 }),
    getAdminCreditReservations({ userId, limit: 100 }),
    getAdminUsageLedger({ userId, limit: 100 }),
    getPaymentRiskEvents({ userId, limit: 100 }),
    getCredits({ userId, getUser: true, limit: 100 }),
  ]);
  const selectedUser = userId
    ? users.find((item) => item.id === userId)
    : undefined;
  const crumbs: Crumb[] = [
    { title: isZh ? '后台' : 'Admin', url: '/admin' },
    { title: 'Credit', is_active: true },
  ];

  async function manageCredits(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.CREDITS_READ, PERMISSIONS.CREDITS_WRITE],
      locale,
    });
    const targetUserId = requiredText(data, 'userId');
    const targetUser = await findUserById(targetUserId);
    if (!targetUser) throw new Error('User not found');
    const action = requiredText(data, 'action');
    const description = requiredText(data, 'description');
    const operationId = requiredText(data, 'operationId');

    if (action === 'grant') {
      await grantCreditsForUser({
        user: targetUser,
        credits: positiveInteger(data, 'credits'),
        validDays: nonNegativeInteger(data, 'validDays'),
        description,
        idempotencyKey: `admin-grant:${operationId}`,
      });
    } else if (action === 'deduct') {
      await consumeCredits({
        userId: targetUserId,
        credits: positiveInteger(data, 'credits'),
        scene: 'admin',
        description,
        metadata: JSON.stringify({ operationId }),
        idempotencyKey: `admin-deduct:${operationId}`,
      });
    } else if (action === 'freeze') {
      await adminFreezeUserCredits({
        userId: targetUserId,
        description,
        idempotencyKey: `admin-freeze:${operationId}`,
      });
    } else if (action === 'unfreeze') {
      await adminUnfreezeUserCredits({
        userId: targetUserId,
        description,
        idempotencyKey: `admin-unfreeze:${operationId}`,
      });
    } else {
      throw new Error('Invalid action');
    }
    revalidatePath(`/${locale}/admin/credits`);
  }

  async function updateAiAccess(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.CREDITS_READ, PERMISSIONS.CREDITS_WRITE],
      locale,
    });
    const targetUserId = requiredText(data, 'userId');
    const status = requiredText(data, 'aiAccessStatus');
    if (!['active', 'blocked_admin', 'blocked_payment_risk'].includes(status)) {
      throw new Error('Invalid AI access status');
    }
    await updateUser(targetUserId, { aiAccessStatus: status });
    revalidatePath(`/${locale}/admin/credits`);
  }

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={isZh ? 'Credit 管理' : 'Credit management'}
          description={
            isZh
              ? '查看完整账本、预扣、结算、退款、支付风险，并执行人工发放、扣除、冻结和解冻。'
              : 'Inspect transactions, reservations, settlements, refunds, and payment risk, then perform manual adjustments.'
          }
        />

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {isZh ? '用户筛选与 AI 权限' : 'User filter and AI access'}
            </CardTitle>
            <CardDescription>
              {isZh
                ? '筛选会同时作用于下方全部记录。'
                : 'The filter applies to every table below.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form method="get" className="flex flex-wrap items-end gap-3">
              <Field label={isZh ? '用户' : 'User'}>
                <select
                  name="userId"
                  defaultValue={userId || ''}
                  className="border-input bg-background h-9 min-w-80 rounded-md border px-3 text-sm"
                >
                  <option value="">{isZh ? '全部用户' : 'All users'}</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.email} · {item.aiAccessStatus}
                    </option>
                  ))}
                </select>
              </Field>
              <Button type="submit" variant="outline">
                {isZh ? '筛选' : 'Filter'}
              </Button>
            </form>
            {selectedUser && (
              <form
                action={updateAiAccess}
                className="flex flex-wrap items-end gap-3 border-t pt-5"
              >
                <input type="hidden" name="userId" value={selectedUser.id} />
                <Field label="AI access status">
                  <select
                    name="aiAccessStatus"
                    defaultValue={selectedUser.aiAccessStatus}
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="active">active</option>
                    <option value="blocked_admin">blocked_admin</option>
                    <option value="blocked_payment_risk">
                      blocked_payment_risk
                    </option>
                  </select>
                </Field>
                <Button type="submit">
                  {isZh ? '更新 AI 权限' : 'Update AI access'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{isZh ? '人工操作' : 'Manual operation'}</CardTitle>
            <CardDescription>
              {isZh
                ? '扣除使用到期优先的可用 Credit；冻结和解冻针对该用户全部未使用 grant。所有操作写入独立账本。'
                : 'Deductions use expiring grants first. Freeze and unfreeze apply to all unspent grants and append independent ledger entries.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={manageCredits}
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
            >
              <input type="hidden" name="operationId" value={getUuid()} />
              <Field label={isZh ? '用户' : 'User'} className="xl:col-span-2">
                <select
                  name="userId"
                  defaultValue={userId || ''}
                  required
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="" disabled>
                    {isZh ? '请选择用户' : 'Select a user'}
                  </option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.email}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={isZh ? '操作' : 'Action'}>
                <select
                  name="action"
                  defaultValue="grant"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="grant">grant</option>
                  <option value="deduct">deduct</option>
                  <option value="freeze">freeze</option>
                  <option value="unfreeze">unfreeze</option>
                </select>
              </Field>
              <Field label="Credit">
                <Input
                  name="credits"
                  type="number"
                  min="1"
                  defaultValue="1"
                  required
                />
              </Field>
              <Field
                label={
                  isZh ? '有效天数（0 为长期）' : 'Valid days (0 = no expiry)'
                }
              >
                <Input
                  name="validDays"
                  type="number"
                  min="0"
                  defaultValue="0"
                />
              </Field>
              <Field
                label={isZh ? '原因' : 'Reason'}
                className="md:col-span-2 xl:col-span-4"
              >
                <Input
                  name="description"
                  required
                  placeholder={
                    isZh ? '必须填写审计原因' : 'Required audit reason'
                  }
                />
              </Field>
              <div className="flex items-end">
                <Button type="submit">{isZh ? '执行' : 'Execute'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <AdminTable
          title={isZh ? 'Credit 交易账本' : 'Credit transaction ledger'}
          headers={[
            isZh ? '时间' : 'Time',
            isZh ? '用户' : 'User',
            'Type',
            'Scene',
            'Credit',
            isZh ? '剩余' : 'Remaining',
            'Status',
            isZh ? '说明' : 'Description',
          ]}
          rows={transactions.map((item) => [
            item.createdAt.toLocaleString(locale),
            item.user?.email || item.userId,
            item.transactionType,
            item.transactionScene || '-',
            item.credits,
            item.remainingCredits,
            item.status,
            item.description || '-',
          ])}
        />
        <AdminTable
          title={isZh ? '预扣记录' : 'Reservations'}
          headers={[
            isZh ? '时间' : 'Time',
            isZh ? '用户' : 'User',
            'Request',
            isZh ? '冻结' : 'Reserved',
            isZh ? '结算' : 'Settled',
            isZh ? '退回' : 'Refunded',
            'Status',
            isZh ? '失败原因' : 'Failure',
          ]}
          rows={reservations.map(({ reservation, userEmail }) => [
            reservation.createdAt.toLocaleString(locale),
            userEmail,
            reservation.requestId,
            reservation.reservedCredits,
            reservation.settledCredits,
            reservation.refundedCredits,
            reservation.status,
            reservation.failureReason || '-',
          ])}
        />
        <AdminTable
          title={isZh ? '用量与结算账本' : 'Usage and settlement ledger'}
          headers={[
            isZh ? '时间' : 'Time',
            isZh ? '用户' : 'User',
            'Type',
            'Token',
            isZh ? '内部成本' : 'Internal cost',
            isZh ? '零售成本' : 'Retail cost',
            isZh ? '扣除' : 'Charged',
            isZh ? '退回' : 'Refunded',
            'Status',
          ]}
          rows={usage.map(({ usage: item, userEmail }) => [
            item.createdAt.toLocaleString(locale),
            userEmail,
            item.entryType,
            `${item.inputTokens}/${item.outputTokens}`,
            `$${item.internalCostUsd}`,
            `$${item.retailCostUsd}`,
            item.chargedCredits,
            item.refundedCredits,
            item.status,
          ])}
        />
        <AdminTable
          title={isZh ? '支付风险事件' : 'Payment risk events'}
          headers={[
            isZh ? '时间' : 'Time',
            'Provider',
            isZh ? '事件' : 'Event',
            isZh ? '用户' : 'User',
            isZh ? '订单' : 'Order',
            'Status',
          ]}
          rows={risks.map((item) => [
            item.createdAt.toLocaleString(locale),
            item.provider,
            item.eventType,
            item.userId || '-',
            item.orderNo || '-',
            item.status,
          ])}
        />
      </Main>
    </>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function AdminTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{rows.length} records</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {headers.map((header) => (
                <th
                  key={header}
                  className="p-2 text-left font-medium whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b last:border-0">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="max-w-72 truncate p-2 whitespace-nowrap"
                  >
                    {cellIndex === row.length - 2 &&
                    typeof cell === 'string' ? (
                      <Badge variant="outline">{cell}</Badge>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={headers.length}
                  className="text-muted-foreground p-6 text-center"
                >
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
