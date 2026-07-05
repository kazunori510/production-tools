"use client";

import { useEffect, useMemo, useState } from "react";

function formatYen(n) {
  if (n === null || n === undefined) return null;
  return n.toLocaleString("ja-JP");
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
    const key = tab === "rental" ? "category" : "category";
    const set = new Set(items.map((i) => i[key]).filter(Boolean));
    return ["すべて", ...Array.from(set)];
  }, [items, tab]);

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
          placeholder="機材名で検索"
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

        <div className="equip-grid">
          {!loading &&
            !error &&
            filtered.map((item) =>
              tab === "personal" ? (
                <PersonalCard key={item.id} item={item} />
              ) : (
                <RentalCard key={item.id} item={item} />
              )
            )}
        </div>
      </div>
    </div>
  );
}

function ItemPhoto({ src, alt }) {
  if (!src) {
    return (
      <div className="item-photo empty">
        <span>📷</span>
        <span>画像なし</span>
      </div>
    );
  }
  return (
    <div className="item-photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

function PersonalCard({ item }) {
  return (
    <div className="equip-card">
      <ItemPhoto src={item.images?.[0]} alt={item.name} />
      <div className="equip-name">{item.name || "(名称未設定)"}</div>

      <div className="spec-row">
        <span className="spec-label">数量</span>
        <span className="spec-value">
          {item.quantity != null ? `${item.quantity}` : "―"}
        </span>
      </div>
      <div className="spec-row">
        <span className="spec-label">付属品</span>
        <span className="spec-value">{item.accessories || "―"}</span>
      </div>
    </div>
  );
}

function RentalCard({ item }) {
  return (
    <div className="equip-card">
      <ItemPhoto src={item.images?.[0]} alt={item.name} />
      <div className="equip-name">{item.name || "(名称未設定)"}</div>

      <div className="rental-meta">
        {item.company && <span className="company-tag">{item.company}</span>}
        {item.pricePerDay != null && (
          <span className="price-tag">
            ¥{formatYen(item.pricePerDay)}
            <span className="unit"> / day</span>
          </span>
        )}
      </div>

      {item.accessories && (
        <div className="spec-row">
          <span className="spec-label">付属品</span>
          <span className="spec-value">{item.accessories}</span>
        </div>
      )}
    </div>
  );
}
