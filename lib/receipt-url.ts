/**
 * The only receipt URLs an expense may store: `/api/receipts/<id>.<ext>` (served to
 * the owner only), plus legacy local-dev uploads. Shared by client and server validation.
 */
export const RECEIPT_URL_PATTERN = /^\/api\/receipts\/[0-9a-f]{24}\.(jpg|png|webp|pdf)$|^\/uploads\/[0-9a-f]{24}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/;
