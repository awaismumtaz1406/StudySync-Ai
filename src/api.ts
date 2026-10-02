/**
 * Safe fetch helper that guarantees clean JSON parsing and surfaces
 * human-readable error messages if a server gateway/proxy error occurs.
 */
export async function safeFetchJson<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    const urlStr = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
    console.warn(`[API Non-JSON Response from ${urlStr}]:`, text.slice(0, 200));
    
    // Check if the server returned "A server error occurred." or gateway HTML
    if (text.includes('server error') || text.includes('Server error')) {
      throw new Error(`The backend server is initializing or temporarily unreachable (HTTP ${res.status}). Please try again in a few seconds.`);
    }

    throw new Error(
      !res.ok
        ? `Server error (HTTP ${res.status}): ${text.slice(0, 100) || res.statusText}`
        : 'Server returned a non-JSON response. Please refresh or retry.'
    );
  }
}
