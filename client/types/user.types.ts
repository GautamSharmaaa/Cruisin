// Governed by .rules v1.0
export interface User { id: string; name: string; email: string; role: 'customer' | 'admin' | 'superadmin' | 'manager' | 'viewer'; avatar?: string; phone?: string; isVerified: boolean; }
export interface SavedAddress { id: string; label: string; fullName: string; phone: string; line1: string; line2?: string; city: string; state: string; postalCode: string; country: string; isDefault: boolean; }
