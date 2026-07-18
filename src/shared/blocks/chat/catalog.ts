import { BotIcon, RouteIcon } from 'lucide-react';

export type ChatModelOption = {
  id: string;
  label: string;
  description: string;
  icon: typeof RouteIcon;
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
    label: 'Auto',
    description: '',
    icon: RouteIcon,
  },
];

export const chatSkills: ChatSkillOption[] = [
  {
    id: 'general',
    label: 'General chat',
    description: '',
    icon: BotIcon,
  },
];

export function getChatModel(modelId: string) {
  return chatModels.find((model) => model.id === modelId) ?? chatModels[0];
}
