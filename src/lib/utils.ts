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
