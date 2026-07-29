import assert from 'node:assert/strict';
import test from 'node:test';

import {
  rankWorkspaceRecommendationCandidates,
  resolveWorkspaceStage,
} from './recommendations';

test('workspace stage resolution accepts project stage labels in Chinese and English', () => {
  assert.equal(resolveWorkspaceStage(['正在做需求验证'])?.key, 'validate');
  assert.equal(resolveWorkspaceStage(['Build the MVP'])?.key, 'develop');
  assert.equal(resolveWorkspaceStage(['准备部署上线'])?.key, 'launch');
  assert.equal(
    resolveWorkspaceStage(['platform:stage:validate-the-idea'])?.key,
    'validate'
  );
  assert.equal(resolveWorkspaceStage(['cooperate with users']), null);
});

test('workspace recommendations prefer exact stage matches before featured fallback', () => {
  const stage = resolveWorkspaceStage(['分析优化']);
  const ranked = rankWorkspaceRecommendationCandidates(
    [
      { id: 'featured', featured: true, stageValues: ['开发搭建'] },
      { id: 'matched', stageValues: ['Measure and optimize'] },
      { id: 'keyword', searchText: 'SEO and analytics guide' },
    ],
    stage,
    3
  );

  assert.deepEqual(
    ranked.map((item) => item.id),
    ['matched', 'keyword', 'featured']
  );
});

test('workspace recommendations use featured content when no project stage is known', () => {
  const ranked = rankWorkspaceRecommendationCandidates(
    [{ id: 'recent' }, { id: 'featured', featured: true }],
    null,
    2
  );

  assert.deepEqual(
    ranked.map((item) => item.id),
    ['featured', 'recent']
  );
});
