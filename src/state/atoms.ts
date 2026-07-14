import { createAtom, type Atom } from '../core/state';

/**
 * FluxFind Application Atoms
 *
 * Each atom represents a single setting key with auto-persistence to GM storage.
 * Features subscribe to atoms to react to setting changes without coupling.
 */

export const darkModeAtom: Atom<boolean> = createAtom('forcedarkmode', false);
export const chatDisabledAtom: Atom<boolean> = createAtom('disablechat', false);
export const removeAdsAtom: Atom<boolean> = createAtom('removeads', true);
export const serverFiltersAtom: Atom<boolean> = createAtom('togglefilterserversbutton', true);
export const autoRegionScanAtom: Atom<boolean> = createAtom('autoserverregions', true);
export const responsiveCardsAtom: Atom<boolean> = createAtom('responsivegamecards', true);
export const smartSearchAtom: Atom<boolean> = createAtom('smartsearch', true);
export const debugLogsAtom: Atom<boolean> = createAtom('enableLogs', false);
export const regionFilterAtom: Atom<string> = createAtom('serverregionfilter', '');
export const serverFetchCountAtom: Atom<number> = createAtom('serverfetchcount', 150);
