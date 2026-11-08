import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const SORT_FIELDS = ['title', 'publishedYear', 'createdAt'] as const
type SortField = (typeof SORT_FIELDS)[number]

// GET - Buscar libros con filtros, ordenamiento y paginación
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Filtros de texto
    const search = searchParams.get('search')?.trim() || ''
    const genre = searchParams.get('genre')?.trim() || ''
    const authorName = searchParams.get('authorName')?.trim() || ''
    const authorId = searchParams.get('authorId')?.trim() || ''

    // Paginación (page mínimo 1, limit entre 1 y 50)
    const pageParam = parseInt(searchParams.get('page') || '1', 10)
    const limitParam = parseInt(searchParams.get('limit') || '10', 10)

    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
    const limit =
      Number.isNaN(limitParam) || limitParam < 1 ? 10 : Math.min(limitParam, 50)

    // Ordenamiento (solo valores permitidos)
    const sortByParam = searchParams.get('sortBy') || 'createdAt'
    const sortBy: SortField = (SORT_FIELDS as readonly string[]).includes(sortByParam)
      ? (sortByParam as SortField)
      : 'createdAt'
    const order: Prisma.SortOrder =
      searchParams.get('order') === 'asc' ? 'asc' : 'desc'

    // Construir condiciones de búsqueda
    const where: Prisma.BookWhereInput = {
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
      ...(genre ? { genre } : {}),
      ...(authorId ? { authorId } : {}),
      ...(authorName
        ? { author: { name: { contains: authorName, mode: 'insensitive' } } }
        : {}),
    }

    // Campo de orden (los libros sin año van al final)
    const orderBy: Prisma.BookOrderByWithRelationInput =
      sortBy === 'title'
        ? { title: order }
        : sortBy === 'publishedYear'
          ? { publishedYear: { sort: order, nulls: 'last' } }
          : { createdAt: order }

    // Total de resultados y página actual
    const [total, books] = await prisma.$transaction([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [orderBy, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: books,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: 'Error al buscar libros' },
      { status: 500 }
    )
  }
}