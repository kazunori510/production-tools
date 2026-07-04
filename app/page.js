"use client";

import { useEffect, useMemo, useState } from "react";

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
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

// ローカルタイムでの YYYY-MM-DD を返す(タイムゾーンずれを避けるため toISOString は使わない)
function toDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function formatMonthLabel(d) {
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
}

function buildMonthMatrix(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0=日
  const gridStart = new Date(year, month, 1 - startOffset);

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

function emptyForm(dateKey) {
  return {
    name: "",
    startDate: dateKey || "",
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
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(null);
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

  // 日付キー(YYYY-MM-DD) -> その日の予約一覧
  const reservationsByDate = useMemo(() => {
    const map = {};
    for (const r of reservations) {
      if (!r.date?.start) continue;
      const key = toDateKey(new Date(r.date.start));
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [reservations]);

  const todayKey = toDateKey(new Date());
  const monthDays = useMemo(() => buildMonthMatrix(viewDate), [viewDate]);
  const currentMonthIndex = viewDate.getMonth();

  function goToMonth(offset) {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + offset, 1));
  }

  function openDay(dateKey) {
    setSelectedDateKey(dateKey);
  }

  function openNewForm(dateKey) {
    setForm(emptyForm(dateKey || todayKey));
    setSelectedDateKey(null);
    setShowForm(true);
  }

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

  const selectedReservations = selectedDateKey
    ? reservationsByDate[selectedDateKey] || []
    : [];

  return (
    <div>
      <header className="page-header">
        <div className="eyebrow">Vehicle</div>
        <h1>車両予約</h1>
      </header>

      <div className="container">
        <div className="cal-legend">
          <span className="user-tag 和典">和典</span>
          <span className="user-tag 風香">風香</span>
        </div>

        <div className="cal-header">
          <button className="cal-nav-btn" onClick={() => goToMonth(-1)} aria-label="前の月">
            ‹
          </button>
          <div className="cal-month-label">{formatMonthLabel(viewDate)}</div>
          <button className="cal-nav-btn" onClick={() => goToMonth(1)} aria-label="次の月">
            ›
          </button>
        </div>

        {loading && <div className="state-msg">読み込み中…</div>}
        {error && <div className="state-msg error">{error}</div>}

        {!loading && !error && (
          <>
            <div className="cal-weekday-row">
              {WEEKDAY_LABELS.map((w, i) => (
                <div
                  key={w}
                  className={`cal-weekday ${i === 0 ? "sun" : ""} ${i === 6 ? "sat" : ""}`}
                >
                  {w}
                </div>
              ))}
            </div>

            <div className="cal-grid">
              {monthDays.map((d) => {
                const key = toDateKey(d);
                const inMonth = d.getMonth() === currentMonthIndex;
                const isToday = key === todayKey;
                const dayReservations = reservationsByDate[key] || [];
                const weekday = d.getDay();

                return (
                  <button
                    key={key}
                    className={`cal-day ${inMonth ? "" : "out"} ${isToday ? "today" : ""}`}
                    onClick={() => openDay(key)}
                  >
                    <span
                      className={`cal-day-num ${weekday === 0 ? "sun" : ""} ${
                        weekday === 6 ? "sat" : ""
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <span className="cal-day-tags">
                      {dayReservations.slice(0, 2).map((r) => (
                        <span key={r.id} className={`cal-dot ${r.user || ""}`}>
                          {r.name || "予約"}
                        </span>
                      ))}
                      {dayReservations.length > 2 && (
                        <span className="cal-more">+{dayReservations.length - 2}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <button className="fab" onClick={() => openNewForm(todayKey)} aria-label="新規予約を登録">
        ＋
      </button>

      {/* 日別の予約確認シート */}
      {selectedDateKey && (
        <div className="form-sheet" onClick={() => setSelectedDateKey(null)}>
          <div className="form-sheet-inner" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedDateKey.replace(/-/g, "/")}</h2>

            {selectedReservations.length === 0 && (
              <div className="state-msg" style={{ padding: "16px 0" }}>
                この日の予約はまだありません。
              </div>
            )}

            {selectedReservations.map((r) => (
              <div className="reservation-card" key={r.id}>
                <div className="date-range">
                  {formatTime(r.date.start)}
                  {r.date.end ? ` 〜 ${formatTime(r.date.end)}` : ""}
                </div>
                <div className="title">{r.name || "(名称未設定)"}</div>
                {r.user && <span className={`user-tag ${r.user}`}>{r.user}</span>}
                {r.destination && (
                  <span className="tag" style={{ marginLeft: 6 }}>{r.destination}</span>
                )}
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

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedDateKey(null)}
              >
                閉じる
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openNewForm(selectedDateKey)}
              >
                ＋ この日に予約を追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規登録フォーム */}
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
