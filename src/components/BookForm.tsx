'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { Book } from '@/lib/types'

export interface BookFormData {
  title: string
  authorId: string
  genre: string
  publishedYear: string
  pages: string
  isbn: string
  description: string
}

interface BookFormProps {
  initialData?: Book | null
  authors?: { id: string; name: string }[]
  genres?: string[]
  fixedAuthorId?: string
  submitLabel: string
  onSubmit: (data: BookFormData) => Promise<void>
  onCancel?: () => void
}

// Convierte los datos del formulario al formato que espera la API
export function toBookPayload(form: BookFormData) {
  return {
    title: form.title.trim(),
    authorId: form.authorId,
    genre: form.genre.trim() || null,
    publishedYear: form.publishedYear || null,
    pages: form.pages || null,
    isbn: form.isbn.trim() || null,
    description: form.description.trim() || null,
  }
}

const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20'

const labelClass = 'mb-1 block text-sm font-medium text-stone-700'

export default function BookForm({
  initialData,
  authors = [],
  genres = [],
  fixedAuthorId,
  submitLabel,
  onSubmit,
  onCancel,
}: BookFormProps) {
  const [form, setForm] = useState<BookFormData>({
    title: initialData?.title ?? '',
    authorId: initialData?.authorId ?? fixedAuthorId ?? '',
    genre: initialData?.genre ?? '',
    publishedYear: initialData?.publishedYear?.toString() ?? '',
    pages: initialData?.pages?.toString() ?? '',
    isbn: initialData?.isbn ?? '',
    description: initialData?.description ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (form.title.trim().length < 3) {
      setError('El título debe tener al menos 3 caracteres')
      return
    }

    if (!form.authorId) {
      setError('Selecciona un autor')
      return
    }

    if (form.pages && Number(form.pages) < 1) {
      setError('El número de páginas debe ser mayor a 0')
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
        <label htmlFor="title" className={labelClass}>
          Título *
        </label>
        <input
          id="title"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Ej. La ciudad y los perros"
          className={inputClass}
        />
      </div>

      {!fixedAuthorId && (
        <div>
          <label htmlFor="authorId" className={labelClass}>
            Autor *
          </label>
          <select
            id="authorId"
            name="authorId"
            value={form.authorId}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Selecciona un autor</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="genre" className={labelClass}>
            Género
          </label>
          <input
            id="genre"
            name="genre"
            list="genre-options"
            value={form.genre}
            onChange={handleChange}
            placeholder="Ej. Novela"
            className={inputClass}
          />
          <datalist id="genre-options">
            {genres.map((genre) => (
              <option key={genre} value={genre} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="publishedYear" className={labelClass}>
            Año
          </label>
          <input
            id="publishedYear"
            name="publishedYear"
            type="number"
            value={form.publishedYear}
            onChange={handleChange}
            placeholder="Ej. 1963"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pages" className={labelClass}>
            Páginas
          </label>
          <input
            id="pages"
            name="pages"
            type="number"
            min={1}
            value={form.pages}
            onChange={handleChange}
            placeholder="Ej. 450"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="isbn" className={labelClass}>
          ISBN
        </label>
        <input
          id="isbn"
          name="isbn"
          value={form.isbn}
          onChange={handleChange}
          placeholder="Opcional"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={form.description}
          onChange={handleChange}
          placeholder="Breve descripción del libro"
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