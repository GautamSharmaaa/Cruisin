import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { connectDb, disconnectDb } from "../config/db.js";
import { UserModel } from "../models/user.model.js";
const main = async (): Promise<void> => {
  const u = new URL(env.MONGODB_URI);
  if (
    env.APP_ENV !== "development" ||
    !["127.0.0.1", "localhost"].includes(u.hostname)
  )
    throw new Error("Synthetic fixture requires isolated local DB");
  const email = process.argv[2];
  if (!/^unit-[a-f0-9-]+@example\.test$/.test(email ?? ""))
    throw new Error(
      "Only uniquely named synthetic acceptance customers are allowed",
    );
  await connectDb();
  try {
    await UserModel.create({
      email,
      name: "Synthetic acceptance customer",
      passwordHash: await bcrypt.hash("SyntheticTest123!", 12),
      role: "customer",
      isVerified: true,
      isActive: true,
      status: "active",
    });
  } finally {
    await disconnectDb();
  }
};
void main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Synthetic seed failed");
  process.exitCode = 1;
});
