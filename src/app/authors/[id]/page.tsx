'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Modal from '@/components/Modal'
import AuthorForm, { type AuthorFormData } from '@/components/AuthorForm'
import BookForm, { toBookPayload, type BookFormData } from '@/components/BookForm'
import { apiFetch } from '@/lib/api'
import type { Author, AuthorStats } from '@/lib/types'

function StatCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail?: string
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-emerald-900">{value}</p>
      {detail && <p className="mt-1 text-sm text-stone-500">{detail}</p>}
    </div>
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

export default function AuthorDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()

  const [author, setAuthor] = useState<Author | null>(null)
  const [stats, setStats] = useState<AuthorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [showBookForm, setShowBookForm] = useState(false)
  const [bookFormKey, setBookFormKey] = useState(0)
  const [deleting, setDeleting] = useState(false)

  // Cargar autor (con sus libros) y estadísticas al mismo tiempo
  const loadData = useCallback(async () => {
    try {
      const [authorData, statsData] = await Promise.all([
        apiFetch<Author>(`/api/authors/${id}`),
        apiFetch<AuthorStats>(`/api/authors/${id}/stats`),
      ])
      setAuthor(authorData)
      setStats(statsData)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el autor')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const closeEditModal = useCallback(() => setEditModalOpen(false), [])

  const handleEditAuthor = async (form: AuthorFormData) => {
    await apiFetch(`/api/authors/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        nationality: form.nationality.trim() || null,
        bio: form.bio.trim() || null,
        birthYear: form.birthYear || null,
      }),
    })

    setEditModalOpen(false)
    await loadData()
  }

  const handleAddBook = async (form: BookFormData) => {
    await apiFetch('/api/books', {
      method: 'POST',
      body: JSON.stringify(toBookPayload({ ...form, authorId: id })),
    })

    setShowBookForm(false)
    setBookFormKey((key) => key + 1)
    await loadData()
  }

  const handleDeleteAuthor = async () => {
    if (!author) return

    const count = author.books?.length ?? 0
    const message =
      count > 0
        ? `¿Eliminar a "${author.name}"? También se eliminarán sus ${count} libro(s).`
        : `¿Eliminar a "${author.name}"?`

    if (!window.confirm(message)) return

    setDeleting(true)
    try {
      await apiFetch(`/api/authors/${id}`, { method: 'DELETE' })
      router.push('/')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar autor')
      setDeleting(false)
    }
  }

  // Estado de carga
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-40 animate-pulse rounded bg-stone-200" />
        <div className="h-40 animate-pulse rounded-xl border border-stone-200 bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-stone-200 bg-white"
            />
          ))}
        </div>
      </div>
    )
  }

  // Autor no encontrado o error
  if (error || !author) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-stone-900">
          {error || 'Autor no encontrado'}
        </p>
        <p className="mt-1 text-stone-500">
          Es posible que el autor haya sido eliminado o que el enlace sea incorrecto.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Volver al dashboard
        </Link>
      </div>
    )
  }

  const books = author.books ?? []
  const details = [author.nationality, author.birthYear && `Nacido en ${author.birthYear}`]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Volver al dashboard
      </Link>

      {/* Información del autor */}
      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800">
            {getInitials(author.name)}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
              {author.name}
            </h1>
            <p className="mt-1 text-stone-500">{author.email}</p>
            {details && <p className="mt-1 text-sm text-stone-600">{details}</p>}
            {author.bio && (
              <p className="mt-3 max-w-2xl text-stone-700">{author.bio}</p>
            )}
            <p className="mt-3 text-xs text-stone-400">
              Registrado el{' '}
              {new Date(author.createdAt).toLocaleDateString('es-PE', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex gap-2 sm:flex-col">
            <button
              onClick={() => setEditModalOpen(true)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Editar autor
            </button>
            <button
              onClick={handleDeleteAuthor}
              disabled={deleting}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? 'Eliminando...' : 'Eliminar autor'}
            </button>
          </div>
        </div>
      </section>

      {/* Estadísticas (endpoint /api/authors/[id]/stats) */}
      {stats && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-stone-900">Estadísticas</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Total de libros" value={stats.totalBooks} />
            <StatCard
              label="Promedio de páginas"
              value={stats.averagePages}
              detail="páginas por libro"
            />
            <StatCard
              label="Géneros escritos"
              value={stats.genres.length}
              detail={stats.genres.join(', ') || 'Sin géneros registrados'}
            />
            <StatCard
              label="Primer libro"
              value={stats.firstBook?.year ?? '—'}
              detail={stats.firstBook?.title ?? 'Sin datos'}
            />
            <StatCard
              label="Último libro"
              value={stats.latestBook?.year ?? '—'}
              detail={stats.latestBook?.title ?? 'Sin datos'}
            />
            <StatCard
              label="Libro más largo / más corto"
              value={
                stats.longestBook && stats.shortestBook
                  ? `${stats.longestBook.pages} / ${stats.shortestBook.pages} págs.`
                  : '—'
              }
              detail={
                stats.longestBook && stats.shortestBook
                  ? `${stats.longestBook.title} / ${stats.shortestBook.title}`
                  : 'Sin datos'
              }
            />
          </div>

          {stats.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {stats.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Libros del autor */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-stone-900">
            Libros ({books.length})
          </h2>
          {!showBookForm && (
            <button
              onClick={() => setShowBookForm(true)}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
            >
              + Agregar libro
            </button>
          )}
        </div>

        {/* Formulario para agregar libro a este autor */}
        {showBookForm && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
            <h3 className="mb-4 font-semibold text-stone-900">
              Nuevo libro de {author.name}
            </h3>
            <BookForm
              key={bookFormKey}
              fixedAuthorId={id}
              genres={stats?.genres ?? []}
              submitLabel="Agregar libro"
              onSubmit={handleAddBook}
              onCancel={() => setShowBookForm(false)}
            />
          </div>
        )}

        {books.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
            <p className="text-stone-500">Este autor aún no tiene libros registrados.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {books.map((book) => (
              <article
                key={book.id}
                className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-stone-900">{book.title}</h3>
                  {book.genre && (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                      {book.genre}
                    </span>
                  )}
                </div>

                {book.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-stone-600">
                    {book.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                  {book.publishedYear && <span>📅 {book.publishedYear}</span>}
                  {book.pages && <span>📄 {book.pages} págs.</span>}
                  {book.isbn && <span>ISBN {book.isbn}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal open={editModalOpen} title="Editar autor" onClose={closeEditModal}>
        <AuthorForm
          initialData={author}
          submitLabel="Guardar cambios"
          onSubmit={handleEditAuthor}
          onCancel={closeEditModal}
        />
      </Modal>
    </div>
  )
}