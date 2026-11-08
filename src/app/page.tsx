'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Modal from '@/components/Modal'
import AuthorForm, { type AuthorFormData } from '@/components/AuthorForm'
import { apiFetch } from '@/lib/api'
import type { Author } from '@/lib/types'

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-emerald-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadAuthors = useCallback(async () => {
    try {
      const data = await apiFetch<Author[]>('/api/authors')
      setAuthors(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar autores')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAuthors()
  }, [loadAuthors])

  // Estadísticas generales calculadas a partir de los autores y sus libros
  const stats = useMemo(() => {
    const books = authors.flatMap((author) => author.books ?? [])

    const booksWithPages = books.filter((book) => book.pages)
    const averagePages =
      booksWithPages.length > 0
        ? Math.round(
            booksWithPages.reduce((sum, book) => sum + (book.pages ?? 0), 0) /
              booksWithPages.length
          )
        : 0

    const genreCounts = books.reduce<Record<string, number>>((acc, book) => {
      if (book.genre) acc[book.genre] = (acc[book.genre] ?? 0) + 1
      return acc
    }, {})

    const genres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])

    const topAuthors = [...authors]
      .sort((a, b) => (b._count?.books ?? 0) - (a._count?.books ?? 0))
      .slice(0, 3)

    return {
      totalAuthors: authors.length,
      totalBooks: books.length,
      totalGenres: genres.length,
      averagePages,
      genres,
      topAuthors,
    }
  }, [authors])

  const openCreate = () => {
    setEditingAuthor(null)
    setModalOpen(true)
  }

  const openEdit = (author: Author) => {
    setEditingAuthor(author)
    setModalOpen(true)
  }

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingAuthor(null)
  }, [])

  const handleSubmit = async (form: AuthorFormData) => {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      nationality: form.nationality.trim() || null,
      bio: form.bio.trim() || null,
      birthYear: form.birthYear || null,
    }

    if (editingAuthor) {
      await apiFetch(`/api/authors/${editingAuthor.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    } else {
      await apiFetch('/api/authors', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }

    closeModal()
    await loadAuthors()
  }

  const handleDelete = async (author: Author) => {
    const count = author._count?.books ?? 0
    const message =
      count > 0
        ? `¿Eliminar a "${author.name}"? También se eliminarán sus ${count} libro(s).`
        : `¿Eliminar a "${author.name}"?`

    if (!window.confirm(message)) return

    setDeletingId(author.id)
    try {
      await apiFetch(`/api/authors/${author.id}`, { method: 'DELETE' })
      await loadAuthors()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar autor')
    } finally {
      setDeletingId(null)
    }
  }

  const maxGenreCount = stats.genres[0]?.[1] ?? 1

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-stone-500">
            Gestiona los autores de la biblioteca y revisa sus estadísticas.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
        >
          + Nuevo autor
        </button>
      </div>

      {/* Estadísticas generales */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Autores" value={loading ? '—' : stats.totalAuthors} />
        <StatCard label="Libros" value={loading ? '—' : stats.totalBooks} />
        <StatCard label="Géneros" value={loading ? '—' : stats.totalGenres} />
        <StatCard
          label="Promedio de páginas"
          value={loading ? '—' : stats.averagePages}
          hint="por libro"
        />
      </section>

      {!loading && stats.totalBooks > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900">Libros por género</h2>
            <ul className="mt-4 space-y-3">
              {stats.genres.map(([genre, count]) => (
                <li key={genre}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-stone-700">{genre}</span>
                    <span className="font-medium text-stone-900">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100">
                    <div
                      className="h-2 rounded-full bg-emerald-600"
                      style={{ width: `${(count / maxGenreCount) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900">
              Autores con más libros
            </h2>
            <ol className="mt-4 space-y-3">
              {stats.topAuthors.map((author, index) => (
                <li key={author.id} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
                    {index + 1}
                  </span>
                  <Link
                    href={`/authors/${author.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800 hover:text-emerald-700"
                  >
                    {author.name}
                  </Link>
                  <span className="text-sm text-stone-500">
                    {author._count?.books ?? 0} libros
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Lista de autores */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-stone-900">
          Autores {!loading && `(${authors.length})`}
        </h2>

        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={loadAuthors} className="font-medium underline">
              Reintentar
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-xl border border-stone-200 bg-white"
              />
            ))}
          </div>
        ) : authors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
            <p className="text-stone-500">Aún no hay autores registrados.</p>
            <button
              onClick={openCreate}
              className="mt-3 text-sm font-medium text-emerald-700 hover:underline"
            >
              Crear el primer autor
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => {
              const count = author._count?.books ?? 0
              const details = [author.nationality, author.birthYear]
                .filter(Boolean)
                .join(' · ')

              return (
                <article
                  key={author.id}
                  className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-stone-900">
                        {author.name}
                      </h3>
                      <p className="truncate text-sm text-stone-500">
                        {author.email}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                      {count} {count === 1 ? 'libro' : 'libros'}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-stone-600">
                    {details || 'Sin datos adicionales'}
                  </p>

                  {author.bio && (
                    <p className="mt-2 line-clamp-2 text-sm text-stone-500">
                      {author.bio}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <Link
                      href={`/authors/${author.id}`}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                    >
                      Ver libros
                    </Link>
                    <button
                      onClick={() => openEdit(author)}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(author)}
                      disabled={deletingId === author.id}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === author.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        title={editingAuthor ? 'Editar autor' : 'Nuevo autor'}
        onClose={closeModal}
      >
        <AuthorForm
          key={editingAuthor?.id ?? 'new'}
          initialData={editingAuthor}
          submitLabel={editingAuthor ? 'Guardar cambios' : 'Crear autor'}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  )
}