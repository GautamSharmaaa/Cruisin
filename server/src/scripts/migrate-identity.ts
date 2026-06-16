// Governed by .rules v1.0
import { connectDb, disconnectDb } from '../config/db.js';
import { AddressModel } from '../models/address.model.js';
import { AuthProviderModel } from '../models/auth-provider.model.js';
import { UserModel } from '../models/user.model.js';
import { UserPreferenceModel } from '../models/user-preference.model.js';
import { logger } from '../utils/logger.js';

const migrateIdentity = async (): Promise<void> => {
  await connectDb();
  const users = await UserModel.find().lean();
  let providers = 0;
  let preferences = 0;
  let addresses = 0;
  for (const user of users) {
    const provider = await AuthProviderModel.findOneAndUpdate({ provider: 'email', providerEmail: user.email }, { user: user._id, provider: 'email', providerEmail: user.email, isVerified: user.isVerified, linkedAt: user.createdAt }, { upsert: true, new: true, setDefaultsOnInsert: true });
    if (provider) providers += 1;
    const preference = await UserPreferenceModel.findOneAndUpdate({ user: user._id }, { user: user._id }, { upsert: true, new: true, setDefaultsOnInsert: true });
    if (preference) preferences += 1;
    const existingAddresses = await AddressModel.countDocuments({ user: user._id });
    if (existingAddresses === 0 && user.addresses.length > 0) {
      const migrated = await AddressModel.insertMany(user.addresses.map((address) => ({ user: user._id, type: address.label.toLowerCase() === 'office' ? 'office' : address.label.toLowerCase() === 'home' ? 'home' : 'other', fullName: address.fullName, phone: address.phone, country: address.country, state: address.state, city: address.city, pincode: address.postalCode, street: address.line1, landmark: address.line2, isDefault: address.isDefault })));
      addresses += migrated.length;
    }
  }
  logger.info('Identity migration complete', { users: users.length, providers, preferences, addresses });
  await disconnectDb();
};

migrateIdentity().catch(async (error: unknown) => {
  logger.error('Identity migration failed', { error: error instanceof Error ? error.message : 'Unknown error' });
  await disconnectDb();
  process.exitCode = 1;
});
