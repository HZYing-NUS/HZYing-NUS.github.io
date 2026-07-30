'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArchiveRestore,
  ArrowRight,
  FileText,
  FolderKanban,
  MessageSquareText,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';

import { WorkspaceEmpty, WorkspaceShell } from './workspace-shell';

type Project = {
  id: string;
  name: string;
  description?: string;
  stage?: string;
  status: string;
  updatedAt: string;
  purgeAt?: string;
};

export function ProjectsWorkspace() {
  const t = useTranslations('ai.chat.workspace');
  const locale = useLocale();
  const { user, setIsShowSignModal } = useAppContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<'active' | 'deleted'>('active');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const payload = await fetch(`/api/projects?status=${status}`).then((r) =>
      r.json()
    );
    if (payload.code === 0) setProjects(payload.data);
  }, [status, user]);
  useEffect(() => {
    const run = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(run);
  }, [load]);

  const create = async () => {
    const payload = await fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }).then((r) => r.json());
    if (payload.code === 0) {
      setCreating(false);
      setName('');
      setDescription('');
      await load();
    }
  };
  const remove = async (id: string, action: string) => {
    await fetch(`/api/projects/${id}?action=${action}`, { method: 'DELETE' });
    await load();
  };

  return (
    <WorkspaceShell
      title={t('projects')}
      description={t('projects_description')}
      actions={
        <Button
          onClick={() => (user ? setCreating(true) : setIsShowSignModal(true))}
        >
          <Plus className="size-4" />
          {t('new_project')}
        </Button>
      }
    >
      <section className="mb-9 grid gap-3 md:grid-cols-3">
        {[
          {
            icon: MessageSquareText,
            title: t('project_benefit_chats'),
            description: t('project_benefit_chats_description'),
          },
          {
            icon: FileText,
            title: t('project_benefit_files'),
            description: t('project_benefit_files_description'),
          },
          {
            icon: Sparkles,
            title: t('project_benefit_memory'),
            description: t('project_benefit_memory_description'),
          },
        ].map((benefit) => {
          const Icon = benefit.icon;
          return (
            <article
              key={benefit.title}
              className="rounded-2xl border border-black/[0.07] bg-white/65 p-5 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#e8eef8] text-[#5474a8] dark:bg-[#28344a] dark:text-[#9bb7e2]">
                <Icon className="size-4" />
              </span>
              <h2 className="mt-5 font-semibold">{benefit.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#6e6e73] dark:text-[#a1a1a6]">
                {benefit.description}
              </p>
            </article>
          );
        })}
      </section>
      <p className="mb-7 text-sm text-[#6e6e73] dark:text-[#a1a1a6]">
        {t('project_optional_hint')}
      </p>
      <div className="dark:border-border mb-7 flex gap-6 border-b border-black/10 text-sm">
        {(['active', 'deleted'] as const).map((item) => (
          <button
            key={item}
            className={`border-b-2 px-1 pb-3 transition-colors ${status === item ? 'border-[#6f8fbe] text-[#45658f] dark:text-[#9bb7e2]' : 'border-transparent text-[#6e6e73] dark:text-[#a1a1a6]'}`}
            onClick={() => setStatus(item)}
          >
            {item === 'active' ? t('active') : t('trash')}
          </button>
        ))}
      </div>
      {creating ? (
        <div className="mb-8 grid gap-3 rounded-2xl border border-black/[0.07] bg-white/70 p-5 shadow-[0_12px_36px_-28px_rgba(31,45,70,0.4)] dark:border-white/10 dark:bg-white/[0.04]">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('project_name')}
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('project_description')}
          />
          <div className="flex gap-2">
            <Button onClick={create}>{t('save')}</Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              {locale === 'zh' ? '取消' : 'Cancel'}
            </Button>
          </div>
        </div>
      ) : null}
      {!user ? (
        <WorkspaceEmpty>
          <button
            className="underline"
            onClick={() => setIsShowSignModal(true)}
          >
            {locale === 'zh' ? '登录后管理项目' : 'Sign in to manage projects'}
          </button>
        </WorkspaceEmpty>
      ) : projects.length === 0 ? (
        <WorkspaceEmpty>
          <FolderKanban className="mx-auto mb-4 size-6 text-[#5474a8] dark:text-[#8faee0]" />
          <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
            {t('empty_projects')}
          </p>
          <p className="mx-auto mt-2 max-w-md leading-6">
            {t('projects_description')}
          </p>
        </WorkspaceEmpty>
      ) : (
        <div className="dark:divide-border dark:border-border divide-y divide-black/10 border-y border-black/10">
          {projects.map((project, index) => (
            <article
              key={project.id}
              className="group grid gap-4 py-6 md:grid-cols-[3rem_1fr_auto] md:items-center"
            >
              <span className="font-mono text-xs text-[#999287]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="text-xl font-medium tracking-tight">
                  {project.name}
                </h2>
                <p className="mt-1 text-sm text-[#6e6e73] dark:text-[#a1a1a6]">
                  {project.description || t('project_no_description')}
                  {project.stage ? ` · ${project.stage}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {status === 'active' ? (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/chat/projects/${project.id}`}>
                        {t('summary')}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(project.id, 'trash')}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => remove(project.id, 'restore')}
                    >
                      <ArchiveRestore className="size-4" />
                      {t('restore')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(project.id, 'purge')}
                    >
                      {t('purge')}
                    </Button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
