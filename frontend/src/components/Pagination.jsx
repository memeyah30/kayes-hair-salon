const Pagination = ({
  pagination,
  onPageChange,
  loading = false,
  itemLabel = 'entries',
}) => {
  const currentPage = Number(pagination?.current_page || 1)
  const lastPage = Number(pagination?.last_page || 1)
  const total = Number(pagination?.total || 0)
  const from = pagination?.from ?? 0
  const to = pagination?.to ?? 0

  if (total <= 0) return null

  const pageNumbers = Array.from({ length: lastPage }, (_, index) => index + 1)

  const handlePageClick = (page) => {
    if (loading || page < 1 || page > lastPage || page === currentPage) return
    onPageChange(page)
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[#DDD6FE] px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="text-sm text-[#6B6B6B]">
        Showing {from}-{to} of {total} {itemLabel}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={loading || currentPage <= 1}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            loading || currentPage <= 1
              ? 'cursor-not-allowed border-[#E5E7EB] bg-[#F3F4F6] text-[#9CA3AF]'
              : 'border-[#DDD6FE] bg-white text-[#6F4ED0] hover:bg-[#F6F2FF]'
          }`}
        >
          Previous
        </button>

        {pageNumbers.map((pageNumber) => {
          const isActive = pageNumber === currentPage

          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => handlePageClick(pageNumber)}
              disabled={loading}
              className={`min-w-[2.5rem] rounded-lg border px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'border-[#7B5CF5] bg-[#7B5CF5] text-white'
                  : 'border-[#DDD6FE] bg-white text-[#6F4ED0] hover:bg-[#F6F2FF]'
              } ${loading ? 'cursor-not-allowed opacity-70' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {pageNumber}
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={loading || currentPage >= lastPage}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            loading || currentPage >= lastPage
              ? 'cursor-not-allowed border-[#E5E7EB] bg-[#F3F4F6] text-[#9CA3AF]'
              : 'border-[#DDD6FE] bg-white text-[#6F4ED0] hover:bg-[#F6F2FF]'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default Pagination
