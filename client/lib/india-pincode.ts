export interface IndiaPincodeResult {
  city: string;
  state: string;
}

export const lookupIndiaPincode = async (pincode: string, signal?: AbortSignal): Promise<IndiaPincodeResult | null> => {
  if (!/^[1-9]\d{5}$/.test(pincode)) return null;
  const response = await fetch(`/api/pincode/${encodeURIComponent(pincode)}`, { signal });
  if (!response.ok) return null;
  const payload = await response.json() as Partial<IndiaPincodeResult>;
  return payload.city?.trim() && payload.state?.trim() ? { city: payload.city.trim(), state: payload.state.trim() } : null;
};
