import { InboxIcon } from 'lucide-react'

type EmptyStateProps = {
    title?: string
    message?: string
}

export function EmptyState({ title = 'No data', message = 'There is nothing to display for the selected filters.' }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4">
                <InboxIcon className="h-8 w-8 text-primary/50" />
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">{message}</p>
            </div>
        </div>
    )
}
