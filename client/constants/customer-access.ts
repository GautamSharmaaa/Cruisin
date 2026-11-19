export const CUSTOMER_ACCESS = {
  heading: 'Staff storefront sign-in',
  description: 'Enter the customer’s registered mobile number and the access code from Admin.',
  phone: 'Registered mobile number',
  code: 'Access code',
  submit: 'Start assisted access',
  pending: 'Checking access…',
  openFromAdmin: 'Open this window from the customer’s record in Admin → Users.',
  invalid: 'Enter the mobile number with country code and the 20-character access code.',
  timedOut: 'Admin did not respond. Open the storefront again from the customer’s record.',
  ended: 'Assisted access ended. Open a new window from Admin to continue.',
  end: 'End session',
  banner: 'Assisted storefront session for',
  codOnly: 'Assisted checkout uses cash on delivery.',
  codUnavailable: 'Cash on delivery is unavailable for this order.',
  addressNeeded: 'This customer needs a saved delivery address before assisted checkout.'
} as const;
