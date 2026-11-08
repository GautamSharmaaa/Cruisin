# Storefront motion

Implemented for the customer storefront. Existing admin/employee themes and business services remain intact.

- Desktop wheel scrolling uses Lenis 1.3.27, native scroll coordinates and a requestAnimationFrame loop. It is destroyed on route changes and on reduced-motion changes. The Next router continues to own history and route scroll restoration.
- Touch/coarse-pointer devices, checkout and CMS preview keep native scrolling. Wheel events inside dialogs, form controls and explicitly native regions bypass Lenis. A body-lock observer pauses interpolation while drawers are open.
- A shop-route template supplies a 550ms entrance. Campaign images settle from a restrained scale; captions fade and lift. Product cards reveal once on entry and images crossfade/zoom on hover. Fixed navigation stays outside the animated page wrapper.
- The navigation drawer slides from the left, quick add enters from below, and existing cart/filter drawers retain their shared animation. Buttons and selected variants use short colour/transform transitions.
- Reduced-motion users receive native scrolling, zero route displacement/duration, no image hover movement and no sheet animations. Mobile touch inertia is not replaced.

Timing/preferences live in `client/lib/storefront-motion.ts`; the lifecycle is in `client/components/layout/smooth-storefront.tsx`. No hosted/device frame-rate guarantee is made from browser emulation.
