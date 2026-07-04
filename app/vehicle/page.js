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
const MAX_LANES = 3;

function pad2(n) {
  return String(n).padStart(2, "0");
}

// ローカルタイムでの YYYY-MM-DD(タイムゾーンずれを避けるため toISOString は使わない)
function toDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// 時刻を切り落とした日付(比較用)
function dateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

// ISO文字列 -> フォーム用の {date, time} に分解(ローカル時刻として扱う)
function splitDateTime(iso) {
  const d = new Date(iso);
  return { date: toDateKey(d), time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}` };
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
  const [editingId, setEditingId] = useState(null);
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

  // 予約に開始日・終了日(時刻なし)を付与しておく
  const ranged = useMemo(() => {
    return reservations
      .filter((r) => r.date?.start)
      .map((r) => {
        const start = dateOnly(new Date(r.date.start));
        const end = r.date.end ? dateOnly(new Date(r.date.end)) : start;
        return { ...r, rangeStart: start, rangeEnd: end < start ? start : end };
      });
  }, [reservations]);

  // 日付キー(YYYY-MM-DD) -> その日にかかる予約一覧(日別シート用)
  const reservationsByDate = useMemo(() => {
    const map = {};
    for (const r of ranged) {
      const cursor = new Date(r.rangeStart);
      while (cursor <= r.rangeEnd) {
        const key = toDateKey(cursor);
        if (!map[key]) map[key] = [];
        map[key].push(r);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [ranged]);

  const todayKey = toDateKey(new Date());
  const monthDays = useMemo(() => buildMonthMatrix(viewDate), [viewDate]);
  const currentMonthIndex = viewDate.getMonth();

  // 週(7日)ごとに分割し、各予約にレーン番号を割り当てる(連続バー表示用)
  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      const row = monthDays.slice(i, i + 7);
      const rowStart = dateOnly(row[0]);
      const rowEnd = dateOnly(row[6]);

      const inRow = ranged
        .filter((r) => r.rangeEnd >= rowStart && r.rangeStart <= rowEnd)
        .sort((a, b) => a.rangeStart - b.rangeStart || a.name.localeCompare(b.name));

      const laneEnds = []; // 各レーンの最終日
      const laned = inRow.map((r) => {
        let lane = laneEnds.findIndex((end) => end < r.rangeStart);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(r.rangeEnd);
        } else {
          laneEnds[lane] = r.rangeEnd;
        }
        return { ...r, lane };
      });

      result.push({ row, rowStart, rowEnd, reservations: laned });
    }
    return result;
  }, [monthDays, ranged]);

  function goToMonth(offset) {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + offset, 1));
  }

  function openDay(dateKey) {
    setSelectedDateKey(dateKey);
  }

  function openNewForm(dateKey) {
    setForm(emptyForm(dateKey || todayKey));
    setEditingId(null);
    setSelectedDateKey(null);
    setShowForm(true);
  }

  function openEditForm(r) {
    const startParts = splitDateTime(r.date.start);
    const endParts = r.date.end ? splitDateTime(r.date.end) : { date: "", time: "18:00" };
    setForm({
      name: r.name || "",
      startDate: startParts.date,
      startTime: startParts.time,
      endDate: endParts.date,
      endTime: endParts.time,
      user: r.user || USER_OPTIONS[0],
      destination: r.destination || "",
      purpose: r.purpose || [],
      memo: r.memo || "",
    });
    setEditingId(r.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
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

      const url = editingId ? `/api/vehicle/${editingId}` : "/api/vehicle";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
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
      if (!res.ok) throw new Error(data.error || "保存に失敗しました");

      closeForm();
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

            {weeks.map((week, wi) => (
              <div className="cal-week" key={wi}>
                {week.row.map((d, di) => {
                  const key = toDateKey(d);
                  const inMonth = d.getMonth() === currentMonthIndex;
                  const isToday = key === todayKey;
                  const weekday = di;
                  const dOnly = dateOnly(d);

                  const dayEvents = week.reservations.filter(
                    (r) => r.rangeStart <= dOnly && r.rangeEnd >= dOnly
                  );
                  const visible = dayEvents.filter((r) => r.lane < MAX_LANES);
                  const overflow = dayEvents.length - visible.length;

                  return (
                    <button
                      key={key}
                      className={`cal-day ${inMonth ? "" : "out"} ${isToday ? "today" : ""} ${
                        weekday === 0 ? "sun" : ""
                      } ${weekday === 6 ? "sat" : ""}`}
                      onClick={() => openDay(key)}
                    >
                      <span
                        className={`cal-day-num ${weekday === 0 ? "sun" : ""} ${
                          weekday === 6 ? "sat" : ""
                        }`}
                      >
                        {d.getDate()}
                      </span>

                      <span className="cal-bars">
                        {Array.from({ length: MAX_LANES }).map((_, laneIdx) => {
                          const ev = visible.find((r) => r.lane === laneIdx);
                          if (!ev) return <span key={laneIdx} className="cal-bar-empty" />;
                          const isStart = ev.rangeStart.getTime() === dOnly.getTime();
                          const isEnd = ev.rangeEnd.getTime() === dOnly.getTime();
                          return (
                            <span
                              key={laneIdx}
                              className={`cal-bar ${ev.user || ""} ${
                                isStart ? "cap-start" : ""
                              } ${isEnd ? "cap-end" : ""}`}
                            >
                              {isStart ? ev.name || "予約" : "\u00A0"}
                            </span>
                          );
                        })}
                        {overflow > 0 && <span className="cal-more">+{overflow}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
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
              <div className={`reservation-card ${r.user || ""}`} key={r.id}>
                <div className="card-top">
                  <div className="date-range">
                    {formatTime(r.date.start)}
                    {r.date.end ? ` 〜 ${formatTime(r.date.end)}` : ""}
                  </div>
                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() => openEditForm(r)}
                  >
                    編集
                  </button>
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

      {/* 新規登録・編集フォーム */}
      {showForm && (
        <div className="form-sheet" onClick={() => !saving && closeForm()}>
          <div className="form-sheet-inner" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "予約を編集" : "新規予約"}</h2>
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
                  onClick={closeForm}
                  disabled={saving}
                >
                  キャンセル
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "保存中…" : editingId ? "更新する" : "登録する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
