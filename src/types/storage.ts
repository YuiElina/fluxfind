// ================================================================
// FluxFind — Storage & Settings types
// ================================================================

/** String literal union of all setting keys */
export type SettingKey =
  | 'enableLogs'
  | 'logLevel'
  | 'enablenotifications'
  | 'removeads'
  | 'togglefilterserversbutton'
  | 'responsivegamecards'
  | 'forcedarkmode'
  | 'betterprivateservers'
  | 'smartsearch'
  | 'disablechat'
  | 'smallerrobloxsidebar'
  | 'autoserverregions'
  | 'autoserverregionnumber'
  | 'serverregionfilter'
  | 'serverfetchcount'
  | 'version'
  | '_legacy_migrated';

/** Log levels */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/** Complete typed settings object */
export interface FluxSettings {
  enableLogs: boolean;
  logLevel: LogLevel;
  enablenotifications: boolean;
  removeads: boolean;
  togglefilterserversbutton: boolean;
  responsivegamecards: boolean;
  forcedarkmode: boolean;
  betterprivateservers: boolean;
  smartsearch: boolean;
  disablechat: boolean;
  smallerrobloxsidebar: boolean;
  autoserverregions: boolean;
  autoserverregionnumber: number;
  serverregionfilter: string;
  version: string;
  _legacy_migrated: boolean;
}