import { useState } from 'react'
import { LayoutDashboardIcon, ListCollapseIcon, ListIcon, MenuIcon, PlusCircleIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppContext } from '../context/Appcontext' // ✅ import context
import { assets } from '../assets/assets'

const Adminsidebar = () => {
  const [isOpen, setisOpen] = useState(false);
  const { user } = useAppContext(); // ✅ get user from context

  // fallback agar user ya image na ho to
  const profilePic = user?.imageUrl || assets.profile;
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "Admin User";

  const adminLinks = [
    { name: 'Dashboard', pathname: '/admin', icon: LayoutDashboardIcon },
    { name: 'Add Shows', pathname: '/admin/add-shows', icon: PlusCircleIcon },
    { name: 'List Shows', pathname: '/admin/list-shows', icon: ListIcon },
    { name: 'List Bookings', pathname: '/admin/list-bookings', icon: ListCollapseIcon }
  ]

  return (
    <div>
      {/* Toggle button for mobile */}
      <MenuIcon
        className='w-8 h-8 min-md:hidden absolute top-5 left-5 cursor-pointer'
        onClick={() => setisOpen(!isOpen)}
      />

      {/* Sidebar */}
      <div
        className={`flex flex-col h-[calc(100vh-72px)] items-center pt-8 
          max-md:bg-primary/20 max-md:backdrop-blur-xl max-w-55 w-full 
          border-r border-gray-300/30 text-lg max-md:text-md max-md:absolute 
          z-50 transition-[width] overflow-hidden duration-300 
          ${isOpen ? 'max-md:w-full' : 'max-md:w-0'}`}
      >
        {/* User Profile */}
        <img
          src={profilePic}
          alt="User"
          className='w-14 h-14 md:h-16 md:w-16 rounded-full mx-20'
        />
        <p className='py-2 text-base font-medium max-md:hidden'>
          {fullName}
        </p>

        {/* Navigation Links */}
        <div className='w-full'>
          {adminLinks.map((link, index) => (
            <NavLink
              key={index}
              to={link.pathname}
              end
              className={({ isActive }) =>
                `relative flex items-center max-md:justify-center gap-2 w-full py-2.5 min-md:pl-10 
                 first:mt-6 text-gray-400 ${isActive && 'bg-primary/15 text-primary group'}`
              }
            >
              {({ isActive }) => (
                <>
                  <link.icon className='w-5 h-5 max-md:w-4 max-md:h-4' />
                  <p className='text-sm'>{link.name}</p>
                  <span className={`w-1.5 h-10 rounded-l right-0 absolute ${isActive && 'bg-primary'}`} />
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Adminsidebar
