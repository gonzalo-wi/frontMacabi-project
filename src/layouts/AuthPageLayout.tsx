import type { ReactNode } from 'react'

import { AuthFormColumn, AuthHeroPanel } from '@/layouts/auth/AuthLayoutParts'

export { AuthSuccessLayout } from '@/layouts/auth/AuthLayoutParts'

type AuthPageLayoutProps = {
  backLink?: { to: string; label: string }
  icon: ReactNode
  title: string
  subtitle: string
  heroVisual: ReactNode
  heroTitle: ReactNode
  heroSubtitle: string
  children: ReactNode
}

export function AuthPageLayout({
  backLink,
  icon,
  title,
  subtitle,
  heroVisual,
  heroTitle,
  heroSubtitle,
  children,
}: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <AuthHeroPanel heroVisual={heroVisual} heroTitle={heroTitle} heroSubtitle={heroSubtitle} />
      <AuthFormColumn backLink={backLink} icon={icon} title={title} subtitle={subtitle}>
        {children}
      </AuthFormColumn>
    </div>
  )
}
