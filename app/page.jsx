import Link from 'next/link';
import { getDefaultPostsDir, listPosts } from '../lib/posts';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const posts = await listPosts(getDefaultPostsDir());

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Simple Blog</p>
        <h1>Mingyu의 Simple Blog</h1>
        <p className="hero-copy">일상의 사소한 정보를 기록하는 나만의 심플한 블로그</p>
      </section>

      <section className="list-card">
        <div className="section-head">
          <h2>글 목록</h2>
          <span>{posts.length} posts</span>
        </div>
        <div className="post-list">
          {posts.map((post) => (
            <Link className="post-item" href={`/posts/${encodeURIComponent(post.slug)}`} key={post.slug}>
              <div>
                <h3>{post.title}</h3>
                <p>{post.publishedAt || '날짜 없음'}</p>
              </div>
              <span>읽기 →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
