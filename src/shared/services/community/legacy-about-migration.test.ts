import assert from 'node:assert/strict';
import test from 'node:test';

import { mapLegacyAboutToCommunityProfile } from './legacy-about-migration';

test('legacy About maps localized content into a template profile without inventing focus areas', () => {
  const profile = mapLegacyAboutToCommunityProfile(
    {
      名字: { zh: '黄梓颖', en: 'Ziying Huang' },
      一句话标签: { zh: '出海产品创造者', en: 'Global product creator' },
      自我介绍: { zh: '中文介绍', en: 'English introduction' },
      头像图片: 'https://example.com/avatar.png',
      GitHub: 'https://github.com/example',
      教育列表: [{ 学校: { zh: '学校', en: 'School' } }],
      作品列表: [{ 标题: { zh: '作品', en: 'Work' }, 链接: 'javascript:bad' }],
    },
    'zh'
  );

  assert.equal(profile.displayName, '黄梓颖');
  assert.equal(profile.aboutEn, 'English introduction');
  assert.equal(profile.socialLinks[0]?.url, 'https://github.com/example');
  assert.equal(profile.works[0]?.title, '作品');
  assert.equal(profile.works[0]?.titleEn, 'Work');
  assert.equal(profile.works[0]?.url, undefined);
  assert.equal(profile.experience[0]?.titleEn, 'School');
  assert.deepEqual(profile.focusAreas, []);
});
