import { respData } from '@/shared/lib/resp';
import { findPublishedSkill } from '@/shared/models/skill';

export async function GET() {
  const result = await findPublishedSkill('product-idea-diagnosis');
  return respData(
    result
      ? [
          {
            id: result.skill.id,
            slug: result.skill.slug,
            name: result.skill.name,
            description: result.skill.description,
            suitableFor: result.skill.suitableFor,
            unsuitableFor: result.skill.unsuitableFor,
            versionId: result.version.id,
          },
        ]
      : []
  );
}
