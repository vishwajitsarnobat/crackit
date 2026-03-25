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
        <Card className={`gap-0 overflow-hidden py-0 ${className}`}>
            <div className="border-b border-secondary/10 bg-primary/8 px-5 py-4 dark:bg-white/[0.03]">
                <CardTitle className="text-base tracking-tight text-secondary dark:text-primary">{title}</CardTitle>
                {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
            </div>
            <CardContent className="px-5 py-5">
                {children}
            </CardContent>
        </Card>
    )
}
