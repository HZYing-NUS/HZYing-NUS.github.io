import { respData } from '@/shared/lib/resp';
import { getPublishedSkills } from '@/shared/models/skill';

export async function GET(req: Request) {
  const locale =
    new URL(req.url).searchParams.get('locale') === 'en' ? 'en' : 'zh';
  const results = await getPublishedSkills();
  return respData(
    results.map((result) => ({
      id: result.skill.id,
      slug: result.skill.slug,
      name:
        locale === 'en'
          ? result.skill.nameEn || result.skill.name
          : result.skill.name,
      description:
        locale === 'en'
          ? result.skill.descriptionEn || result.skill.description
          : result.skill.description,
      suitableFor:
        locale === 'en'
          ? result.skill.suitableForEn || result.skill.suitableFor
          : result.skill.suitableFor,
      unsuitableFor:
        locale === 'en'
          ? result.skill.unsuitableForEn || result.skill.unsuitableFor
          : result.skill.unsuitableFor,
      versionId: result.version.id,
      version: result.version.version,
    }))
  );
}
