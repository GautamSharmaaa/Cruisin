import { env } from "../config/env.js";
import { connectDb, disconnectDb } from "../config/db.js";
import { ProductModel } from "../models/product.model.js";
import { StockMovementModel } from "../models/stock-movement.model.js";
import { withMongoTransaction } from "../utils/mongo-transaction.js";
const main = async (): Promise<void> => {
  const uri = new URL(env.MONGODB_URI);
  if (
    env.APP_ENV !== "development" ||
    !["127.0.0.1", "localhost"].includes(uri.hostname)
  )
    throw new Error("Backfill refuses production or remote targets");
  await connectDb();
  try {
    const apply = process.argv.includes("--apply");
    let count = 0;
    for await (const product of ProductModel.find().cursor()) {
      for (const variant of product.variants) {
        count++;
        if (apply)
          await withMongoTransaction(async (session) => {
            const key = `opening:${variant._id}`;
            if (
              await StockMovementModel.exists({ idempotencyKey: key }).session(
                session ?? null,
              )
            )
              return true;
            const fresh = await ProductModel.findById(product._id).session(
              session ?? null,
            );
            const current = fresh?.variants.id(variant._id);
            if (!current) throw new Error("Variant changed during backfill");
            const [movement] = await StockMovementModel.aggregate([
              { $match: { variant: variant._id } },
              { $group: { _id: null, delta: { $sum: "$delta" } } },
            ]).session(session ?? null);
            const opening = current.stock - (movement?.delta ?? 0);
            if (opening < 0)
              throw new Error(
                "Existing ledger cannot reconcile; inspect before backfill",
              );
            const locked = await ProductModel.updateOne(
              {
                _id: product._id,
                variants: {
                  $elemMatch: { _id: variant._id, stock: current.stock },
                },
              },
              { $inc: { "variants.$.stockRevision": 1 } },
              { session },
            );
            if (locked.modifiedCount !== 1)
              throw new Error("Inventory changed during backfill");
            await StockMovementModel.create(
              [
                {
                  idempotencyKey: key,
                  product: product._id,
                  variant: variant._id,
                  sku: current.sku,
                  delta: opening,
                  reason: "opening_balance",
                  reference: "v2-additive-backfill",
                  actor: "local-migration",
                  before: 0,
                  after: opening,
                  at: new Date(),
                },
              ],
              { session },
            );
            return true;
          });
      }
    }
    console.log(
      JSON.stringify({
        variants: count,
        applied: apply,
        productionTouched: false,
      }),
    );
  } finally {
    await disconnectDb();
  }
};
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Backfill failed");
  process.exitCode = 1;
});
