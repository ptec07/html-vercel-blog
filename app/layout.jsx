import './globals.css';

export const metadata = {
  title: 'HTML Blog on Vercel',
  description: '깔끔하게 변환한 HTML 글을 보여주는 정적 블로그',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
