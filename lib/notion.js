// Notion API (バージョン 2025-09-03 / data sources 対応) を扱う共通処理。
// このファイルはサーバー側(app/api/**)からのみ呼び出してください。
// NOTION_TOKEN をクライアント(ブラウザ)に渡すことは絶対にしないこと。

const NOTION_VERSION = "2025-09-03";
const NOTION_API = "https://api.notion.com/v1";

function getToken() {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error(
      "NOTION_TOKEN が設定されていません。Vercelの Settings > Environment Variables を確認してください。"
    );
  }
  return token;
}

async function notionFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${NOTION_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data?.message ||
      `Notionへの接続に失敗しました(status: ${res.status})。データベースがインテグレーションと共有されているか確認してください。`;
    throw new Error(message);
  }

  return data;
}

export function queryDataSource(dataSourceId, body = {}) {
  return notionFetch(`/data_sources/${dataSourceId}/query`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createPage(dataSourceId, properties) {
  return notionFetch(`/pages`, {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties,
    }),
  });
}

// このアプリが扱うデータソースのID。
// 環境変数で上書きできるが、通常はこのままでOK。
export const DATA_SOURCES = {
  vehicle: process.env.NOTION_VEHICLE_DS_ID || "391ddc28-3c48-80be-bc79-000bb677f5e0",
  equipmentPersonal:
    process.env.NOTION_EQUIPMENT_PERSONAL_DS_ID || "307ddc28-3c48-8013-b56a-000b3a1ce547",
  equipmentRental:
    process.env.NOTION_EQUIPMENT_RENTAL_DS_ID || "36eddc28-3c48-80ba-b669-000bd08ce782",
};

// --- Notionのプロパティ値をシンプルなJSに変換するヘルパー ---

export function getTitle(prop) {
  return prop?.title?.map((t) => t.plain_text).join("") || "";
}

export function getSelect(prop) {
  return prop?.select?.name || null;
}

export function getMultiSelect(prop) {
  return prop?.multi_select?.map((o) => o.name) || [];
}

export function getDate(prop) {
  return prop?.date || null;
}

export function getRichText(prop) {
  return prop?.rich_text?.map((t) => t.plain_text).join("") || "";
}

export function getNumber(prop) {
  return typeof prop?.number === "number" ? prop.number : null;
}

export function getUrl(prop) {
  return prop?.url || null;
}

export function getStatus(prop) {
  return prop?.status?.name || null;
}

export function getFiles(prop) {
  return (prop?.files || [])
    .map((f) => f.file?.url || f.external?.url)
    .filter(Boolean);
}
