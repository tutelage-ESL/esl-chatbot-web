interface PaginationParams {
  page?: string | number;
  limit?: string | number;
}

interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export function paginate(params: PaginationParams): PaginationResult {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}

export function paginationMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
