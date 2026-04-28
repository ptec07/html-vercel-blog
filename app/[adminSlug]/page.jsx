import { notFound } from 'next/navigation';

import {
  buildAdminPath,
  getAdminRuntimeConfig,
  readAdminSession,
} from '../../lib/admin-auth.js';
import { isBlobConfigured } from '../../lib/blob-posts.js';
import { getDefaultPostsDir, listPosts, loadPostBySlug } from '../../lib/posts.js';
import {
  deletePostAction,
  loginAdminAction,
  logoutAdminAction,
  savePostAction,
} from './actions.js';

export const dynamic = 'force-dynamic';

function getMessageText(searchParams) {
  const message = searchParams?.message;
  const error = searchParams?.error;

  if (error === 'invalid') return '로그인 정보가 올바르지 않습니다.';
  if (error === 'auth') return '관리자 인증이 필요합니다.';
  if (error === 'missing') return '필수 입력값을 확인해주세요.';
  if (message === 'welcome') return '관리자 로그인에 성공했습니다.';
  if (message === 'saved') return '글이 저장되었습니다.';
  if (message === 'deleted') return '글이 삭제되었습니다.';
  if (message === 'logout') return '로그아웃되었습니다.';
  return null;
}

async function loadEditablePosts() {
  const posts = await listPosts(getDefaultPostsDir());
  return Promise.all(
    posts.map(async (post) => {
      const fullPost = await loadPostBySlug(getDefaultPostsDir(), post.slug);
      return {
        ...post,
        html: fullPost.html,
      };
    })
  );
}

export default async function AdminPage({ params, searchParams }) {
  const { adminSlug } = await params;
  const query = (await searchParams) || {};
  const config = getAdminRuntimeConfig();

  if (!config.routeSegment || adminSlug !== config.routeSegment) {
    notFound();
  }

  const adminPath = buildAdminPath(config.routeSegment);
  const session = await readAdminSession();
  const notice = getMessageText(query);

  if (!config.secret || !config.username || !config.password) {
    return (
      <main className="page-shell">
        <section className="hero-card">
          <h1>Admin 설정이 비어 있습니다</h1>
          <p className="hero-copy">BLOG_ADMIN_USERNAME, BLOG_ADMIN_PASSWORD, BLOG_ADMIN_SECRET, ADMIN_ROUTE_SEGMENT 값을 먼저 설정해주세요.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page-shell">
        <section className="hero-card admin-shell">
          <p className="eyebrow">Secure Admin</p>
          <h1>관리자 로그인</h1>
          <p className="hero-copy">이 페이지는 비공개 관리자 페이지입니다. 로그인 후 글 수정/삭제/생성이 가능합니다.</p>
          {notice ? <p className="admin-notice">{notice}</p> : null}
          <form action={loginAdminAction} className="admin-form single-column">
            <label>
              <span>아이디</span>
              <input defaultValue={config.username} name="username" type="text" autoComplete="username" />
            </label>
            <label>
              <span>비밀번호</span>
              <input name="password" type="password" autoComplete="current-password" />
            </label>
            <button className="admin-primary-button" type="submit">로그인</button>
          </form>
        </section>
      </main>
    );
  }

  const editablePosts = await loadEditablePosts();

  return (
    <main className="page-shell">
      <section className="hero-card admin-shell">
        <div className="admin-header-row">
          <div>
            <p className="eyebrow">Secure Admin</p>
            <h1>블로그 관리자</h1>
            <p className="hero-copy">별도 비공개 URL에서만 접근 가능한 관리자 화면입니다. 현재 경로: <code>{adminPath}</code></p>
          </div>
          <form action={logoutAdminAction}>
            <button className="admin-secondary-button" type="submit">로그아웃</button>
          </form>
        </div>
        {notice ? <p className="admin-notice">{notice}</p> : null}
        {!isBlobConfigured() ? <p className="admin-notice">Vercel Blob 토큰이 없어서 런타임 CRUD가 비활성화됩니다.</p> : null}
      </section>

      <section className="list-card admin-shell">
        <h2>새 글 만들기</h2>
        <form action={savePostAction} className="admin-form">
          <input name="originalSlug" type="hidden" value="" />
          <label>
            <span>제목</span>
            <input name="title" placeholder="새 글 제목" type="text" />
          </label>
          <label>
            <span>slug (비우면 제목 기반 자동 생성)</span>
            <input name="slug" placeholder="optional-slug" type="text" />
          </label>
          <label>
            <span>발행일</span>
            <input name="publishedAt" type="date" />
          </label>
          <label className="admin-textarea-field">
            <span>HTML 본문</span>
            <textarea name="html" placeholder="<article><h1>새 글</h1><p>내용</p></article>" rows={14} />
          </label>
          <button className="admin-primary-button" type="submit">새 글 저장</button>
        </form>
      </section>

      <section className="list-card admin-shell admin-posts-section">
        <div className="section-head">
          <h2>기존 글 관리</h2>
          <span>{editablePosts.length} posts</span>
        </div>
        <div className="admin-post-grid">
          {editablePosts.map((post) => (
            <form action={savePostAction} className="admin-post-card" key={post.slug}>
              <input name="originalSlug" type="hidden" value={post.slug} />
              <label>
                <span>제목</span>
                <input defaultValue={post.title} name="title" type="text" />
              </label>
              <label>
                <span>slug</span>
                <input defaultValue={post.slug} name="slug" type="text" />
              </label>
              <label>
                <span>발행일</span>
                <input defaultValue={post.publishedAt || ''} name="publishedAt" type="date" />
              </label>
              <label className="admin-textarea-field">
                <span>HTML 본문</span>
                <textarea defaultValue={post.html} name="html" rows={18} />
              </label>
              <div className="admin-card-actions">
                <button className="admin-primary-button" type="submit">수정 저장</button>
                <button className="admin-danger-button" formAction={deletePostAction} name="slug" type="submit" value={post.slug}>삭제</button>
              </div>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
