import { Platform, useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const;


export const SIDE_RAIL_WIDTH = 232;
export function getContentWidth(windowWidth: number): number {
  const wideWeb = Platform.OS === 'web' && windowWidth >= BREAKPOINTS.tablet;
  return wideWeb ? Math.max(0, windowWidth - SIDE_RAIL_WIDTH) : windowWidth;
}

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface Responsive {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  contentMaxWidth: number | undefined;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
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
    contentMaxWidth: undefined,
  };
}
