interface UrlValidationResult {
    isValid: boolean;
    normalizedUrl: string | null;
}

/**
 * Validates a raw URL string, normalizes it by prepending 'https://' if missing, 
 * and ensures the scheme is 'http' or 'https'.
 * * @param rawUrl The raw string input from the user.
 * @returns An object containing the validation status and the normalized URL.
 */
export const validateAndNormalizeUrl = (rawUrl: string): UrlValidationResult => {
    
    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl) {
        return { isValid: false, normalizedUrl: null };
    }

    let urlToTest = trimmedUrl;

    // 1. Normalization: Prepend 'https://' if no scheme is present.
    // This allows users to simply type 'google.com' (safer than 'http').
    if (!/^https?:\/\//i.test(urlToTest)) {
        urlToTest = 'https://' + urlToTest;
    }

    // 2. Validation and Protocol Check
    try {
        const urlObject = new URL(urlToTest);
        
        const protocol = urlObject.protocol.toLowerCase();

        // Ensure the scheme is explicitly 'http:' or 'https:'.
        // This prevents loading file://, ftp://, or other non-web schemes.
        if (protocol === 'http:' || protocol === 'https:') {
            // Use the full normalized URL from the constructor result
            return { isValid: true, normalizedUrl: urlObject.href };
        }
        
    } catch (e) {
        // Validation failed (e.g., malformed URL, invalid characters)
        console.error("URL validation failed for:", rawUrl, e);
        return { isValid: false, normalizedUrl: null };
    }
    
    // If we reach here, validation passed but the scheme was not http/https
    return { isValid: false, normalizedUrl: null };
};