'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { authClient, signUp } from '@/core/auth/client';
import { defaultLocale } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useAppContext } from '@/shared/contexts/app';
import {
  localizeCallbackPath,
  safeInternalCallbackPath,
  stripCallbackLocale,
} from '@/shared/lib/auth-callback';

import { SocialProviders } from './social-providers';

export function SignUpForm({
  callbackUrl = '/',
  className,
  onSwitchToSignIn,
}: {
  callbackUrl: string;
  className?: string;
  onSwitchToSignIn?: () => void;
}) {
  const t = useTranslations('common.sign');
  const router = useRouter();
  const locale = useLocale();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { configs, setIsShowSignModal, setUser, fetchUserInfo } =
    useAppContext();

  const isGoogleAuthEnabled = configs.google_auth_enabled === 'true';
  const isGithubAuthEnabled = configs.github_auth_enabled === 'true';
  const isEmailAuthEnabled =
    configs.email_auth_enabled !== 'false' ||
    (!isGoogleAuthEnabled && !isGithubAuthEnabled);
  const emailVerificationEnabled =
    configs.email_verification_enabled === 'true';

  callbackUrl = localizeCallbackPath(
    safeInternalCallbackPath(callbackUrl),
    locale
  );

  const base = locale !== defaultLocale ? `/${locale}` : '';

  const reportAffiliate = ({
    userEmail,
    stripeCustomerId,
  }: {
    userEmail: string;
    stripeCustomerId?: string;
  }) => {
    if (typeof window === 'undefined' || !configs) {
      return;
    }

    const windowObject = window as any;

    if (configs.affonso_enabled === 'true' && windowObject.Affonso) {
      windowObject.Affonso.signup(userEmail);
    }

    if (configs.promotekit_enabled === 'true' && windowObject.promotekit) {
      windowObject.promotekit.refer(userEmail, stripeCustomerId);
    }
  };

  const handleSignUp = async () => {
    if (loading) {
      return;
    }

    if (!email || !password || !name) {
      toast.error('email, password and name are required');
      return;
    }

    setLoading(true);

    try {
      await signUp.email(
        {
          email,
          password,
          name,
          callbackURL: callbackUrl,
        },
        {
          onRequest: () => {},
          onResponse: () => {},
          onSuccess: async () => {
            reportAffiliate({ userEmail: email });

            if (emailVerificationEnabled) {
              const normalizedCallbackUrl = stripCallbackLocale(
                callbackUrl,
                locale
              );
              const verifyPath = `/verify-email?sent=1&email=${encodeURIComponent(
                email
              )}&callbackUrl=${encodeURIComponent(normalizedCallbackUrl)}`;

              setIsShowSignModal(false);
              router.push(`${base}${verifyPath}`);
              return;
            }

            try {
              const res: any = await authClient.getSession();
              const freshUser = res?.data?.user ?? res?.user ?? null;
              if (freshUser) {
                setUser(freshUser);
                fetchUserInfo();
              }
            } catch {}
            setIsShowSignModal(false);
            setLoading(false);
            window.location.assign(callbackUrl);
          },
          onError: (e: any) => {
            const errorCode = e?.error?.code || '';
            const errorMessage = e?.error?.message || '';
            const isExistingUser =
              errorCode === 'USER_ALREADY_EXISTS' ||
              errorMessage.includes('User already exists');

            if (emailVerificationEnabled && isExistingUser) {
              void (async () => {
                try {
                  const statusResponse = await fetch(
                    '/api/user/is-email-verified',
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email }),
                    }
                  );
                  const statusResult = await statusResponse.json();
                  const status = statusResult?.data;

                  if (!status?.emailVerified) {
                    const normalizedCallbackUrl = stripCallbackLocale(
                      callbackUrl,
                      locale
                    );
                    const verifyPath = `/verify-email?sent=1&email=${encodeURIComponent(
                      email
                    )}&callbackUrl=${encodeURIComponent(normalizedCallbackUrl)}`;
                    const resendResult = await authClient.sendVerificationEmail(
                      {
                        email,
                        callbackURL: `${base}${normalizedCallbackUrl || '/'}`,
                      }
                    );
                    if (resendResult?.error) {
                      throw new Error(resendResult.error.message);
                    }
                    toast.success(t('pending_email_signup'));
                    setIsShowSignModal(false);
                    router.push(`${base}${verifyPath}`);
                    return;
                  }
                } catch (error: any) {
                  toast.error(
                    error?.message || 'send verification email failed'
                  );
                  setLoading(false);
                  return;
                }

                toast.error(errorMessage || 'sign up failed');
                setLoading(false);
              })();
              return;
            }

            toast.error(errorMessage || 'sign up failed');
            setLoading(false);
          },
        }
      );
    } catch (e: any) {
      toast.error(e?.message || 'sign up failed');
      setLoading(false);
    }
  };

  return (
    <div className={`w-full md:max-w-md ${className}`}>
      <div className="grid gap-4">
        {isEmailAuthEnabled && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSignUp();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="signup-name">{t('name_title')}</Label>
              <Input
                id="signup-name"
                type="text"
                placeholder={t('name_placeholder')}
                required
                onChange={(e) => {
                  setName(e.target.value);
                }}
                value={name}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="signup-email">{t('email_title')}</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder={t('email_placeholder')}
                required
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                value={email}
              />
              {emailVerificationEnabled && (
                <p className="text-xs text-amber-600">
                  {t('email_verification_hint')}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="signup-password">{t('password_title')}</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder={t('password_placeholder')}
                autoComplete="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <p>{t('sign_up_title')}</p>
              )}
            </Button>
          </form>
        )}

        <SocialProviders
          configs={configs}
          callbackUrl={callbackUrl || '/'}
          loading={loading}
          setLoading={setLoading}
        />
      </div>
      {isEmailAuthEnabled && (
        <div className="flex w-full justify-center border-t py-4">
          <p className="text-center text-xs text-neutral-500">
            {t('already_have_account')}
            <span
              className="cursor-pointer underline dark:text-white/70"
              onClick={onSwitchToSignIn}
            >
              {t('sign_in_title')}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
