'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Modal from '@/components/Modal'
import BookForm, { toBookPayload, type BookFormData } from '@/components/BookForm'
import { apiFetch } from '@/lib/api'
import type { Author, Book, BookSearchResponse, Pagination } from '@/lib/types'

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Fecha de creación' },
  { value: 'title', label: 'Título' },
  { value: 'publishedYear', label: 'Año de publicación' },
]

const LIMIT_OPTIONS = [5, 10, 20]

const fieldClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20'

const labelClass = 'mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500'

// Genera los números de página a mostrar, por ejemplo: 1 … 4 5 6 … 10
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | '...')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')

  pages.push(total)
  return pages
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
  )
}

export default function BooksPage() {
  // Opciones para los filtros
  const [authors, setAuthors] = useState<{ id: string; name: string }[]>([])
  const [genres, setGenres] = useState<string[]>([])

  // Filtros y paginación
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [authorId, setAuthorId] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Resultados
  const [books, setBooks] = useState<Book[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  // Modal y acciones
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Cargar autores y géneros disponibles para los dropdowns
  const loadOptions = useCallback(async () => {
    try {
      const data = await apiFetch<Author[]>('/api/authors')
      setAuthors(data.map((author) => ({ id: author.id, name: author.name })))

      const uniqueGenres = new Set(
        data
          .flatMap((author) => author.books ?? [])
          .map((book) => book.genre)
          .filter((genre): genre is string => !!genre)
      )
      setGenres([...uniqueGenres].sort())
    } catch {
      // Si falla, los filtros quedan vacíos pero la búsqueda sigue funcionando
    }
  }, [])

  // Buscar libros usando el endpoint de búsqueda
  const loadBooks = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sortBy,
      order,
    })
    if (search) params.set('search', search)
    if (genre) params.set('genre', genre)
    if (authorId) params.set('authorId', authorId)

    try {
      const result = await apiFetch<BookSearchResponse>(
        `/api/books/search?${params.toString()}`
      )
      // Ignorar respuestas de búsquedas anteriores
      if (currentRequest !== requestId.current) return

      setBooks(result.data)
      setPagination(result.pagination)
      setError('')
    } catch (err) {
      if (currentRequest !== requestId.current) return
      setError(err instanceof Error ? err.message : 'Error al buscar libros')
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [page, limit, sortBy, order, search, genre, authorId])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  useEffect(() => {
    loadBooks()
  }, [loadBooks])

  // Búsqueda en tiempo real: espera 400 ms después de la última tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const hasFilters = searchInput !== '' || genre !== '' || authorId !== ''

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setGenre('')
    setAuthorId('')
    setPage(1)
  }

  const openCreate = () => {
    setEditingBook(null)
    setModalOpen(true)
  }

  const openEdit = (book: Book) => {
    setEditingBook(book)
    setModalOpen(true)
  }

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingBook(null)
  }, [])

  const handleSubmit = async (form: BookFormData) => {
    const payload = toBookPayload(form)

    if (editingBook) {
      await apiFetch(`/api/books/${editingBook.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    } else {
      await apiFetch('/api/books', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }

    closeModal()
    await Promise.all([loadBooks(), loadOptions()])
  }

  const handleDelete = async (book: Book) => {
    if (!window.confirm(`¿Eliminar el libro "${book.title}"?`)) return

    setDeletingId(book.id)
    try {
      await apiFetch(`/api/books/${book.id}`, { method: 'DELETE' })
      await loadOptions()

      // Si era el último libro de la página, volver a la anterior
      if (books.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        await loadBooks()
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar libro')
    } finally {
      setDeletingId(null)
    }
  }

  const from = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0
  const to = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Libros</h1>
          <p className="mt-1 text-stone-500">
            Busca, filtra y administra el catálogo de la biblioteca.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
        >
          + Nuevo libro
        </button>
      </div>

      {/* Filtros */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2">
            <label htmlFor="search" className={labelClass}>
              Buscar por título
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                🔍
              </span>
              <input
                id="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ej. amor, ciudad, cuentos..."
                className={`${fieldClass} pl-9`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="genre" className={labelClass}>
              Género
            </label>
            <select
              id="genre"
              value={genre}
              onChange={(e) => {
                setGenre(e.target.value)
                setPage(1)
              }}
              className={fieldClass}
            >
              <option value="">Todos</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="author" className={labelClass}>
              Autor
            </label>
            <select
              id="author"
              value={authorId}
              onChange={(e) => {
                setAuthorId(e.target.value)
                setPage(1)
              }}
              className={fieldClass}
            >
              <option value="">Todos</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sortBy" className={labelClass}>
              Ordenar por
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setPage(1)
              }}
              className={fieldClass}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="order" className={labelClass}>
              Orden
            </label>
            <select
              id="order"
              value={order}
              onChange={(e) => {
                setOrder(e.target.value as 'asc' | 'desc')
                setPage(1)
              }}
              className={fieldClass}
            >
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="mt-3 text-sm font-medium text-emerald-700 hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </section>

      {/* Resumen de resultados */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          {loading && <Spinner />}
          {loading && !pagination ? (
            <span>Cargando libros...</span>
          ) : pagination && pagination.total > 0 ? (
            <span>
              Se encontraron <strong className="text-stone-900">{pagination.total}</strong>{' '}
              {pagination.total === 1 ? 'libro' : 'libros'} · mostrando {from}–{to}
            </span>
          ) : (
            <span>No se encontraron libros</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-stone-600">
          <label htmlFor="limit">Por página:</label>
          <select
            id="limit"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              setPage(1)
            }}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
          >
            {LIMIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={loadBooks} className="font-medium underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Lista de libros */}
      {loading && books.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-stone-200 bg-white"
            />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="text-stone-500">
            {hasFilters
              ? 'Ningún libro coincide con los filtros seleccionados.'
              : 'Aún no hay libros registrados.'}
          </p>
          {hasFilters ? (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm font-medium text-emerald-700 hover:underline"
            >
              Limpiar filtros
            </button>
          ) : (
            <button
              onClick={openCreate}
              className="mt-3 text-sm font-medium text-emerald-700 hover:underline"
            >
              Crear el primer libro
            </button>
          )}
        </div>
      ) : (
        <div
          className={`grid gap-4 transition-opacity md:grid-cols-2 ${
            loading ? 'opacity-50' : 'opacity-100'
          }`}
        >
          {books.map((book) => (
            <article
              key={book.id}
              className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-stone-900">{book.title}</h3>
                  {book.author && (
                    <Link
                      href={`/authors/${book.author.id}`}
                      className="text-sm text-emerald-700 hover:underline"
                    >
                      {book.author.name}
                    </Link>
                  )}
                </div>
                {book.genre && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                    {book.genre}
                  </span>
                )}
              </div>

              {book.description && (
                <p className="mt-3 line-clamp-2 text-sm text-stone-600">
                  {book.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                {book.publishedYear && <span>📅 {book.publishedYear}</span>}
                {book.pages && <span>📄 {book.pages} págs.</span>}
                {book.isbn && <span>ISBN {book.isbn}</span>}
              </div>

              <div className="mt-auto flex gap-2 pt-4">
                <button
                  onClick={() => openEdit(book)}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(book)}
                  disabled={deletingId === book.id}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === book.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-1 pt-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={!pagination.hasPrev || loading}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Anterior
          </button>

          {getPageNumbers(pagination.page, pagination.totalPages).map((item, index) =>
            item === '...' ? (
              <span key={`dots-${index}`} className="px-2 text-stone-400">
                …
              </span>
            ) : (
              <button
                key={item}
                onClick={() => setPage(item)}
                disabled={loading}
                className={`min-w-10 rounded-lg px-3 py-2 text-sm font-medium ${
                  item === pagination.page
                    ? 'bg-emerald-700 text-white'
                    : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            onClick={() => setPage(page + 1)}
            disabled={!pagination.hasNext || loading}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente →
          </button>
        </nav>
      )}

      <Modal
        open={modalOpen}
        title={editingBook ? 'Editar libro' : 'Nuevo libro'}
        onClose={closeModal}
      >
        <BookForm
          key={editingBook?.id ?? 'new'}
          initialData={editingBook}
          authors={authors}
          genres={genres}
          submitLabel={editingBook ? 'Guardar cambios' : 'Crear libro'}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  )
}