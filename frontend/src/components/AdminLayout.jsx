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
    <div className="h-screen app-admin-bg flex flex-col md:flex-row text-[#2d1f4f] overflow-hidden">
      <Sidebar userType={userType} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Navbar title={title} hideUserBadge={hideUserBadge} {...navbarProps} />
        <div className="flex-1 overflow-y-auto">
          <main className={`min-h-full flex flex-col ${mainClassName}`.trim()}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
