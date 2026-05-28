<!-- Governed by .rules v1.0 -->

# USABILITY CHECKLIST

## Navigation & Information Architecture
- [x] ✅ User can reach any main section within 2 clicks from homepage
- [x] ✅ Breadcrumbs on product and category pages
- [x] ✅ Active nav state clearly shown
- [x] ✅ Mobile hamburger menu with full navigation
- [x] ✅ Search accessible from all pages (keyboard shortcut: Cmd/Ctrl + K)
- [x] ✅ Back button never breaks state (cart, filters preserved)
- [x] ✅ 404 page has helpful navigation links

## Homepage
- [x] ✅ Hero loads within 2.5s (LCP target)
- [x] ✅ Hero CTA is above the fold on all device sizes
- [x] ✅ Video hero has fallback image (no autoplay on low-data mode)
- [x] ✅ Featured collections are admin-configurable
- [x] ✅ Flash sale shows live countdown timer
- [x] ✅ New arrivals section present
- [x] ✅ Instagram / UGC section present
- [x] ✅ Newsletter signup with success/error feedback
- [x] ✅ All homepage sections have skeleton loaders

## Shop / Product Listing Page
- [x] ✅ Filter sidebar (desktop) / filter drawer (mobile)
- [x] ✅ Filters: category, price range (slider), size (multi-select), color (swatches)
- [x] ✅ Sort by: newest, price low-high, price high-low, best selling, top rated
- [x] ✅ Active filters shown as dismissible chips above results
- [x] ✅ Filter count badge on mobile filter button
- [x] ✅ Product count shown ("Showing 24 of 156 items")
- [x] ✅ Infinite scroll OR load more button (not pagination — kills luxury feel)
- [x] ✅ Grid / List view toggle
- [x] ✅ Skeleton loaders during filter changes
- [x] ✅ Empty state when no products match filters
- [x] ✅ URL updates with filter params (shareable, bookmarkable)

## Product Detail Page
- [x] ✅ Image gallery: thumbnail strip + main image
- [x] ✅ Image zoom on hover/click (desktop) / pinch zoom (mobile)
- [x] ✅ All variant images swap when variant selected
- [x] ✅ Size selector with sold-out sizes visually crossed out
- [x] ✅ Color selector as swatches (not dropdown)
- [x] ✅ Size guide modal
- [x] ✅ Stock indicator ("Only 3 left" under 5 units)
- [x] ✅ Add to cart button: disabled when no size selected
- [x] ✅ Add to cart gives feedback (drawer opens or success toast)
- [x] ✅ Wishlist toggle with auth check (prompt login if not authed)
- [x] ✅ Product description with expand/collapse
- [x] ✅ Shipping & returns accordion
- [x] ✅ Reviews section: star breakdown, individual reviews, pagination
- [x] ✅ "Leave a review" CTA (only shown if user has purchased)
- [x] ✅ Recommended products carousel below
- [x] ✅ Recently viewed section
- [x] ✅ Share button (copy link, native share API)
- [x] ✅ Breadcrumb navigation
- [x] ✅ SEO: product JSON-LD schema, OG tags, meta description

## Cart
- [x] ✅ Cart accessible as slide-over drawer (no full page reload)
- [x] ✅ Item image, name, variant, price shown
- [x] ✅ Quantity increment / decrement with min=1
- [x] ✅ Remove item with undo toast (5 second window)
- [x] ✅ Coupon code input with validation feedback
- [x] ✅ Order subtotal, discount, shipping estimate, total
- [x] ✅ Free shipping progress bar ("$X more for free shipping")
- [x] ✅ Upsell / recommended items in cart drawer
- [x] ✅ Cart persists across page refreshes (Zustand + localStorage)
- [x] ✅ Guest cart merges with user cart on login
- [x] ✅ Proceed to checkout button
- [x] ✅ Empty cart state with "Continue Shopping" CTA

## Checkout
- [x] ✅ Guest checkout available (no forced registration)
- [x] ✅ Saved addresses auto-populated for logged-in users
- [x] ✅ Address form with validation (all required fields)
- [x] ✅ Shipping method selector with prices
- [x] ✅ Order summary sticky sidebar (desktop)
- [x] ✅ Coupon code can be applied at checkout too
- [x] ✅ Tax calculated and shown before payment
- [x] ✅ Payment method selector: Razorpay / Stripe
- [x] ✅ Card input with formatting (spaces every 4 digits)
- [x] ✅ Loading state during payment processing
- [x] ✅ Success page with order ID, summary, and next steps
- [x] ✅ Failure page with retry option, no data loss
- [x] ✅ Order confirmation email sent on success
- [x] ✅ Checkout progress indicator (3 steps: Info → Shipping → Payment)

