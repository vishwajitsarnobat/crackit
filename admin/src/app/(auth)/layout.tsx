import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-[1fr_1.15fr]">
      {/* Branded side panel - desktop only */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground">
        <Link href="/login" className="font-serif text-2xl tracking-tight">
          Crack<span className="opacity-80">It</span>
        </Link>

        <div className="space-y-6">
          {/* Floating decorative circles */}
          <div className="flex gap-4">
            <div className="h-16 w-16 rounded-full bg-white/10 animate-float" />
            <div className="h-10 w-10 rounded-full bg-white/15 animate-float-delayed mt-6" />
            <div className="h-12 w-12 rounded-full bg-white/8 animate-float mt-2" />
          </div>

          <blockquote className="max-w-sm space-y-3">
            <p className="text-lg font-medium leading-relaxed text-white/90">
              &ldquo;The platform that powers smarter coaching.&rdquo;
            </p>
            <footer className="text-sm text-white/60">
              - CrackIt Admin Panel
            </footer>
          </blockquote>
        </div>

        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} CrackIt Institute
        </p>
      </div>

      {/* Form side */}
      <div className="relative flex min-h-screen flex-col">
        {/* Subtle background pattern */}
        <div className="fixed inset-0 -z-10 overflow-hidden lg:relative lg:inset-auto lg:hidden">
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>

        {/* Mobile logo + theme toggle */}
        <div className="flex items-center justify-between px-6 pt-5 lg:justify-end">
          <Link href="/login" className="font-serif text-xl tracking-tight lg:hidden">
            Crack<span className="text-primary">It</span>
          </Link>
          <ThemeToggle />
        </div>

        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="animate-slide-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
