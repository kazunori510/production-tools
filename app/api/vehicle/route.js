import { NextResponse } from "next/server";
import {
  queryDataSource,
  createPage,
  DATA_SOURCES,
  getTitle,
  getSelect,
  getMultiSelect,
  getDate,
  getRichText,
} from "@/lib/notion";

export async function GET() {
  try {
    const data = await queryDataSource(DATA_SOURCES.vehicle, {
      sorts: [{ property: "予約日時", direction: "descending" }],
      page_size: 100,
    });

    const reservations = data.results.map((page) => {
      const p = page.properties;
      return {
        id: page.id,
        url: page.url,
        name: getTitle(p["予約名"]),
        date: getDate(p["予約日時"]),
        user: getSelect(p["利用者"]),
        purpose: getMultiSelect(p["用途"]),
        destination: getSelect(p["行き先"]),
        memo: getRichText(p["メモ"]),
      };
    });

    return NextResponse.json({ reservations });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, start, end, user, purpose, destination, memo } = body;

    if (!name || !start) {
      return NextResponse.json(
        { error: "予約名と開始日時は必須です。" },
        { status: 400 }
      );
    }

    const properties = {
      予約名: { title: [{ text: { content: name } }] },
      予約日時: { date: { start, end: end || null } },
    };

    if (user) {
      properties["利用者"] = { select: { name: user } };
    }
    if (destination) {
      properties["行き先"] = { select: { name: destination } };
    }
    if (Array.isArray(purpose) && purpose.length > 0) {
      properties["用途"] = { multi_select: purpose.map((name) => ({ name })) };
    }
    if (memo) {
      properties["メモ"] = { rich_text: [{ text: { content: memo } }] };
    }

    const page = await createPage(DATA_SOURCES.vehicle, properties);
    return NextResponse.json({ page });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
