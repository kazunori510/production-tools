import "./globals.css";
import BottomNav from "./BottomNav";

export const metadata = {
  title: "現場ツール | 機材・車両",
  description: "機材管理・車両予約を現場から確認するための業務ツール",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <div className="slate-bar" />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
