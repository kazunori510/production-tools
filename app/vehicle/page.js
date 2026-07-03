"use client";

import { useEffect, useState } from "react";

const PURPOSE_OPTIONS = [
  "撮影",
  "撮影準備",
  "打ち合わせ",
  "ロケハン",
  "小道具リサーチ",
  "小道具手配・リサーチ",
  "機材pic・返却",
  "ｵｰﾃﾞｨｼｮﾝ",
  "移動手段",
];

const DESTINATION_OPTIONS = ["県内", "県外", "BIGSTONE", "Lab751", "T&E", "Ings-JBS"];
const USER_OPTIONS = ["和典", "風香"];

function formatDateRange(date) {
  if (!date?.start) return "日時未設定";
  const start = new Date(date.start);
  const startStr = start.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!date.end) return startStr;
  const end = new Date(date.end);
  const endStr = end.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startStr} 〜 ${endStr}`;
}

function emptyForm() {
  return {
    name: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "18:00",
    user: USER_OPTIONS[0],
    destination: "",
    purpose: [],
    memo: "",
  };
}

export default function VehiclePage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vehicle");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取得に失敗しました");
      setReservations(data.reservations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function togglePurpose(value) {
    setForm((f) => ({
      ...f,
      purpose: f.purpose.includes(value)
        ? f.purpose.filter((v) => v !== value)
        : [...f.purpose, value],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.startDate) return;
    setSaving(true);
    setError(null);
    try {
      const start = `${form.startDate}T${form.startTime}:00`;
      const end = form.endDate ? `${form.endDate}T${form.endTime}:00` : null;

      const res = await fetch("/api/vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          start,
          end,
          user: form.user,
          destination: form.destination || undefined,
          purpose: form.purpose,
          memo: form.memo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登録に失敗しました");

      setShowForm(false);
      setForm(emptyForm());
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div className="eyebrow">Vehicle</div>
        <h1>車両予約</h1>
      </header>

      <div className="container">
        {loading && <div className="state-msg">読み込み中…</div>}
        {error && !showForm && <div className="state-msg error">{error}</div>}

        {!loading && !error && reservations.length === 0 && (
          <div className="state-msg">まだ予約がありません。右下の＋から登録できます。</div>
        )}

        {reservations.map((r) => (
          <div className="reservation-card" key={r.id}>
            <div className="date-range">{formatDateRange(r.date)}</div>
            <div className="title">{r.name || "(名称未設定)"}</div>
            {r.user && <span className={`user-tag ${r.user}`}>{r.user}</span>}
            {r.destination && <span className="tag" style={{ marginLeft: 6 }}>{r.destination}</span>}
            {r.memo && <div className="meta" style={{ marginTop: 8 }}>{r.memo}</div>}
            {r.purpose?.length > 0 && (
              <div className="tag-row">
                {r.purpose.map((p) => (
                  <span className="tag" key={p}>{p}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="fab" onClick={() => setShowForm(true)} aria-label="新規予約を登録">
        ＋
      </button>

      {showForm && (
        <div className="form-sheet" onClick={() => !saving && setShowForm(false)}>
          <div className="form-sheet-inner" onClick={(e) => e.stopPropagation()}>
            <h2>新規予約</h2>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>予約名・件名</label>
                <input
                  type="text"
                  placeholder="例：〇〇撮影 移動"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label>利用者</label>
                <select
                  value={form.user}
                  onChange={(e) => setForm({ ...form, user: e.target.value })}
                >
                  {USER_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>開始日時</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                  style={{ marginBottom: 8 }}
                />
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>

              <div className="field">
                <label>終了日時(任意)</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  style={{ marginBottom: 8 }}
                />
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>

              <div className="field">
                <label>行き先</label>
                <select
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                >
                  <option value="">選択なし</option>
                  {DESTINATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>用途</label>
                <div className="check-grid">
                  {PURPOSE_OPTIONS.map((p) => (
                    <label className="check-pill" key={p}>
                      <input
                        type="checkbox"
                        checked={form.purpose.includes(p)}
                        onChange={() => togglePurpose(p)}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>メモ(同乗者・積載物など)</label>
                <textarea
                  value={form.memo}
                  onChange={(e) => setForm({ ...form, memo: e.target.value })}
                />
              </div>

              {error && <div className="state-msg error">{error}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  キャンセル
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "登録中…" : "登録する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
