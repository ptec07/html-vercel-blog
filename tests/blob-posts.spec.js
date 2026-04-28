import { describe, expect, it } from 'vitest';

import {
  deletePostRecord,
  findPostRecordBySlug,
  sortPostRecords,
  upsertPostRecord,
} from '../lib/blob-posts.js';

describe('sortPostRecords', () => {
  it('sorts newer posts first and keeps deterministic slug ordering', () => {
    const sorted = sortPostRecords([
      { slug: 'b-post', title: 'B', publishedAt: '2026-04-20' },
      { slug: 'a-post', title: 'A', publishedAt: '2026-04-20' },
      { slug: 'older-post', title: 'Older', publishedAt: '2026-04-01' },
    ]);

    expect(sorted.map((post) => post.slug)).toEqual(['a-post', 'b-post', 'older-post']);
  });
});

describe('upsertPostRecord', () => {
  it('replaces an existing slug and keeps the collection sorted', () => {
    const records = upsertPostRecord(
      [
        { slug: 'demo', title: 'Old title', publishedAt: '2026-04-01' },
        { slug: 'other', title: 'Other', publishedAt: '2026-03-01' },
      ],
      { slug: 'demo', title: 'New title', publishedAt: '2026-04-21' }
    );

    expect(records[0]).toEqual({ slug: 'demo', title: 'New title', publishedAt: '2026-04-21' });
    expect(records).toHaveLength(2);
  });
});

describe('deletePostRecord', () => {
  it('removes a slug from the index', () => {
    const records = deletePostRecord(
      [
        { slug: 'demo', title: 'Demo', publishedAt: '2026-04-01' },
        { slug: 'other', title: 'Other', publishedAt: '2026-03-01' },
      ],
      'demo'
    );

    expect(records.map((post) => post.slug)).toEqual(['other']);
  });
});

describe('findPostRecordBySlug', () => {
  it('matches both raw and encoded slugs', () => {
    const post = findPostRecordBySlug(
      [
        { slug: '실전-업무용-새-지능-계층', title: 'Demo', publishedAt: '2026-04-01' },
      ],
      '%EC%8B%A4%EC%A0%84-%EC%97%85%EB%AC%B4%EC%9A%A9-%EC%83%88-%EC%A7%80%EB%8A%A5-%EA%B3%84%EC%B8%B5'
    );

    expect(post?.slug).toBe('실전-업무용-새-지능-계층');
  });
});
