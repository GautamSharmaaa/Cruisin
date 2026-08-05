// Governed by .rules v1.0
import { logisticsConfig, logisticsIsMock } from '../../config/logistics.js';
import { PackagePresetModel } from '../../models/package-preset.model.js';
import type { PackageMeasurement } from '../../types/logistics.types.js';
import { ApiError } from '../../utils/api-error.js';

interface Dimensions {
  length?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface PackageProduct {
  title: string;
  weight?: number | null;
  dimensions?: Dimensions | null;
  packagingWeight?: number | null;
  defaultPackagePreset?: string | null;
  maximumQuantityPerPackage?: number | null;
}

export interface PackageVariant {
  sku: string;
  weight?: number | null;
  dimensions?: Dimensions | null;
}

export interface PackageLine {
  product: PackageProduct;
  variant: PackageVariant;
  quantity: number;
}

const round = (value: number): number => Math.round((value + Number.EPSILON) * 1_000) / 1_000;
const valid = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

const selectedDimensions = (line: PackageLine): Dimensions => ({
  length: line.variant.dimensions?.length ?? line.product.dimensions?.length,
  width: line.variant.dimensions?.width ?? line.product.dimensions?.width,
  height: line.variant.dimensions?.height ?? line.product.dimensions?.height
});

export const calculatePackage = async (lines: PackageLine[]): Promise<PackageMeasurement> => {
  if (lines.length === 0) throw new ApiError(400, 'A package requires at least one item');
  const warnings: string[] = [];
  let productWeightKg = 0;
  let packagingWeightKg = 0;
  let lengthCm = 0;
  let breadthCm = 0;
  let heightCm = 0;
  let packagePreset: string | undefined;
  let allMeasurementsPresent = true;

  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new ApiError(400, 'Package quantities must be positive integers');
    const maximum = line.product.maximumQuantityPerPackage ?? 10;
    if (line.quantity > maximum) throw new ApiError(409, `${line.variant.sku} exceeds its maximum quantity per package`);

    const weight = line.variant.weight ?? line.product.weight;
    const dimensions = selectedDimensions(line);
    if (!valid(weight) || !valid(dimensions.length) || !valid(dimensions.width) || !valid(dimensions.height)) {
      allMeasurementsPresent = false;
      if (!logisticsIsMock()) {
        throw new ApiError(409, `Shipping measurements are incomplete for ${line.product.title} (${line.variant.sku})`);
      }
      warnings.push(`Mock measurements used for ${line.variant.sku}; confirm before live shipping`);
    }
    const resolvedWeight = valid(weight) ? weight : 0.25;
    const resolvedLength = valid(dimensions.length) ? dimensions.length : 20;
    const resolvedBreadth = valid(dimensions.width) ? dimensions.width : 15;
    const resolvedHeight = valid(dimensions.height) ? dimensions.height : 3;
    productWeightKg += resolvedWeight * line.quantity;
    packagingWeightKg += (valid(line.product.packagingWeight) ? line.product.packagingWeight : 0) * line.quantity;
    lengthCm = Math.max(lengthCm, resolvedLength);
    breadthCm = Math.max(breadthCm, resolvedBreadth);
    heightCm += resolvedHeight * line.quantity;
    packagePreset ??= line.product.defaultPackagePreset ?? undefined;
  }

  if (packagePreset) {
    const preset = await PackagePresetModel.findOne({ code: packagePreset.toUpperCase(), isActive: true }).lean();
    if (preset) {
      const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
      if (totalQuantity > preset.maximumQuantity) throw new ApiError(409, `Package preset ${preset.name} supports at most ${preset.maximumQuantity} items`);
      lengthCm = Math.max(lengthCm, preset.lengthCm);
      breadthCm = Math.max(breadthCm, preset.breadthCm);
      heightCm = Math.max(heightCm, preset.heightCm);
      packagingWeightKg = Math.max(packagingWeightKg, preset.packagingWeightKg);
    } else if (!logisticsIsMock()) {
      throw new ApiError(409, `Package preset ${packagePreset} is unavailable`);
    } else {
      warnings.push(`Mock mode could not find package preset ${packagePreset}`);
    }
  }

  packagingWeightKg = Math.max(packagingWeightKg, logisticsConfig.packagingWeightKg);
  const deadWeightKg = round(productWeightKg + packagingWeightKg);
  if (deadWeightKg > 100 || lengthCm > 300 || breadthCm > 300 || heightCm > 300) {
    throw new ApiError(409, 'Package exceeds supported parcel limits and must be split');
  }
  return {
    productWeightKg: round(productWeightKg),
    packagingWeightKg: round(packagingWeightKg),
    deadWeightKg,
    lengthCm: round(lengthCm),
    breadthCm: round(breadthCm),
    heightCm: round(heightCm),
    packagePreset,
    measurementConfirmed: allMeasurementsPresent,
    warnings
  };
};
