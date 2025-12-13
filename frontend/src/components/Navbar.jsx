const Navbar = () => {
  return (
    <header className="bg-white shadow px-4 py-3 flex items-center justify-between">
      <div className="font-semibold text-lg">Dashboard</div>
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search"
          className="hidden md:block border rounded px-3 py-2 text-sm"
        />
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
          TS
        </div>
      </div>
    </header>
  )
}

export default Navbar