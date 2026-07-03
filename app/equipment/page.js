"use client";

import { useEffect, useMemo, useState } from "react";

const CONDITION_BADGE = {
  良好: "good",
  使用感あり: "used",
  要修理: "repair",
  貸出中: "lent",
  売却済: "sold",
};

function formatYen(n) {
  if (n === null || n === undefined) return null;
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function EquipmentPage() {
  const [tab, setTab] = useState("personal");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("すべて");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCategory("すべて");

    fetch(`/api/equipment?type=${tab}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "取得に失敗しました");
        if (!cancelled) setItems(data.items || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return ["すべて", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (category !== "すべて" && i.category !== category) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        i.name?.toLowerCase().includes(q) ||
        i.maker?.toLowerCase().includes(q) ||
        i.model?.toLowerCase().includes(q) ||
        i.company?.toLowerCase().includes(q)
      );
    });
  }, [items, query, category]);

  return (
    <div>
      <header className="page-header">
        <div className="eyebrow">Equipment</div>
        <h1>機材一覧</h1>
      </header>

      <div className="container">
        <div className="tabs">
          <button
            className={`tab-btn ${tab === "personal" ? "active" : ""}`}
            onClick={() => setTab("personal")}
          >
            私物機材
          </button>
          <button
            className={`tab-btn ${tab === "rental" ? "active" : ""}`}
            onClick={() => setTab("rental")}
          >
            レンタル機材
          </button>
        </div>

        <input
          className="search-input"
          type="text"
          placeholder="機材名・メーカー・型番で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {categories.length > 1 && (
          <div className="chip-row">
            {categories.map((c) => (
              <button
                key={c}
                className={`chip ${category === c ? "active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {loading && <div className="state-msg">読み込み中…</div>}
        {error && <div className="state-msg error">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="state-msg">該当する機材が見つかりません。</div>
        )}

        {!loading &&
          !error &&
          filtered.map((item) => (
            <div className="item-card" key={item.id}>
              <div className="top-row">
                <div>
                  <div className="name">{item.name || "(名称未設定)"}</div>
                  <div className="meta">
                    {[item.maker, item.model].filter(Boolean).join(" / ") ||
                      item.company ||
                      ""}
                  </div>
                </div>
                {tab === "personal" && item.condition && (
                  <span className={`badge ${CONDITION_BADGE[item.condition] || ""}`}>
                    {item.condition}
                  </span>
                )}
              </div>

              {tab === "personal" && (
                <div className="meta" style={{ marginTop: 8 }}>
                  {item.quantity != null && <>数量: {item.quantity}　</>}
                  {item.serial && <span className="mono">S/N {item.serial}</span>}
                </div>
              )}

              {tab === "rental" && (
                <div className="meta" style={{ marginTop: 8 }}>
                  {item.pricePerDay != null && <>1day: {formatYen(item.pricePerDay)}　</>}
                  {item.company && <>レンタル先: {item.company}</>}
                </div>
              )}

              {item.accessories && (
                <div className="meta" style={{ marginTop: 4 }}>付属品: {item.accessories}</div>
              )}

              {item.link && (
                <div style={{ marginTop: 8 }}>
                  <a href={item.link} target="_blank" rel="noreferrer" className="tag">
                    関連リンク ↗
                  </a>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
