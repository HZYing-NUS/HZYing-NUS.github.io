import { BotIcon, BrainCircuitIcon } from 'lucide-react';

export type ChatModelOption = {
  id: string;
  label: string;
  description: string;
  icon: typeof BrainCircuitIcon;
};

export type ChatSkillOption = {
  id: string;
  label: string;
  description: string;
  icon: typeof BotIcon;
};

export const chatModels: ChatModelOption[] = [
  {
    id: 'auto',
    label: '自动选择',
    description: '由 WebTools 选择默认模型',
    icon: BrainCircuitIcon,
  },
];

export const chatSkills: ChatSkillOption[] = [
  {
    id: 'general',
    label: '通用助手',
    description: '适合日常提问、写作和分析',
    icon: BotIcon,
  },
];

export function getChatModel(modelId: string) {
  return chatModels.find((model) => model.id === modelId) ?? chatModels[0];
}
