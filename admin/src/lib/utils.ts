// used in modern web dev for resolving tailwind conflicts

import {clsx, type ClassValue} from "clsx"; // cleaner logic for classes
import {twMerge} from "tailwind-merge"; // overrides defaults if custom defined

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
