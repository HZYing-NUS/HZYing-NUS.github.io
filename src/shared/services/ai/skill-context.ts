import 'server-only';

import { findAvailableSkillVersionById } from '@/shared/models/skill';

import { selectSkillReferences } from './skill-references';

export async function getRuntimeSkillContext(
  skillVersionId: string,
  locale: 'zh' | 'en',
  question = ''
) {
  const selected = await findAvailableSkillVersionById(skillVersionId);
  if (!selected) throw new Error('SKILL_VERSION_NOT_AVAILABLE');

  const name =
    locale === 'en'
      ? selected.skill.nameEn || selected.skill.name
      : selected.skill.name;
  const references = selectSkillReferences({
    references: selected.version.referenceMaterials,
    question,
    locale,
  });
  if (locale === 'en') {
    const version = selected.version;
    if (
      !version.systemPromptEn ||
      !version.methodologyEn ||
      !version.diagnosticStepsEn ||
      !version.followUpQuestionsEn ||
      !version.quickOutputFormatEn ||
      !version.deepOutputFormatEn ||
      !version.completionConditionsEn
    ) {
      throw new Error('SKILL_ENGLISH_DEFINITION_MISSING');
    }
    return {
      name,
      slug: selected.skill.slug,
      version: version.version,
      versionId: version.id,
      system: [
        version.systemPromptEn,
        version.methodologyEn,
        `Required steps: ${JSON.stringify(version.diagnosticStepsEn)}`,
        `Follow-up questions: ${JSON.stringify(version.followUpQuestionsEn)}`,
        `Quick output format: ${version.quickOutputFormatEn}`,
        `Deep output format: ${version.deepOutputFormatEn}`,
        `Completion conditions: ${version.completionConditionsEn}`,
        ...references.map(
          (reference) =>
            `Relevant reference (${reference.id}): ${reference.content}`
        ),
      ].join('\n\n'),
    };
  }

  return {
    name,
    slug: selected.skill.slug,
    version: selected.version.version,
    versionId: selected.version.id,
    system: [
      selected.version.systemPrompt,
      selected.version.methodology,
      `固定诊断步骤：${JSON.stringify(selected.version.diagnosticSteps)}`,
      `追问问题：${JSON.stringify(selected.version.followUpQuestions)}`,
      `快速输出格式：${selected.version.quickOutputFormat}`,
      `深度输出格式：${selected.version.deepOutputFormat}`,
      `结束条件：${selected.version.completionConditions}`,
      ...references.map(
        (reference) => `相关专题（${reference.id}）：${reference.content}`
      ),
    ].join('\n\n'),
  };
}
