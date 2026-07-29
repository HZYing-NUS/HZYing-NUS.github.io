import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildIncompleteCollectionProgress,
  calculateCollectionProgress,
  parseCollectionProgressUpdate,
} from './collection-progress-policy';

test('calculates bounded collection progress', () => {
  assert.deepEqual(calculateCollectionProgress(2, 5), {
    completedCount: 2,
    totalCount: 5,
    percentage: 40,
    complete: false,
  });
  assert.equal(calculateCollectionProgress(9, 3).percentage, 100);
  assert.equal(calculateCollectionProgress(-1, 0).percentage, 0);
});

test('builds only unfinished guide summaries ordered by recent activity', () => {
  const result = buildIncompleteCollectionProgress(
    [
      {
        collectionId: 'guide-1',
        resourceId: 'step-1',
        slug: 'guide-one',
        title: 'Guide one',
        updatedAt: new Date('2026-07-28T00:00:00Z'),
      },
      {
        collectionId: 'guide-2',
        resourceId: 'step-1',
        slug: 'guide-two',
        title: 'Guide two',
        updatedAt: new Date('2026-07-29T00:00:00Z'),
      },
    ],
    new Map([
      ['guide-1', 1],
      ['guide-2', 2],
    ])
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].collectionId, 'guide-2');
  assert.equal(result[0].percentage, 50);
});

test('accepts only explicit step progress updates', () => {
  assert.deepEqual(
    parseCollectionProgressUpdate({
      resourceId: 'resource-1',
      completed: true,
    }),
    { resourceId: 'resource-1', completed: true }
  );
  assert.equal(
    parseCollectionProgressUpdate({ resourceId: '', completed: true }),
    null
  );
  assert.equal(
    parseCollectionProgressUpdate({
      resourceId: 'resource-1',
      completed: 'true',
    }),
    null
  );
});
