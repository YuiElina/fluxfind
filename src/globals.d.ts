/* ================================================================
 * FluxFind — Global type declarations for Userscript API (GM_*)
 * and Roblox page globals.
 * ================================================================ */

// ----- GM_xmlhttpRequest -----
type GM_XHRHeaders = Record<string, string>;

interface GM_XHRResponse {
  status: number;
  statusText: string;
  responseText: string;
  responseHeaders: string;
  readyState: number;
  response?: unknown;
  finalUrl?: string;
}

interface GM_XHRDetails {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'PATCH';
  url: string;
  headers?: GM_XHRHeaders;
  data?: string;
  anonymous?: boolean;
  timeout?: number;
  onload?: (response: GM_XHRResponse) => void;
  onerror?: (error: unknown) => void;
  ontimeout?: () => void;
}

declare function GM_xmlhttpRequest(details: GM_XHRDetails): void;

// ----- GM storage -----
declare function GM_getValue(key: string, defaultValue?: unknown): unknown;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_deleteValue(key: string): void;
declare function GM_listValues(): string[];

// ----- GM_addStyle (for CSS injection) -----
declare function GM_addStyle(css: string): void;

// ----- GM_getResourceText -----
declare function GM_getResourceText(name: string): string;

// ----- GM_notification -----
declare function GM_notification(details: unknown): void;