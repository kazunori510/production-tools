import { NextResponse } from "next/server";
import {
  queryDataSource,
  DATA_SOURCES,
  getTitle,
  getMultiSelect,
  getNumber,
  getFiles,
} from "@/lib/notion";

export async function GET() {
  try {
    const data = await queryDataSource(DATA_SOURCES.props, {
      page_size: 100,
      sorts: [{ property: "名前", direction: "ascending" }],
    });

    const items = data.results.map((page) => {
      const p = page.properties;
      const width = getNumber(p["幅"]);
      const depth = getNumber(p["奥行"]);
      const height = getNumber(p["高さ"]);

      const sizeParts = [];
      if (width != null) sizeParts.push(`W${width}`);
      if (depth != null) sizeParts.push(`D${depth}`);
      if (height != null) sizeParts.push(`H${height}`);

      return {
        id: page.id,
        name: getTitle(p["名前"]),
        category: getMultiSelect(p["カテゴリー"]),
        photos: getFiles(p["商品写真"]),
        sizeLabel: sizeParts.length ? `${sizeParts.join(" × ")} cm` : null,
        stock: getNumber(p["在庫"]),
        rentalPrice: getNumber(p["ﾚﾝﾀﾙ料金（円/日/個）"]),
      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
