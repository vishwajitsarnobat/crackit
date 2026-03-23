/**
 * Reusable Section Card Component
 * A stylized card with a title, description, and content area.
 * Used consistently in dashboards to wrap distinct analytical reports/charts.
 */

import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'

export function SectionCard({
  title,
  description,
  children,
  className = '',
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
        <Card className={`gap-0 py-0 overflow-hidden ${className}`}>
            <div className="border-b bg-muted/30 px-5 py-3.5">
                <CardTitle className="text-base tracking-tight">{title}</CardTitle>
                {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
            </div>
            <CardContent className="px-5 py-5">
                {children}
            </CardContent>
        </Card>
    )
}
