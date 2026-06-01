// src/hooks/useResponsive.ts
//
// Responsive breakpoint hook for the web layout. Native (iOS/Android) is
// always treated as `mobile` — the phone UI is the baseline and these
// breakpoints only widen the layout on larger web viewports.
//
// Breakpoints (viewport width, px):
//   mobile   < 768            phone UI, bottom tab bar
//   tablet   768 – 1023       wider content, still bottom tab bar
//   desktop  >= 1024          side rail nav, centered max-width content
//
// Usage:
//   const { isDesktop, isTablet, contentMaxWidth } = useResponsive();

import { Platform, useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const;

// Max content column width on wide screens so reading-length lines and
// cards don't stretch edge-to-edge on a 1440px+ monitor.
export const CONTENT_MAX_WIDTH = 880;
// Width of the desktop side rail.
export const SIDE_RAIL_WIDTH = 232;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface Responsive {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** true on tablet+ — i.e. anything wider than a phone */
  isWide: boolean;
  /** clamp content to this width on wide screens; full width on mobile */
  contentMaxWidth: number | undefined;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();

  // Native is always the phone baseline regardless of tablet width — we
  // ship a phone UI there and don't want desktop chrome on an iPad app.
  const isWeb = Platform.OS === 'web';

  let breakpoint: Breakpoint = 'mobile';
  if (isWeb && width >= BREAKPOINTS.desktop) breakpoint = 'desktop';
  else if (isWeb && width >= BREAKPOINTS.tablet) breakpoint = 'tablet';

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';

  return {
    width,
    height,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isWide: !isMobile,
    contentMaxWidth: isMobile ? undefined : CONTENT_MAX_WIDTH,
  };
}
