/**
 * Sanitizes input strings to remove dangerous HTML tags and special characters.
 */
export function sanitizeInput(input: string | null | undefined): string {
    if (!input) return '';

    // Convert to string in case it's not
    let sanitized = String(input);

    // 1. Remove dangerous HTML tags
    const dangerousTags = /<(script|iframe|object|embed|style|link|base|form|input|button|textarea|select|option).*?>|<\/(script|iframe|object|embed|style|link|base|form|input|button|textarea|select|option)>/gi;
    sanitized = sanitized.replace(dangerousTags, '');

    // 2. Remove other HTML-like tags (simple strip-tags approach)
    sanitized = sanitized.replace(/<[^>]*>?/gm, '');

    // 3. Optional: Trim excessive whitespace
    sanitized = sanitized.trim();

    return sanitized;
}
