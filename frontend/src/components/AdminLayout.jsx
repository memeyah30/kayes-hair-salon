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
    <div className="min-h-screen app-admin-bg flex flex-col md:flex-row text-[#2d1f4f]">
      <Sidebar userType={userType} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={title} hideUserBadge={hideUserBadge} {...navbarProps} />
        <main className={`flex-1 min-w-0 flex flex-col ${mainClassName}`.trim()}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
