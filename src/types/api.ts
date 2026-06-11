// ================================================================
// FluxFind — API & data types
// ================================================================

/** Raw server data from Roblox servers/Public API */
export interface ServerData {
  id: string;
  maxPlayers: number;
  playing: number;
  fps: number;
  ping: number;
  playerTokens: string[];
}

/** Processed server data for card rendering */
export interface ServerCardData {
  id: string;
  playing: number;
  maxPlayers: number;
  playerTokens: string[];
  thumbnails: string[];
  region: RegionInfo | null;
}

/** Single item from POST /v1/batch thumbnail response */
export interface ThumbnailResponse {
  requestId: string;
  targetId: number;
  state: string;
  imageUrl: string | null;
}

/** A single request in the batch thumbnail POST body */
export interface BatchThumbnailItem {
  requestId: string;
  type: string;
  targetId: number;
  token: string;
  format: string;
  size: string;
}

/** The full batch thumbnail POST body */
export type BatchThumbnailBody = BatchThumbnailItem[];

/** Game icon from thumbnails API */
export interface GameIcon {
  targetId: number;
  imageUrl: string | null;
}

/** Game vote counts */
export interface GameVotes {
  upVotes: number;
  downVotes: number;
}

/** Geolocated region info */
export interface RegionInfo {
  city: string | null;
  country: string;
  countryCode: string;
}

/** Raw ip-api.com response */
export interface IPGeoData {
  countryCode: string;
  country: string;
  city: string | null;
  regionName: string | null;
}

/** User presence data */
export interface UserPresence {
  userId: number;
  presenceType: number;
  lastOnline: string;
  lastLocation: string;
  placeId: number | null;
  universeId: number | null;
}