// ================================================================
// FluxFind — UI types (icons, notifications, modals)
// ================================================================

/** Available icon names in the FluxIcons library */
export type IconName =
  | 'settings'
  | 'search'
  | 'filter'
  | 'refresh'
  | 'close'
  | 'check'
  | 'chevronDown'
  | 'chevronUp'
  | 'chevronLeft'
  | 'chevronRight'
  | 'info'
  | 'alertTriangle'
  | 'alertCircle'
  | 'checkCircle'
  | 'xCircle'
  | 'loader'
  | 'user'
  | 'users'
  | 'userPlus'
  | 'userX'
  | 'userRoundPlus'
  | 'play'
  | 'gamepad'
  | 'server'
  | 'zap'
  | 'globe'
  | 'mapPin'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'copy'
  | 'download'
  | 'upload'
  | 'externalLink'
  | 'eye'
  | 'eyeOff'
  | 'moon'
  | 'sun'
  | 'layout'
  | 'pallete'
  | 'monitor'
  | 'heart'
  | 'star'
  | 'clock'
  | 'shield'
  | 'flag';

/** Options for rendering an icon */
export interface IconOpts {
  size?: number;
  className?: string;
  color?: string;
}

/** Valid toast notification types */
export type ToastType = 'success' | 'error' | 'warning' | 'info';