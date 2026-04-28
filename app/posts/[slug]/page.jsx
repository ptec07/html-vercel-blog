import Link from 'next/link';
import { notFound } from 'next/navigation';
import PostUrlBox from '../../../components/post-url-box';
import { getDefaultPostsDir, loadPostBySlug } from '../../../lib/posts';
import { buildDisplayedPostUrl, buildPostUrl } from '../../../lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    const post = await loadPostBySlug(getDefaultPostsDir(), slug);
    return {
      title: `${post.title} | HTML Blog on Vercel`,
    };
  } catch {
    return {
      title: 'Post not found | HTML Blog on Vercel',
    };
  }
}

export default async function PostPage({ params }) {
  const { slug } = await params;

  let post;
  try {
    post = await loadPostBySlug(getDefaultPostsDir(), slug);
  } catch {
    notFound();
  }

  const postUrl = buildPostUrl(post.slug);
  const displayUrl = buildDisplayedPostUrl(postUrl);

  return (
    <main className="page-shell">
      <article className="post-shell">
        <Link className="back-link" href="/">← 목록으로</Link>
        <header className="post-header">
          <p className="eyebrow">HTML Post</p>
          <h1>{post.title}</h1>
          <p className="post-date">{post.publishedAt || '날짜 정보 없음'}</p>
          <PostUrlBox postUrl={postUrl} displayUrl={displayUrl} />
        </header>
        <section className="embedded-post" dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>
    </main>
  );
}
