import { Link } from 'react-router-dom'
import { ChevronRight, KeyRound, LogOut, ShieldCheck } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DrawerClose } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

import { adminNavItems, participantNavItems } from './navItems'

type NavShellUser = { name: string; email: string }

type NavShellContentProps = {
  variant: 'sidebar' | 'drawer'
  pathname: string
  isAdmin: boolean
  user: NavShellUser | null
  userInitials: string
  onOpenPw: () => void
  onLogout: () => void
}

const styles = {
  sidebar: {
    nav: 'relative flex-1 overflow-y-auto px-3 py-4 space-y-0.5',
    sectionPb: 'pb-2',
    link: 'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
    iconBox: 'flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200 shrink-0',
    icon: 'w-4 h-4',
    activeBar: 'w-0.5 h-5',
    chevron: 'w-3.5 h-3.5 shrink-0 opacity-50',
    adminDivider: 'my-3 mx-1',
    adminSectionPb: 'pb-2',
    userFooter: 'relative shrink-0 p-3',
    userCard: 'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
    avatar: 'h-8 w-8',
    avatarText: 'text-xs',
    actionBtn: 'p-1.5 rounded-lg transition-all duration-150 cursor-pointer',
    actionIcon: 'w-3.5 h-3.5',
  },
  drawer: {
    nav: 'relative flex-1 overflow-y-auto px-3 py-5 space-y-0.5',
    sectionPb: 'pb-2.5',
    link: 'group relative flex items-center gap-3.5 px-3 py-3.5 rounded-xl text-[15px] font-medium transition-all duration-200',
    iconBox: 'flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-200',
    icon: 'w-5 h-5',
    activeBar: 'w-[3px] h-6',
    chevron: 'w-4 h-4 shrink-0 opacity-40',
    adminDivider: 'my-4 mx-1',
    adminSectionPb: 'pb-2.5',
    userFooter: 'relative shrink-0 px-3 pb-3',
    userFooterStyle: { paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' } as const,
    userCard: 'flex items-center gap-3 px-3 py-3.5 rounded-2xl',
    avatar: 'h-10 w-10',
    avatarText: 'text-sm',
    actionBtn: 'p-2.5 rounded-xl transition-colors cursor-pointer',
    actionIcon: 'w-4 h-4',
  },
} as const

function wrapNavLink(variant: 'sidebar' | 'drawer', key: string, link: React.ReactElement) {
  if (variant === 'drawer') {
    return <DrawerClose key={key} asChild>{link}</DrawerClose>
  }
  return <span key={key}>{link}</span>
}

export function NavShellContent({
  variant,
  pathname,
  isAdmin,
  user,
  userInitials,
  onOpenPw,
  onLogout,
}: NavShellContentProps) {
  const s = styles[variant]

  function renderNavLink(
    key: string,
    href: string,
    isActive: boolean,
    isAdminLink: boolean,
    label: string,
    Icon: typeof ShieldCheck,
  ) {
    const activeParticipantStyle = !isAdminLink && isActive
      ? {
          background: 'linear-gradient(90deg, oklch(0.55 0.14 225 / 0.22), oklch(0.55 0.14 225 / 0.08))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }
      : undefined
    const activeAdminStyle = isAdminLink && isActive
      ? {
          background: 'linear-gradient(90deg, oklch(0.70 0.15 80 / 0.18), oklch(0.70 0.15 80 / 0.06))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }
      : undefined

    const link = (
      <Link
        to={href}
        className={cn(
          s.link,
          isActive ? 'text-white' : 'text-white/55 hover:text-white/90',
          variant === 'drawer' && !isActive && 'hover:text-white',
        )}
        style={activeParticipantStyle ?? activeAdminStyle}
      >
        {isActive && (
          <span
            className={cn('absolute left-0 top-1/2 -translate-y-1/2 rounded-full', s.activeBar)}
            style={{
              background: isAdminLink
                ? 'linear-gradient(180deg, oklch(0.85 0.16 85), oklch(0.70 0.18 70))'
                : 'linear-gradient(180deg, oklch(0.75 0.15 215), oklch(0.58 0.18 240))',
            }}
          />
        )}
        <span
          className={cn(
            s.iconBox,
            !isActive && 'text-white/55 group-hover:text-white/90',
            isActive && !isAdminLink && 'text-white',
          )}
          style={
            isActive
              ? isAdminLink
                ? {
                    background: 'oklch(0.72 0.15 80 / 0.25)',
                    color: 'oklch(0.88 0.14 85)',
                    boxShadow: '0 0 12px oklch(0.72 0.15 80 / 0.25)',
                  }
                : {
                    background: 'oklch(0.55 0.14 225 / 0.30)',
                    boxShadow: '0 0 12px oklch(0.60 0.18 225 / 0.3)',
                    color: variant === 'drawer' ? 'white' : undefined,
                  }
              : variant === 'drawer'
                ? { color: 'inherit' }
                : undefined
          }
        >
          <Icon className={s.icon} />
        </span>
        <span className="flex-1">{label}</span>
        {isActive && <ChevronRight className={s.chevron} />}
        {!isActive && variant === 'sidebar' && (
          <span
            className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          />
        )}
      </Link>
    )

    return wrapNavLink(variant, key, link)
  }

  return (
    <>
      <nav className={s.nav}>
        <p
          className={cn('px-3 text-[10px] font-semibold uppercase tracking-widest', s.sectionPb)}
          style={{ color: 'oklch(0.62 0.04 240)' }}
        >
          General
        </p>
        {participantNavItems.map((item) =>
          renderNavLink(item.href, item.href, item.isActive(pathname), false, item.label, item.icon),
        )}

        {isAdmin && (
          <>
            <div
              className={s.adminDivider}
              style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, oklch(0.28 0.05 255), transparent)',
              }}
            />
            <div className={cn('flex items-center gap-2 px-3', s.adminSectionPb)}>
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'oklch(0.75 0.15 80)' }} />
              <p
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'oklch(0.75 0.15 80)' }}
              >
                Administración
              </p>
            </div>
            {adminNavItems.map((item) =>
              renderNavLink(item.href, item.href, pathname.startsWith(item.href), true, item.label, item.icon),
            )}
          </>
        )}
      </nav>

      {user && (
        <div
          className={s.userFooter}
          style={variant === 'drawer' ? styles.drawer.userFooterStyle : undefined}
        >
          <div
            className="mx-1 mb-3"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, oklch(0.26 0.05 255), transparent)',
            }}
          />
          <div
            className={s.userCard}
            style={{
              background: 'oklch(0.18 0.04 255 / 0.7)',
              border: '1px solid oklch(0.28 0.05 255)',
              ...(variant === 'sidebar' ? { backdropFilter: 'blur(8px)' } : {}),
            }}
          >
            <div className="relative shrink-0">
              <div
                className="absolute -inset-0.5 rounded-full opacity-80"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.65 0.15 225), oklch(0.55 0.18 260))',
                }}
              />
              <Avatar className={cn('relative', s.avatar)}>
                <AvatarFallback
                  className={cn('font-bold text-white border-0', s.avatarText)}
                  style={{
                    background: 'linear-gradient(135deg, oklch(0.45 0.18 230), oklch(0.35 0.20 260))',
                  }}
                >
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-none">{user.name}</p>
              {isAdmin ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide',
                    variant === 'drawer' ? 'mt-1.5' : 'mt-1',
                  )}
                  style={{
                    background: 'oklch(0.72 0.15 80 / 0.20)',
                    color: 'oklch(0.85 0.14 85)',
                    border: '1px solid oklch(0.72 0.15 80 / 0.30)',
                  }}
                >
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Admin
                </span>
              ) : variant === 'drawer' ? (
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'oklch(0.55 0.04 240)' }}>
                  {user.email}
                </p>
              ) : (
                <span className="text-[10px]" style={{ color: 'oklch(0.55 0.04 240)' }}>
                  {user.email}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {variant === 'drawer' ? (
                <DrawerClose asChild>
                  <PwButton className={s.actionBtn} iconClass={s.actionIcon} onClick={onOpenPw} />
                </DrawerClose>
              ) : (
                <PwButton className={s.actionBtn} iconClass={s.actionIcon} onClick={onOpenPw} />
              )}
              <button
                onClick={onLogout}
                className={s.actionBtn}
                style={{ color: 'oklch(0.55 0.04 240)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'oklch(0.65 0.18 25)'
                  e.currentTarget.style.background = 'oklch(0.52 0.19 25 / 0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'oklch(0.55 0.04 240)'
                  e.currentTarget.style.background = 'transparent'
                }}
                title="Cerrar sesión"
              >
                <LogOut className={s.actionIcon} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PwButton({
  className,
  iconClass,
  onClick,
}: {
  className: string
  iconClass: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      style={{ color: 'oklch(0.55 0.04 240)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'white'
        e.currentTarget.style.background = 'oklch(0.95 0 0 / 0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'oklch(0.55 0.04 240)'
        e.currentTarget.style.background = 'transparent'
      }}
      title="Cambiar contraseña"
    >
      <KeyRound className={iconClass} />
    </button>
  )
}
