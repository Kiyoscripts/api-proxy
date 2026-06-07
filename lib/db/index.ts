import { pgDb, pgSchema } from "./pg";

type AnyRow = any;
type CompatQuery = PromiseLike<AnyRow[]> & {
  $dynamic: () => CompatQuery;
  from: (...args: any[]) => CompatQuery;
  where: (...args: any[]) => CompatQuery;
  limit: (...args: any[]) => CompatQuery;
  offset: (...args: any[]) => CompatQuery;
  orderBy: (...args: any[]) => CompatQuery;
  innerJoin: (...args: any[]) => CompatQuery;
  leftJoin: (...args: any[]) => CompatQuery;
  groupBy: (...args: any[]) => CompatQuery;
  all: () => AnyRow[];
  get: () => AnyRow | undefined;
  run: () => any;
};
type CompatMutation = {
  values: (...args: any[]) => CompatMutation;
  set: (...args: any[]) => CompatMutation;
  where: (...args: any[]) => CompatMutation;
  returning: (...args: any[]) => PromiseLike<AnyRow[]>;
  run: () => any;
};
type CompatDb = {
  select: (...args: any[]) => CompatQuery;
  insert: (...args: any[]) => CompatMutation;
  update: (...args: any[]) => CompatMutation;
  delete: (...args: any[]) => CompatMutation;
};

export const db: CompatDb = pgDb as unknown as CompatDb;
export const schema = pgSchema;
export { pgSchema };
