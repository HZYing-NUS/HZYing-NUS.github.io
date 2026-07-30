'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText, MessageSquare, Plus, Save, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Link, useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';

import { WorkspaceEmpty, WorkspaceShell } from './workspace-shell';

const fields = [
  'name',
  'description',
  'targetAudience',
  'stage',
  'technology',
  'confirmedDecisions',
  'completedItems',
  'currentProblem',
  'nextSteps',
  'importantConclusions',
  'recentProgress',
] as const;

const fieldTranslationKeys = {
  name: 'project_name',
  description: 'project_description',
  targetAudience: 'target_audience',
  stage: 'stage',
  technology: 'technology',
  confirmedDecisions: 'confirmed_decisions',
  completedItems: 'completed_items',
  currentProblem: 'current_problem',
  nextSteps: 'next_steps',
  importantConclusions: 'important_conclusions',
  recentProgress: 'recent_progress',
} as const;

export function ProjectDetailWorkspace() {
  const t = useTranslations('ai.chat.workspace');
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const id = params.id as string;
  const [payload, setPayload] = useState<any>(null);
  const [project, setProject] = useState<any>({});
  const [memory, setMemory] = useState('');
  const load = useCallback(async () => {
    const p = await fetch(`/api/projects/${id}`).then((r) => r.json());
    if (p.code === 0) {
      setPayload(p.data);
      setProject(p.data.project);
    }
  }, [id]);
  useEffect(() => {
    const run = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(run);
  }, [load]);
  const save = async () => {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(project),
    });
    await load();
  };
  const start = async () => {
    const p = await fetch('/api/chat/new', {
      method: 'POST',
      body: JSON.stringify({
        message: {},
        body: { model: 'auto', projectId: id },
      }),
    }).then((r) => r.json());
    if (p.code === 0) router.push(`/chat/${p.data.id}`, { locale });
  };
  const addMemory = async () => {
    await fetch(`/api/projects/${id}/memories`, {
      method: 'POST',
      body: JSON.stringify({ content: memory, type: 'related' }),
    });
    setMemory('');
    await load();
  };
  const deleteMemory = async (memoryId: string) => {
    await fetch(`/api/projects/${id}/memories?memoryId=${memoryId}`, {
      method: 'DELETE',
    });
    await load();
  };
  const updateMemory = async (memoryId: string, content: string) => {
    const normalized = content.trim();
    if (!normalized) return;
    await fetch(`/api/projects/${id}/memories`, {
      method: 'PATCH',
      body: JSON.stringify({ memoryId, content: normalized }),
    });
    await load();
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const form = new FormData();
    form.set('projectId', id);
    Array.from(files)
      .slice(0, 5)
      .forEach((file) => form.append('files', file));
    await fetch('/api/files', { method: 'POST', body: form });
    await load();
  };
  const removeFile = async (fileId: string) => {
    await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
    await load();
  };
  const restore = async () => {
    await fetch(`/api/projects/${id}?action=restore`, { method: 'DELETE' });
    await load();
  };
  if (!payload)
    return (
      <WorkspaceShell title="…">
        <WorkspaceEmpty>Loading</WorkspaceEmpty>
      </WorkspaceShell>
    );
  const isDeleted = project.status === 'deleted';
  return (
    <WorkspaceShell
      title={project.name}
      description={project.description}
      actions={
        <div className="flex gap-2">
          {isDeleted ? <Button onClick={restore}>{t('restore')}</Button> : null}
          <Button variant="outline" onClick={save} disabled={isDeleted}>
            <Save className="size-4" />
            {t('save')}
          </Button>
          <Button onClick={start} disabled={isDeleted}>
            <Plus className="size-4" />
            {t('new_chat')}
          </Button>
        </div>
      }
    >
      <section className="dark:border-border grid gap-x-8 gap-y-6 border-b border-black/10 pb-10 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field} className={field === 'name' ? 'md:col-span-2' : ''}>
            <Label className="mb-2 text-xs text-[#6e6e73] dark:text-[#a1a1a6]">
              {t(fieldTranslationKeys[field])}
            </Label>
            {field === 'name' || field === 'stage' ? (
              <Input
                disabled={isDeleted}
                value={project[field] || ''}
                onChange={(e) =>
                  setProject({ ...project, [field]: e.target.value })
                }
              />
            ) : (
              <Textarea
                disabled={isDeleted}
                value={project[field] || ''}
                onChange={(e) =>
                  setProject({ ...project, [field]: e.target.value })
                }
              />
            )}
          </div>
        ))}
      </section>
      <section className="grid gap-10 py-10 lg:grid-cols-3">
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-medium">
            <MessageSquare className="size-4" />
            {t('chats')}
          </h2>
          <div className="space-y-2">
            {payload.chats.map((chat: any) => (
              <Link
                key={chat.id}
                className="block border-b border-black/10 py-2 text-sm transition-colors hover:text-[#5474a8] dark:border-white/10 dark:hover:text-[#8faee0]"
                href={`/chat/${chat.id}`}
              >
                {chat.title}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">{t('memories')}</h2>
            <div className="flex items-center gap-2">
              <Label className="text-xs">{t('auto_memory')}</Label>
              <Switch
                disabled={isDeleted}
                checked={project.autoMemoryEnabled}
                onCheckedChange={(checked) =>
                  setProject({ ...project, autoMemoryEnabled: checked })
                }
              />
            </div>
          </div>
          <div className="mb-3 flex gap-2">
            <Input
              disabled={isDeleted}
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              placeholder={t('new_memory')}
            />
            <Button size="icon" onClick={addMemory} disabled={isDeleted}>
              <Plus className="size-4" />
            </Button>
          </div>
          {payload.memories.map((item: any) => (
            <div
              key={item.id}
              className="group flex gap-2 border-b border-black/10 py-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <Textarea
                  className="min-h-20 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  defaultValue={item.content}
                  disabled={isDeleted}
                  onBlur={(event) => updateMemory(item.id, event.target.value)}
                />
                {item.sourceChatId ? (
                  <Link
                    className="text-muted-foreground mt-1 inline-block font-mono text-[10px] hover:underline"
                    href={`/chat/${item.sourceChatId}`}
                  >
                    {locale === 'zh' ? '查看来源对话' : 'View source chat'}
                  </Link>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMemory(item.id)}
                disabled={isDeleted}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-medium">
            <FileText className="size-4" />
            {t('files')}
          </h2>
          <label
            className={`mb-4 block border border-dashed border-black/20 p-4 text-center text-sm ${isDeleted ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <input
              className="hidden"
              type="file"
              multiple
              disabled={isDeleted}
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
              onChange={(e) => upload(e.target.files)}
            />
            {t('upload')}
          </label>
          {payload.files.map((file: any) => (
            <div
              key={file.id}
              className="flex items-center gap-2 border-b border-black/10 py-3 text-sm"
            >
              <a
                href={`/api/files/${file.id}`}
                className="min-w-0 flex-1 truncate"
              >
                <span>{file.originalName}</span>
                <span className="ml-2 font-mono text-[10px] text-[#6e6e73] dark:text-[#a1a1a6]">
                  {file.parseStatus}
                  {file.parseError === 'PDF_PARSER_NOT_CONFIGURED'
                    ? ` · ${t('pdf_pending')}`
                    : ''}
                </span>
              </a>
              <Button
                variant="ghost"
                size="icon"
                disabled={isDeleted}
                onClick={() => removeFile(file.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}
