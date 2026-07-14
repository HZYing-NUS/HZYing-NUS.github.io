import {
  BotIcon,
  BrainCircuitIcon,
  Code2Icon,
  LightbulbIcon,
} from 'lucide-react';

export type ChatModelOption = {
  id: string;
  label: string;
  description: string;
  creditCost: number;
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
    id: 'deepseek/deepseek-r1',
    label: 'DeepSeek',
    description: '推理与复杂问题',
    creditCost: 1,
    icon: BrainCircuitIcon,
  },
  {
    id: 'anthropic/claude-4.5-sonnet',
    label: 'Claude Code',
    description: '代码与技术方案',
    creditCost: 2,
    icon: Code2Icon,
  },
  {
    id: 'moonshotai/kimi-k2-thinking',
    label: 'Kimi',
    description: '长文本与深度思考',
    creditCost: 1,
    icon: LightbulbIcon,
  },
];

export const chatSkills: ChatSkillOption[] = [
  {
    id: 'general',
    label: '通用助手',
    description: '适合日常提问、写作和分析',
    icon: BotIcon,
  },
  {
    id: 'ask-liuxiaopai',
    label: '/ask-liuxiaopai',
    description: '产品判断、MVP、定价与首个付费用户',
    icon: LightbulbIcon,
  },
];

export function getChatModel(modelId: string) {
  return chatModels.find((model) => model.id === modelId) ?? chatModels[0];
}

export function getChatSkill(skillId: string) {
  return chatSkills.find((skill) => skill.id === skillId) ?? chatSkills[0];
}
