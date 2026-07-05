"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function formatYen(n) {
  if (n === null || n === undefined) return null;
  return n.toLocaleString("ja-JP");
}

export default function PropsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("すべて");

  useEffect(() => {
    fetch("/api/props")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "取得に失敗しました");
        setItems(data.items || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((i) => (i.category || []).forEach((c) => set.add(c)));
    return ["すべて", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (category !== "すべて" && !(i.category || []).includes(category)) return false;
      if (!query) return true;
      return i.name?.toLowerCase().includes(query.toLowerCase());
    });
  }, [items, query, category]);

  return (
    <div>
      <header className="page-header">
        <div className="eyebrow">Props &amp; Costume</div>
        <h1>小道具・衣装</h1>
      </header>

      <div className="container">
        <input
          className="search-input"
          type="text"
          placeholder="小道具名で検索"
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
          <div className="state-msg">該当する小道具が見つかりません。</div>
        )}

        <div className="equip-grid">
          {!loading &&
            !error &&
            filtered.map((item) => <PropCard key={item.id} item={item} />)}
        </div>
      </div>
    </div>
  );
}

function PropCard({ item }) {
  return (
    <div className="equip-card">
      <PhotoCarousel images={item.photos} alt={item.name} />
      <div className="equip-name">{item.name || "(名称未設定)"}</div>

      <div className="spec-row">
        <span className="spec-label">サイズ</span>
        <span className="spec-value">{item.sizeLabel || "―"}</span>
      </div>
      <div className="spec-row">
        <span className="spec-label">在庫</span>
        <span className="spec-value">{item.stock != null ? `${item.stock}` : "―"}</span>
      </div>

      {item.rentalPrice != null && (
        <div className="rental-meta">
          <span className="price-tag">
            ¥{formatYen(item.rentalPrice)}
            <span className="unit"> /日/個</span>
          </span>
        </div>
      )}
    </div>
  );
}

function PhotoCarousel({ images, alt }) {
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="item-photo empty">
        <span>📷</span>
        <span>画像なし</span>
      </div>
    );
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(i);
  }

  return (
    <div className="photo-carousel">
      <div className="photo-scroll" ref={scrollRef} onScroll={handleScroll}>
        {images.map((src, i) => (
          <div className="photo-slide" key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} loading="lazy" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="photo-dots">
          {images.map((_, i) => (
            <span key={i} className={`photo-dot ${i === index ? "active" : ""}`} />
          ))}
        </div>
      )}
    </div>
  );
}
