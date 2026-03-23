"use client";

/**
 * Theme Provider Component
 * Wraps the application to provide NextThemes context for dark/light mode toggling.
 */

import * as React from "react";
import {ThemeProvider as NextThemesProvider} from "next-themes";

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
