import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Provider } from "@/lib/upstream";
import { usePostgres } from "@/lib/db/runtime";

export type ListedModel = {
  id: string;
  catalogId: string;
  displayName: string;
  visible: boolean;
  enabled: boolean;
  configured: boolean;
};

export type PublicModel = {
  id: string;
  provider: Provider;
  model: string;
  displayName: string;
  upstreamModel: string;
  inputPricePerMTok: number | null;
  outputPricePerMTok: number | null;
  cacheReadPricePerMTok: number | null;
  cacheCreationPricePerMTok: number | null;
};

export function modelConfig(provider: Provider, model: string) {
  return db
    .select()
    .from(schema.modelCatalog)
    .where(and(eq(schema.modelCatalog.provider, provider), eq(schema.modelCatalog.model, model)))
    .get() ?? null;
}

export async function modelConfigAsync(provider: Provider, model: string) {
  if (!usePostgres()) return modelConfig(provider, model);
  const { pgDb, pgSchema } = await import("@/lib/db/pg");
  return (await pgDb
    .select()
    .from(pgSchema.modelCatalog)
    .where(and(eq(pgSchema.modelCatalog.provider, provider), eq(pgSchema.modelCatalog.model, model)))
    .limit(1))[0] ?? null;
}

export function listedModels(provider: Provider): ListedModel[] {
  const configured = db.select().from(schema.modelCatalog).where(eq(schema.modelCatalog.provider, provider)).all();
  const configuredByModel = new Map(configured.map(row => [row.model, row]));
  const discovered = discoveredModels(provider);
  const ids = [...new Set([...discovered, ...configured.map(row => row.model)])].sort();

  return ids.map(id => {
    const row = configuredByModel.get(id);
    return {
      id,
      catalogId: row?.id ?? "",
      displayName: row?.displayName || id,
      visible: row?.visible ?? true,
      enabled: row?.enabled ?? true,
      configured: !!row,
    };
  });
}

export async function listedModelsAsync(provider: Provider): Promise<ListedModel[]> {
  if (!usePostgres()) return listedModels(provider);
  const { pgDb, pgSchema } = await import("@/lib/db/pg");
  const configured = await pgDb.select().from(pgSchema.modelCatalog).where(eq(pgSchema.modelCatalog.provider, provider));
  const configuredByModel = new Map(configured.map(row => [row.model, row]));
  const discovered = await discoveredModelsAsync(provider);
  const ids = [...new Set([...discovered, ...configured.map(row => row.model)])].sort();
  return ids.map(id => {
    const row = configuredByModel.get(id);
    return {
      id,
      catalogId: row?.id ?? "",
      displayName: row?.displayName || id,
      visible: row?.visible ?? true,
      enabled: row?.enabled ?? true,
      configured: !!row,
    };
  });
}

export function hasModelCatalog(provider: Provider) {
  return db.select({ id: schema.modelCatalog.id }).from(schema.modelCatalog).where(eq(schema.modelCatalog.provider, provider)).get() !== undefined;
}

export async function hasModelCatalogAsync(provider: Provider) {
  if (!usePostgres()) return hasModelCatalog(provider);
  const { pgDb, pgSchema } = await import("@/lib/db/pg");
  return (await pgDb.select({ id: pgSchema.modelCatalog.id }).from(pgSchema.modelCatalog).where(eq(pgSchema.modelCatalog.provider, provider)).limit(1))[0] !== undefined;
}

export function visibleModels(provider: Provider) {
  return listedModels(provider).filter(model => model.visible);
}

export async function visibleModelsAsync(provider: Provider) {
  return (await listedModelsAsync(provider)).filter(model => model.visible);
}

export async function publicModelsAsync(): Promise<PublicModel[]> {
  if (usePostgres()) {
    const { pgDb, pgSchema } = await import("@/lib/db/pg");
    const [rows, prices] = await Promise.all([
      pgDb
        .select()
        .from(pgSchema.modelCatalog)
        .where(and(eq(pgSchema.modelCatalog.visible, true), eq(pgSchema.modelCatalog.enabled, true))),
      pgDb.select().from(pgSchema.modelPrices),
    ]);
    const priceMap = modelPriceMap(prices);
    return rows
      .filter(row => row.provider === "claude" || row.provider === "openai")
      .map(row => withPrice({
        id: row.id,
        provider: row.provider as Provider,
        model: row.model,
        displayName: row.displayName || row.model,
        upstreamModel: row.upstreamModel || row.model,
      }, priceMap))
      .sort((a, b) => a.provider.localeCompare(b.provider) || a.displayName.localeCompare(b.displayName));
  }
  const prices = modelPriceMap(db.select().from(schema.modelPrices).all());
  return db
    .select()
    .from(schema.modelCatalog)
    .where(and(eq(schema.modelCatalog.visible, true), eq(schema.modelCatalog.enabled, true)))
    .all()
    .map(row => withPrice({
      id: row.id,
      provider: row.provider,
      model: row.model,
      displayName: row.displayName || row.model,
      upstreamModel: row.upstreamModel || row.model,
    }, prices))
    .sort((a, b) => a.provider.localeCompare(b.provider) || a.displayName.localeCompare(b.displayName));
}

function modelPriceMap(rows: { provider: string; model: string; inputPricePerMTok: number; outputPricePerMTok: number; cacheReadPricePerMTok: number; cacheCreationPricePerMTok: number }[]) {
  return new Map(rows.map(row => [`${row.provider}:${row.model}`, row]));
}

function withPrice(model: Omit<PublicModel, "inputPricePerMTok" | "outputPricePerMTok" | "cacheReadPricePerMTok" | "cacheCreationPricePerMTok">, prices: ReturnType<typeof modelPriceMap>): PublicModel {
  const price = prices.get(`${model.provider}:${model.model}`);
  return {
    ...model,
    inputPricePerMTok: price?.inputPricePerMTok ?? null,
    outputPricePerMTok: price?.outputPricePerMTok ?? null,
    cacheReadPricePerMTok: price?.cacheReadPricePerMTok ?? null,
    cacheCreationPricePerMTok: price?.cacheCreationPricePerMTok ?? null,
  };
}

function discoveredModels(provider: Provider) {
  const channels = db
    .select({ models: schema.channels.models })
    .from(schema.channels)
    .where(and(eq(schema.channels.type, provider), eq(schema.channels.enabled, true)))
    .all()
    .flatMap(row => row.models);
  const mappings = db
    .select({ inboundModel: schema.modelMappings.inboundModel, upstreamModel: schema.modelMappings.upstreamModel })
    .from(schema.modelMappings)
    .where(eq(schema.modelMappings.provider, provider))
    .all()
    .flatMap(row => [row.inboundModel, row.upstreamModel]);
  return [...new Set([...channels, ...mappings].filter(model => model && model !== "*"))];
}

async function discoveredModelsAsync(provider: Provider) {
  const { pgDb, pgSchema } = await import("@/lib/db/pg");
  const channels = (await pgDb
    .select({ models: pgSchema.channels.models })
    .from(pgSchema.channels)
    .where(and(eq(pgSchema.channels.type, provider), eq(pgSchema.channels.enabled, true))))
    .flatMap(row => row.models);
  const mappings = (await pgDb
    .select({ inboundModel: pgSchema.modelMappings.inboundModel, upstreamModel: pgSchema.modelMappings.upstreamModel })
    .from(pgSchema.modelMappings)
    .where(eq(pgSchema.modelMappings.provider, provider)))
    .flatMap(row => [row.inboundModel, row.upstreamModel]);
  return [...new Set([...channels, ...mappings].filter(model => model && model !== "*"))];
}
