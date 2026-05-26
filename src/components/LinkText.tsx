'use client';
import Linkify from 'linkify-react';

export function LinkText({ children }: { children: string }) {
  return (
    <Linkify
      options={{
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
        className: 'message-link',
        defaultProtocol: 'https',
      }}
    >
      {children}
    </Linkify>
  );
}
