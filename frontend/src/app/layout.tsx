import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "OMR Auto Grading",
  description: "Cham bai trac nghiem tu dong bang camera dien thoai"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            OMR Auto Grading
          </Link>
          <nav>
            <Link href="/answer-key">Đáp án</Link>
            <Link href="/scan">Quét bài</Link>
            <Link href="/results">Kết quả</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
