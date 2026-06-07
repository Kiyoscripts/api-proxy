import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { desc, inArray } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { usePostgres } from "@/lib/db/runtime";
import { createGiftCardCode, giftCardCodeParts, hashGiftCardCode } from "@/lib/gift-cards";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    if (usePostgres()) {
      const { pgDb, pgSchema } = await import("@/lib/db/pg");
      const rows = await pgDb.select().from(pgSchema.giftCards).orderBy(desc(pgSchema.giftCards.createdAt)).limit(200);
      return NextResponse.json(rows);
    }
    return NextResponse.json(db.select().from(schema.giftCards).orderBy(desc(schema.giftCards.createdAt)).limit(200).all());
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const amountUsd = Math.round((Number(body.amountUsd) || 0) * 100) / 100;
    const count = Math.min(100, Math.max(1, Math.floor(Number(body.count) || 1)));
    if (amountUsd <= 0) return NextResponse.json({ error: "请输入大于 0 的礼品卡金额" }, { status: 400 });
    const now = Date.now();
    const cards = Array.from({ length: count }, () => {
      const code = createGiftCardCode();
      const parts = giftCardCodeParts(code);
      return {
        id: "gc_" + nanoid(10),
        code,
        row: {
          id: "gc_" + nanoid(10),
          codeHash: hashGiftCardCode(code),
          codePrefix: parts.prefix,
          codeSuffix: parts.suffix,
          amountUsd,
          status: "active" as const,
          createdBy: actor.id,
          redeemedBy: null,
          redeemedAt: null,
          createdAt: now,
        },
      };
    });
    if (usePostgres()) {
      const { pgDb, pgSchema } = await import("@/lib/db/pg");
      await pgDb.insert(pgSchema.giftCards).values(cards.map(card => card.row));
      await pgDb.insert(pgSchema.activities).values({ ts: now, event: `生成礼品卡 ${count} 张 / $${amountUsd.toFixed(2)}`, actor: actor.username });
    } else {
      for (const card of cards) db.insert(schema.giftCards).values(card.row).run();
      db.insert(schema.activities).values({ ts: now, event: `生成礼品卡 ${count} 张 / $${amountUsd.toFixed(2)}`, actor: actor.username }).run();
    }
    return NextResponse.json({ cards: cards.map(card => ({ ...card.row, code: card.code })) }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0) : [];
    if (ids.length === 0) return NextResponse.json({ error: "请选择要删除的礼品卡" }, { status: 400 });
    const now = Date.now();
    if (usePostgres()) {
      const { pgDb, pgSchema } = await import("@/lib/db/pg");
      await pgDb.delete(pgSchema.giftCards).where(inArray(pgSchema.giftCards.id, ids));
      await pgDb.insert(pgSchema.activities).values({ ts: now, event: `删除礼品卡 ${ids.length} 张`, actor: actor.username });
    } else {
      db.delete(schema.giftCards).where(inArray(schema.giftCards.id, ids)).run();
      db.insert(schema.activities).values({ ts: now, event: `删除礼品卡 ${ids.length} 张`, actor: actor.username }).run();
    }
    return NextResponse.json({ deleted: ids.length });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
