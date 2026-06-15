import { useState } from 'react'
import { KeyRound, Loader2, X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePassword } from '@/lib/api/auth'

function PwForm({
  pwSuccess,
  currentPw,
  setCurrentPw,
  newPw,
  setNewPw,
  pwError,
  isPending,
  onSubmit,
}: {
  pwSuccess: boolean
  currentPw: string
  setCurrentPw: (v: string) => void
  newPw: string
  setNewPw: (v: string) => void
  pwError: string
  isPending: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  if (pwSuccess) {
    return (
      <div className="flex flex-col items-center py-6 gap-2 text-green-600">
        <KeyRound className="w-8 h-8" />
        <p className="font-medium">¡Contraseña actualizada!</p>
      </div>
    )
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="current-pw">Contraseña actual</Label>
        <Input
          id="current-pw"
          type="password"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          placeholder="••••••••"
          className="h-11"
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-pw">Nueva contraseña</Label>
        <Input
          id="new-pw"
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="••••••••"
          className="h-11"
          autoComplete="new-password"
        />
      </div>

      {pwError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{pwError}</p>
      )}

      <Button type="submit" className="w-full h-11" disabled={isPending}>
        {isPending
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
          : 'Cambiar contraseña'}
      </Button>
    </form>
  )
}

/**
 * Diálogo de cambio de contraseña: Dialog en desktop / Drawer en mobile.
 * Se monta con `key` desde el layout en cada apertura, así su estado se resetea.
 */
export function PwChangeDialog({
  open,
  onOpenChange,
  token,
  isDesktop,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  token: string
  isDesktop: boolean
}) {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const pwMutation = useMutation({
    mutationFn: () => changePassword(token, { current_password: currentPw, new_password: newPw }),
    onSuccess: () => {
      setPwSuccess(true)
      setCurrentPw('')
      setNewPw('')
      setTimeout(() => { onOpenChange(false); setPwSuccess(false) }, 1500)
    },
    onError: () => setPwError('Contraseña actual incorrecta o error al cambiar'),
  })

  function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (!currentPw || !newPw) { setPwError('Completá ambos campos'); return }
    if (newPw.length < 6) { setPwError('La nueva contraseña debe tener al menos 6 caracteres'); return }
    pwMutation.mutate()
  }

  const form = (
    <PwForm
      pwSuccess={pwSuccess}
      currentPw={currentPw}
      setCurrentPw={setCurrentPw}
      newPw={newPw}
      setNewPw={setNewPw}
      pwError={pwError}
      isPending={pwMutation.isPending}
      onSubmit={handlePwSubmit}
    />
  )

  return (
    <>
      {/* Desktop */}
      <Dialog open={open && isDesktop} onOpenChange={(o: boolean) => !o && onOpenChange(false)}>
        <DialogContent className="hidden lg:grid sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>

      {/* Mobile */}
      <Drawer open={open && !isDesktop} onOpenChange={(o) => !o && onOpenChange(false)} direction="bottom">
        <DrawerContent className="lg:hidden px-0 pb-0">
          <div className="px-5 pt-4 pb-8 space-y-5 max-w-md mx-auto w-full">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Cambiar contraseña</h3>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {form}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
