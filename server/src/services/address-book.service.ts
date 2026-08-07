// Governed by .rules v1.0
import { AddressModel } from '../models/address.model.js';
import { OrderModel } from '../models/order.model.js';
import { UserModel } from '../models/user.model.js';

export interface CheckoutAddressInput {
  fullName?: unknown;
  phone?: unknown;
  line1?: unknown;
  line2?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
  country?: unknown;
}

interface AddressBookValue {
  type: 'home';
  fullName: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  street: string;
  landmark?: string;
}

const clean = (value: unknown): string => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const canonicalPhone = (value: unknown): string => {
  const raw = clean(value);
  const digits = raw.replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  return raw.startsWith('+') && digits ? `+${digits}` : digits || raw;
};
const canonicalCountry = (value: unknown): string => {
  const country = clean(value);
  return /^(in|india)$/i.test(country) ? 'India' : country;
};

export const checkoutAddressToBookValue = (address: CheckoutAddressInput): AddressBookValue | null => {
  const value: AddressBookValue = {
    type: 'home',
    fullName: clean(address.fullName),
    phone: canonicalPhone(address.phone),
    country: canonicalCountry(address.country),
    state: clean(address.state),
    city: clean(address.city),
    pincode: clean(address.postalCode).toUpperCase(),
    street: clean(address.line1),
    landmark: clean(address.line2) || undefined
  };
  return value.fullName && value.phone && value.country && value.state && value.city && value.pincode && value.street ? value : null;
};

const addressIdentity = (address: Pick<AddressBookValue, 'phone' | 'country' | 'state' | 'city' | 'pincode' | 'street' | 'landmark'>): string => [
  address.phone.replace(/\D/g, ''),
  address.country,
  address.state,
  address.city,
  address.pincode,
  address.street,
  address.landmark ?? ''
].map((part) => part.trim().toLocaleLowerCase('en-IN')).join('|');

export const AddressBookService = {
  async saveCheckoutAddress(userId: string, address: CheckoutAddressInput): Promise<unknown | null> {
    const value = checkoutAddressToBookValue(address);
    if (!value) return null;
    const addresses = await AddressModel.find({ user: userId }).sort({ isDefault: -1, updatedAt: -1 }).lean();
    const identity = addressIdentity(value);
    const existing = addresses.find((candidate) => addressIdentity({
      phone: candidate.phone,
      country: candidate.country,
      state: candidate.state,
      city: candidate.city,
      pincode: candidate.pincode,
      street: candidate.street,
      landmark: candidate.landmark ?? undefined
    }) === identity);
    const isDefault = existing?.isDefault === true || !addresses.some((candidate) => candidate.isDefault);
    if (existing) {
      return AddressModel.findOneAndUpdate(
        { _id: existing._id, user: userId },
        { $set: { ...value, fullName: value.fullName, isDefault } },
        { new: true, runValidators: true }
      );
    }
    return AddressModel.create({ ...value, user: userId, isDefault });
  },

  async backfillCheckoutAddresses(userId: string): Promise<void> {
    const user = await UserModel.findById(userId).select('addressBookMigratedAt').lean();
    if (!user || user.addressBookMigratedAt) return;
    const orders = await OrderModel.find({ user: userId, 'shippingAddress.line1': { $exists: true } })
      .select('shippingAddress createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    for (const order of orders) await this.saveCheckoutAddress(userId, order.shippingAddress);
    await UserModel.updateOne(
      { _id: userId, addressBookMigratedAt: { $exists: false } },
      { $set: { addressBookMigratedAt: new Date() } }
    );
  }
};
