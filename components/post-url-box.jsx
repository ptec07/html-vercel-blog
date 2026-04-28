'use client';

import React, { useEffect, useState } from 'react';

export default function PostUrlBox({ postUrl, displayUrl = postUrl }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(postUrl);
        setCopied(true);
      }
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="post-url-box">
      <div className="post-url-meta-row">
        <span className="post-url-label">URL</span>
        <button aria-label="URL 복사" className="post-url-copy" type="button" onClick={handleCopy}>
          <svg aria-hidden="true" className="post-url-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="10" height="10" rx="2" />
            <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
          </svg>
        </button>
      </div>
      <a className="post-url-link" href={postUrl}>
        {displayUrl}
      </a>
      <div aria-live="polite" className={`post-url-toast${copied ? ' is-visible' : ''}`} role="status">
        복사 완료
      </div>
    </div>
  );
}
