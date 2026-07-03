import { NextResponse } from "next/server";
import {
  queryDataSource,
  DATA_SOURCES,
  getTitle,
  getSelect,
  getStatus,
  getRichText,
  getNumber,
  getUrl,
  getDate,
  getFiles,
} from "@/lib/notion";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "rental" ? "rental" : "personal";
  const dataSourceId =
    type === "rental" ? DATA_SOURCES.equipmentRental : DATA_SOURCES.equipmentPersonal;

  try {
    const data = await queryDataSource(dataSourceId, {
      page_size: 100,
      sorts: [{ property: "名前", direction: "ascending" }],
    });

    const items = data.results.map((page) => {
      const p = page.properties;

      if (type === "rental") {
        return {
          id: page.id,
          type,
          name: getTitle(p["名前"]),
          category: getSelect(p["カテゴリー"]),
          company: getSelect(p["レンタル会社"]),
          pricePerDay: getNumber(p["1day単価"]),
          accessories: getRichText(p["付属品"]),
          link: getUrl(p["リンク"]),
          images: getFiles(p["画像"]),
        };
      }

      return {
        id: page.id,
        type,
        name: getTitle(p["名前"]),
        category: getSelect(p["カテゴリ"]),
        maker: getSelect(p["メーカー"]),
        model: getRichText(p["型番/モデル"]),
        serial: getRichText(p["シリアル"]),
        condition: getSelect(p["状態"]),
        status: getStatus(p["ステータス"]),
        quantity: getNumber(p["数量"]),
        purchaseDate: getDate(p["購入日"]),
        warrantyDate: getDate(p["保証期限"]),
        purchasePlace: getRichText(p["購入先"]),
        link: getUrl(p["リンク"]),
        accessories: getRichText(p["付属品"]),
        memo: getRichText(p["メモ"]),
        images: getFiles(p["画像"]),
      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
