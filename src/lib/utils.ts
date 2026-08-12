import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Compose class names. Always use this rather than building strings with template literals. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
