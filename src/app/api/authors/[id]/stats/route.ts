import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener estadísticas completas de un autor
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Buscar el autor con todos sus libros
    const author = await prisma.author.findUnique({
      where: { id },
      include: {
        books: {
          select: {
            title: true,
            publishedYear: true,
            genre: true,
            pages: true,
          },
        },
      },
    })

    if (!author) {
      return NextResponse.json(
        { error: 'Autor no encontrado' },
        { status: 404 }
      )
    }

    const books = author.books

    // Libros con año de publicación, ordenados del más antiguo al más reciente
    const booksWithYear = books
      .filter((book) => book.publishedYear !== null)
      .sort((a, b) => (a.publishedYear as number) - (b.publishedYear as number))

    const first = booksWithYear[0]
    const latest = booksWithYear[booksWithYear.length - 1]

    // Libros con número de páginas, ordenados de menor a mayor
    const booksWithPages = books
      .filter((book) => book.pages !== null)
      .sort((a, b) => (a.pages as number) - (b.pages as number))

    const shortest = booksWithPages[0]
    const longest = booksWithPages[booksWithPages.length - 1]

    // Promedio de páginas (redondeado)
    const totalPages = booksWithPages.reduce(
      (sum, book) => sum + (book.pages as number),
      0
    )
    const averagePages =
      booksWithPages.length > 0
        ? Math.round(totalPages / booksWithPages.length)
        : 0

    // Géneros únicos (sin repetir y en orden alfabético)
    const genres = [
      ...new Set(
        books
          .map((book) => book.genre)
          .filter((genre): genre is string => !!genre)
      ),
    ].sort()

    return NextResponse.json({
      authorId: author.id,
      authorName: author.name,
      totalBooks: books.length,
      firstBook: first
        ? { title: first.title, year: first.publishedYear }
        : null,
      latestBook: latest
        ? { title: latest.title, year: latest.publishedYear }
        : null,
      averagePages,
      genres,
      longestBook: longest
        ? { title: longest.title, pages: longest.pages }
        : null,
      shortestBook: shortest
        ? { title: shortest.title, pages: shortest.pages }
        : null,
    })
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del autor' },
      { status: 500 }
    )
  }
}