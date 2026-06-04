'use client';
import Linkify from 'linkify-react';

// Domains that have native apps worth opening directly
const APP_HOSTS = /\b(instagram\.com|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|snapchat\.com)\b/i;

// Android package names for intent:// deep links
const ANDROID_PKG: Record<string, string> = {
  'instagram.com':  'com.instagram.android',
  'tiktok.com':     'com.zhiliaoapp.musically',
  'youtube.com':    'com.google.android.youtube',
  'youtu.be':       'com.google.android.youtube',
  'twitter.com':    'com.twitter.android',
  'x.com':          'com.twitter.android',
  'snapchat.com':   'com.snapchat.android',
};

function pkgForUrl(href: string) {
  for (const [host, pkg] of Object.entries(ANDROID_PKG)) {
    if (href.includes(host)) return pkg;
  }
  return null;
}

function openAppLink(href: string) {
  if (typeof navigator === 'undefined') { window.open(href, '_blank', 'noopener,noreferrer'); return; }
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS     = /iPhone|iPad|iPod/i.test(ua);

  if (isAndroid) {
    const pkg = pkgForUrl(href);
    if (pkg) {
      // Android intent URL: opens app directly; falls back to browser if not installed
      const base     = href.replace(/^https?:\/\//, '');
      const fallback = encodeURIComponent(href);
      window.location.href =
        `intent://${base}#Intent;scheme=https;package=${pkg};S.browser_fallback_url=${fallback};end`;
      return;
    }
  }

  if (isIOS) {
    // iOS Universal Links are triggered by location.href (not window.open).
    // If the app is installed the OS intercepts and opens it; otherwise the
    // browser navigates to the web page normally.
    window.location.href = href;
    return;
  }

  // Desktop — open in new tab as before
  window.open(href, '_blank', 'noopener,noreferrer');
}

export function LinkText({ children }: { children: string }) {
  return (
    <Linkify
      options={{
        className: 'message-link',
        defaultProtocol: 'https',
        render: ({ attributes, content }: { attributes: Record<string, any>; content: string }) => {
          const { href = '#', ...rest } = attributes;
          const isApp = APP_HOSTS.test(href as string);
          return (
            <a
              {...rest}
              href={href}
              target={isApp ? '_self' : '_blank'}
              rel="noopener noreferrer nofollow"
              className="message-link"
              onClick={
                isApp
                  ? (e: React.MouseEvent) => { e.preventDefault(); openAppLink(href as string); }
                  : undefined
              }
            >
              {content}
            </a>
          );
        },
      }}
    >
      {children}
    </Linkify>
  );
}
