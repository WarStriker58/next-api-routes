'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { Author } from '@/lib/types'

export interface AuthorFormData {
  name: string
  email: string
  nationality: string
  birthYear: string
  bio: string
}

interface AuthorFormProps {
  initialData?: Author | null
  submitLabel: string
  onSubmit: (data: AuthorFormData) => Promise<void>
  onCancel?: () => void
}

const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20'

const labelClass = 'mb-1 block text-sm font-medium text-stone-700'

export default function AuthorForm({
  initialData,
  submitLabel,
  onSubmit,
  onCancel,
}: AuthorFormProps) {
  const [form, setForm] = useState<AuthorFormData>({
    name: initialData?.name ?? '',
    email: initialData?.email ?? '',
    nationality: initialData?.nationality ?? '',
    birthYear: initialData?.birthYear?.toString() ?? '',
    bio: initialData?.bio ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!form.name.trim() || !form.email.trim()) {
      setError('El nombre y el email son obligatorios')
      return
    }

    setSaving(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="name" className={labelClass}>
          Nombre *
        </label>
        <input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Ej. Gabriel García Márquez"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="autor@example.com"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nationality" className={labelClass}>
            Nacionalidad
          </label>
          <input
            id="nationality"
            name="nationality"
            value={form.nationality}
            onChange={handleChange}
            placeholder="Ej. Perú"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="birthYear" className={labelClass}>
            Año de nacimiento
          </label>
          <input
            id="birthYear"
            name="birthYear"
            type="number"
            value={form.birthYear}
            onChange={handleChange}
            placeholder="Ej. 1936"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className={labelClass}>
          Biografía
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          value={form.bio}
          onChange={handleChange}
          placeholder="Breve descripción del autor"
          className={inputClass}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}