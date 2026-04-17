import Sidebar from './Sidebar'
import Navbar from './Navbar'

const AdminLayout = ({
  userType = 'admin',
  onLogout,
  title = 'Dashboard',
  hideUserBadge = false,
  children,
  mainClassName = '',
}) => {
  return (
    <div className="min-h-screen app-admin-bg flex flex-col text-[#2d1f4f]">
      <Navbar title={title} hideUserBadge={hideUserBadge} />
      <div className="flex flex-1 md:flex-row">
        <Sidebar userType={userType} onLogout={onLogout} />
        <main className={`flex-1 min-w-0 flex flex-col ${mainClassName}`.trim()}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
