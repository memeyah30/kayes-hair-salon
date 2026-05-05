import Sidebar from './Sidebar'
import Navbar from './Navbar'

const AdminLayout = ({
  userType = 'admin',
  onLogout,
  title = 'Dashboard',
  hideUserBadge = false,
  navbarProps = {},
  children,
  mainClassName = '',
}) => {
  return (
    <div className="h-screen app-admin-bg flex flex-col text-[#2d1f4f] overflow-hidden">
      <Navbar title={title} hideUserBadge={hideUserBadge} {...navbarProps} />
      <div className="flex-1 flex flex-row min-w-0 overflow-hidden relative">
        <Sidebar userType={userType} onLogout={onLogout} />
        <main className={`flex-1 min-w-0 overflow-y-auto ${mainClassName}`.trim()}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