## User Account
- [x] ✅ Login with email + password
- [x] ✅ Register with name, email, password, confirm password
- [x] ✅ Form validation with inline errors
- [x] ✅ "Forgot password" flow (email link → reset form)
- [x] ✅ Email verification on register
- [x] ✅ Profile: update name, email, phone, avatar
- [x] ✅ Password change (requires current password)
- [x] ✅ Saved addresses: add, edit, delete, set default
- [x] ✅ Order history: list with status, date, total
- [x] ✅ Order detail: items, timeline, tracking number
- [x] ✅ Wishlist: view, remove, move to cart
- [x] ✅ Account deletion option (GDPR)

## Accessibility (WCAG 2.1 AA)
- [x] ✅ All interactive elements reachable by keyboard (Tab order logical)
- [x] ✅ Focus indicators visible on all focusable elements
- [x] ✅ All images have descriptive alt text
- [x] ✅ Color contrast ratio minimum 4.5:1 for normal text
- [x] ✅ Screen reader labels on icon-only buttons (aria-label)
- [x] ✅ Modal/drawer: focus trapped while open, returns on close
- [x] ✅ Form errors announced to screen readers (aria-live)
- [x] ✅ Skip to main content link
- [x] ✅ No content flashes or strobing animations

## Performance
- [x] ✅ Lighthouse score: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95
- [x] ✅ LCP ≤ 2.5s
- [x] ✅ CLS ≤ 0.1
- [x] ✅ FID / INP ≤ 200ms
- [x] ✅ All images: next/image with proper sizing, WebP format
- [x] ✅ All images: explicit width + height to prevent layout shift
- [x] ✅ Hero video: lazy if below fold, preload if hero
- [x] ✅ Fonts: preload critical fonts, font-display: swap
- [x] ✅ No render-blocking resources
- [x] ✅ Code splitting per route (Next.js default)
- [x] ✅ Skeleton loaders instead of spinners for all content

## Mobile Experience
- [x] ✅ All tap targets minimum 44×44px
- [x] ✅ No horizontal scroll at 375px width
- [x] ✅ Swipe gestures: product image gallery, cart drawer close
- [x] ✅ Native share API on product pages
- [x] ✅ Sticky "Add to Cart" button on mobile product page
- [x] ✅ Bottom nav bar on mobile (Home, Shop, Search, Wishlist, Account)
- [x] ✅ Filter as full-screen drawer on mobile
- [x] ✅ Keyboard does not push content off screen (viewport meta correct)
- [x] ✅ Touch-friendly size/color selectors (min 40px hit target)

## Error & Edge Case Handling
- [x] ✅ Product out of stock: all add-to-cart paths blocked, clear message
- [x] ✅ Payment failure: order not created, user informed, retry option
- [x] ✅ Network error: toast message, retry button on failed fetches
- [x] ✅ Session expired: silent refresh attempt, then redirect to login
- [x] ✅ Invalid coupon: clear error message, field highlighted
- [x] ✅ Empty search: show "No results for X" with suggestions
- [x] ✅ Slow network: skeleton loaders shown for all async content
- [x] ✅ Server error (500): branded error page, not raw stack trace

## Admin Dashboard Usability
- [x] ✅ Protected: redirects to /admin/login if not authenticated
- [x] ✅ Role-based: manager cannot access user management
- [x] ✅ Sidebar navigation with active state
- [x] ✅ Overview shows: today's revenue, orders, users, conversion rate
- [x] ✅ All data tables: sortable columns, pagination, search
- [x] ✅ Product form: all fields, image uploader (drag + drop), variant builder
- [x] ✅ Order status update: one-click status change with confirmation
- [x] ✅ CMS builder: drag-to-reorder sections, live preview
- [x] ✅ Bulk actions: select multiple orders/products for batch operations
- [x] ✅ Export: CSV export for orders and user data
- [x] ✅ Toast feedback on all create/update/delete actions
- [x] ✅ Confirmation dialog before any destructive action (delete, cancel order)
- [x] ✅ Analytics charts: date range picker, comparison period
