// @ts-nocheck
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getOnboardingRoute(user: any): string | null {
  if (!user || !user.id) {
    return '/(onboarding)/auth/login';
  }
  if (!user.role) {
    if (user.isGoogleUser || (user.email && !user.email.endsWith('@mock-mobile.local'))) {
      return '/(onboarding)/auth/google-onboarding';
    }
    return '/(onboarding)/auth/register';
  }
  if (!user.location) {
    return '/(location)/locationinfo';
  }
  if (user.role === 'worker') {
    if (!user.profession) {
      return '/(onboarding)/worker/profession';
    }
    if (!user.hasSpecialties) {
      return '/(onboarding)/worker/services';
    }
    return '/(protected)/worker';
  }
  if (user.role === 'consumer') {
    return '/(protected)/consumer';
  }
  if (user.role === 'admin') {
    return '/admin';
  }
  return null;
}

export function isHindi(text: any): boolean {
  if (typeof text !== 'string') return false;
  // Devanagari Unicode range: U+0900 to U+097F
  return /[\u0900-\u097F]/.test(text);
}

export function adjustHindiFont(text: any, baseSize: number, scaleMultiplier = 1.15): number {
  return isHindi(text) ? Math.round(baseSize * scaleMultiplier) : baseSize;
}
