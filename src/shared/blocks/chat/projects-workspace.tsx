'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArchiveRestore, ArrowRight, Plus, Trash2 } from 'lucide-react';
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
      <div className="dark:border-border mb-7 flex gap-6 border-b border-black/10 text-sm">
        {(['active', 'deleted'] as const).map((item) => (
          <button
            key={item}
            className={`border-b-2 px-1 pb-3 ${status === item ? 'border-[#c45d38] text-[#9f4529]' : 'border-transparent text-[#777268]'}`}
            onClick={() => setStatus(item)}
          >
            {item === 'active' ? t('active') : t('trash')}
          </button>
        ))}
      </div>
      {creating ? (
        <div className="dark:bg-card mb-8 grid gap-3 border-l-2 border-[#c45d38] bg-white/45 p-5">
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
        <WorkspaceEmpty>{t('empty_projects')}</WorkspaceEmpty>
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
                <p className="dark:text-muted-foreground mt-1 text-sm text-[#6f6a61]">
                  {project.description || '—'}
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
