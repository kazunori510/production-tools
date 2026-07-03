import Link from "next/link";

export default function Home() {
  return (
    <div>
      <header className="page-header">
        <div className="eyebrow">Production Tools</div>
        <h1>現場ツール</h1>
      </header>

      <div className="container">
        <div className="menu-grid">
          <Link href="/vehicle" className="menu-card">
            <span className="icon">🚐</span>
            <div>
              <div className="label">車両予約</div>
              <div className="desc">使用予定の確認・新規登録</div>
            </div>
          </Link>

          <Link href="/equipment" className="menu-card">
            <span className="icon">🎥</span>
            <div>
              <div className="label">機材一覧</div>
              <div className="desc">私物機材・レンタル機材を検索</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
