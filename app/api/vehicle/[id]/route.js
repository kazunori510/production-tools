import { NextResponse } from "next/server";
import { updatePage } from "@/lib/notion";

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
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
      利用者: user ? { select: { name: user } } : { select: null },
      行き先: destination ? { select: { name: destination } } : { select: null },
      用途: { multi_select: (purpose || []).map((name) => ({ name })) },
      メモ: { rich_text: memo ? [{ text: { content: memo } }] : [] },
    };

    const page = await updatePage(id, properties);
    return NextResponse.json({ page });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
