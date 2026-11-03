/**
 * Helper para resolver a URL da API dinamicamente para compatibilidade total
 * com instalações em subpastas (ex: public_html/smartvendas/) ou na raiz na Hostinger.
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  if (typeof window !== 'undefined') {
    try {
      const metaUrl = import.meta.url;
      if (metaUrl) {
        const urlObj = new URL(metaUrl);
        let basePath = urlObj.pathname;

        if (basePath.includes('/assets/')) {
          basePath = basePath.substring(0, basePath.indexOf('/assets/'));
        } else if (basePath.includes('/src/')) {
          basePath = basePath.substring(0, basePath.indexOf('/src/'));
        } else {
          basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
        }

        if (!basePath.endsWith('/')) {
          basePath += '/';
        }

        return `${urlObj.origin}${basePath}${cleanEndpoint}`;
      }
    } catch {
      // Ignorar e usar fallback
    }

    let pathname = window.location.pathname;
    if (/\.[a-z0-9]+$/i.test(pathname)) {
      pathname = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    } else if (!pathname.endsWith('/')) {
      pathname += '/';
    }

    return `${window.location.origin}${pathname}${cleanEndpoint}`;
  }

  return endpoint;
}
