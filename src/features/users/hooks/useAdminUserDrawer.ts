import { useState } from 'react'

import type { UserDTO } from '@/lib/api/types'

type EditMutation = {
  mutate: (
    vars: { id: string; name: string; email: string },
    options?: { onSuccess?: () => void; onError?: () => void },
  ) => void
  reset: () => void
  isPending: boolean
  isSuccess: boolean
}

type PwMutation = {
  mutate: (
    vars: { current_password: string; new_password: string },
    options?: { onSuccess?: () => void; onError?: () => void },
  ) => void
  isPending: boolean
}

type UseAdminUserDrawerArgs = {
  selected: UserDTO | null
  setSelected: React.Dispatch<React.SetStateAction<UserDTO | null>>
  editMutation: EditMutation
  pwMutation: PwMutation
}

export function useAdminUserDrawer({
  selected,
  setSelected,
  editMutation,
  pwMutation,
}: UseAdminUserDrawerArgs) {
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false)

  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editError, setEditError] = useState('')

  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  function openDrawer(u: UserDTO) {
    setSelected(u)
    setEditName(u.name)
    setEditEmail(u.email)
    setEditError('')
    setPwCurrent('')
    setPwNew('')
    setPwConfirm('')
    setPwError('')
    setPwSuccess(false)
    editMutation.reset()
  }

  function closeDrawer() {
    setSelected(null)
    setConfirmDeactivateOpen(false)
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setEditError('')
    if (!editName.trim() || !editEmail.trim()) {
      setEditError('Nombre y email son obligatorios')
      return
    }
    editMutation.mutate(
      { id: selected.id, name: editName.trim(), email: editEmail.trim() },
      {
        onSuccess: () => setEditError(''),
        onError: () => setEditError('No se pudo guardar los cambios'),
      },
    )
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwError('Completá todos los campos')
      return
    }
    if (pwNew !== pwConfirm) {
      setPwError('Las contraseñas nuevas no coinciden')
      return
    }
    if (pwNew.length < 6) {
      setPwError('Mínimo 6 caracteres')
      return
    }
    pwMutation.mutate(
      { current_password: pwCurrent, new_password: pwNew },
      {
        onSuccess: () => {
          setPwCurrent('')
          setPwNew('')
          setPwConfirm('')
          setPwError('')
          setPwSuccess(true)
          setTimeout(() => setPwSuccess(false), 4000)
        },
        onError: () => setPwError('Contraseña actual incorrecta'),
      },
    )
  }

  return {
    confirmDeactivateOpen,
    setConfirmDeactivateOpen,
    openDrawer,
    closeDrawer,
    edit: {
      name: editName,
      email: editEmail,
      error: editError,
      pending: editMutation.isPending,
      success: editMutation.isSuccess,
      onName: setEditName,
      onEmail: setEditEmail,
      onSubmit: handleEditSubmit,
    },
    password: {
      current: pwCurrent,
      next: pwNew,
      confirm: pwConfirm,
      error: pwError,
      success: pwSuccess,
      pending: pwMutation.isPending,
      onCurrent: setPwCurrent,
      onNext: setPwNew,
      onConfirm: setPwConfirm,
      onSubmit: handlePasswordSubmit,
    },
  }
}
