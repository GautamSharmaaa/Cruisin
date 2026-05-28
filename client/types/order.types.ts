// Governed by .rules v1.0
export interface Address { fullName: string; phone: string; line1: string; line2?: string; city: string; state: string; postalCode: string; country: string; }
export interface OrderItem { productId: string; variantId: string; title: string; size: string; color: string; quantity: number; price: number; image: string; }
export interface Order { id?: string; _id?: string; status?: string; orderStatus?: string; paymentStatus: string; total: number; createdAt: string; trackingNumber?: string; items: OrderItem[]; timeline: Array<{ status: string; timestamp: string; note: string }>; }
