// Governed by .rules v1.0
export interface User { id: string; name: string; email: string; role: 'customer' | 'admin' | 'superadmin' | 'manager' | 'viewer'; avatar?: string; phone?: string; whatsappNumber?: string; isVerified: boolean; profileIncomplete?: boolean; addresses?: SavedAddress[]; }
export interface SavedAddress { id?: string; _id?: string; label: string; fullName: string; phone: string; line1: string; line2?: string; city: string; state: string; postalCode: string; country: string; isDefault: boolean; }
export interface AddressBookEntry { _id: string; type: 'home' | 'office' | 'other'; fullName: string; phone: string; country: string; state: string; city: string; pincode: string; street: string; landmark?: string; latitude?: number; longitude?: number; isDefault: boolean; }
export interface AuthProvider { _id: string; provider: 'email' | 'google' | 'whatsapp'; providerEmail?: string; providerPhone?: string; isVerified: boolean; linkedAt: string; }
export interface UserSession { _id: string; deviceName: string; browser?: string; os?: string; ipAddress?: string; location?: string; lastActive: string; createdAt: string; expiresAt: string; }
export interface SecurityEvent { _id: string; type: string; ipAddress?: string; location?: string; deviceName?: string; riskScore: number; createdAt: string; }
export interface UserPreferences { language: string; currency: string; theme: 'dark'; marketingEmails: boolean; pushNotifications: boolean; smsNotifications: boolean; whatsappNotifications: boolean; }
export interface Notification { _id: string; title: string; body: string; type: 'order' | 'inventory' | 'promotion' | 'system'; readAt?: string; createdAt: string; }
export interface AccountDashboard { user: User; membershipStatus: string; recentOrders: Array<{ _id: string; orderStatus: string; total: number; createdAt: string }>; wishlistCount: number; savedAddresses: number; rewardPoints: number; recentlyViewedProducts: string[]; securityEvents: number; }
