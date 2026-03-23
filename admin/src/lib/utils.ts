/**
 * CSS Utility (cn)
 * Merges Tailwind classes safely using clsx + tailwind-merge.
 * Handles conditional classes, resolves Tailwind conflicts.
 * Export: cn(...classValues)
 */

import {clsx, type ClassValue} from "clsx"; // cleaner logic for classes
import {twMerge} from "tailwind-merge"; // overrides defaults if custom defined

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
