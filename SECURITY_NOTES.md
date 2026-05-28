<!-- Governed by .rules v1.0 -->

# Security Notes

## npm audit

The current npm audit reports a moderate advisory through Next.js' bundled PostCSS dependency. npm's available remediation suggests downgrading Next.js to 9.3.3, which would violate the required Next.js 15 App Router stack and remove the production architecture this project uses.

Track this advisory upstream and upgrade Next.js as soon as the Next 15 line ships a patched transitive PostCSS version.
