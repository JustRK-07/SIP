import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  AiOutlineDashboard,
  AiOutlinePhone,
  AiOutlineLogout,
  AiOutlineUser,
  AiOutlineSetting,
  AiOutlineRobot,
  AiOutlineMenu,
  AiOutlineClose,
} from "react-icons/ai";

function Navigation() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigationRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => router.pathname === path;

  // Ensure only one navigation instance is rendered
  useEffect(() => {
    if (navigationRef.current) {
      // Check if there are multiple navigation elements
      const existingNavigations = document.querySelectorAll('[data-navigation="main"]');
      if (existingNavigations.length > 1) {
        // Remove duplicate navigation elements
        for (let i = 1; i < existingNavigations.length; i++) {
          existingNavigations[i]?.remove();
        }
      }
    }
  }, []);

  // Close sidebar when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [router.pathname]);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('.sidebar') && !target.closest('.hamburger')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const navigationItems = [
    {
      href: "/",
      icon: AiOutlineDashboard,
      label: "Dashboard",
    },
    {
      href: "/campaigns",
      icon: AiOutlinePhone,
      label: "Campaigns",
    },
    {
      href: "/lead-lists",
      icon: AiOutlineUser,
      label: "Lead Lists",
    },
    {
      href: "/number-management",
      icon: AiOutlinePhone,
      label: "Number Management",
    },
    {
      href: "/agents",
      icon: AiOutlineRobot,
      label: "Agents",
    },
  ];

  const adminItems = [
    {
      href: "/settings",
      icon: AiOutlineSetting,
      label: "Settings",
    },
  ];

  return (
    <div ref={navigationRef} data-navigation="main">
      {/* Mobile Header - Only visible on mobile */}
      <div key="mobile-header" className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-lg border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 115.05 69.48" 
                className="h-6 w-7"
              >
                <defs>
                  <style>{`.cls-1{fill:#1E40AF;fill-rule:evenodd;}`}</style>
                </defs>
                <g id="Layer_2" data-name="Layer 2">
                  <g id="Layer_3" data-name="Layer 3">
                    <path className="cls-1" d="M95,8.85V34.62a5.85,5.85,0,0,0-1,.67,77.45,77.45,0,0,1-6.62,5.23V8.85ZM18.82,6.26a6,6,0,0,1,1.55-4.19A6.18,6.18,0,0,1,24.77,0a6,6,0,0,1,4.71,2.07,5.54,5.54,0,0,1,1.81,4.19,6.29,6.29,0,0,1-6.52,6.52,6.49,6.49,0,0,1-4.4-1.86A6.9,6.9,0,0,1,18.82,6.26ZM15.41,9.11l9.78,16.14L35.49,9.11H46.4L30.52,34.77V54.7H20V34.77L4.59,9.11ZM37.56,29.19l7.71-14.33v6.52h7.3l-.16,7.55H45.27V42.48q0,3.88,1.55,5.17A11,11,0,0,0,51,49.73l1.91.41-3.52,6.62a2.18,2.18,0,0,0-.52.16l-2.33-.78a14.56,14.56,0,0,1-6.26-3.78,10.27,10.27,0,0,1-2.07-3.93,20.1,20.1,0,0,1-.52-5.07V29.19ZM16.08,46.88q-7.56,5-6.26,8.07,2.74,6.93,18.37,6.78a91.45,91.45,0,0,0,20.7-2.85,1.71,1.71,0,0,0,.52-.26Q55.15,57,60.89,55A5.34,5.34,0,0,0,63,54.44a129.08,129.08,0,0,0,16-7.3,93.39,93.39,0,0,0,8.33-5q3.52-2.33,6.62-4.81a3.32,3.32,0,0,1,1-.88q10.71-9.42,8.12-16-1.09-2.07-4.45-1.81,14.07-3.78,16,1,2.43,6.26-12.42,20.18-3.52,2.9-7.3,5.74-3.52,2.48-7.14,4.81A143.16,143.16,0,0,1,63.64,61.22q-23.34,7.71-42,8.23Q2.78,70,.3,63.55-2.19,57.44,16.08,46.88Zm69.19-5.74H60a9.38,9.38,0,0,0,2.23,5,8.66,8.66,0,0,0,6.62,2.33q3.52-.36,5.49-.78Q68.81,50.3,63,52.47q-1.19.41-2.07.78a15.71,15.71,0,0,1-6.11-5.85,16.21,16.21,0,0,1-2.48-9.11q0-8,4.66-12.89A14.78,14.78,0,0,1,68.29,21a15.6,15.6,0,0,1,8.9,2,14.89,14.89,0,0,1,6,6.26q2.12,3.62,2.12,10.66ZM68.55,27.74A8.84,8.84,0,0,0,62.34,30,7,7,0,0,0,60,35.29H77.3a7.33,7.33,0,0,0-2.48-5.49A9.08,9.08,0,0,0,68.55,27.74Z"/>
                  </g>
                </g>
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold text-gray-800 tracking-tight">Ytel</span>
            </div>
          </div>
          <button
            className="hamburger p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation menu"
          >
            {isOpen ? (
              <AiOutlineClose className="h-6 w-6" />
            ) : (
              <AiOutlineMenu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Only visible on desktop, slides in on mobile when open */}
      <div key="sidebar" className={`
        sidebar fixed left-0 top-0 h-full ${isCollapsed ? 'w-20' : 'w-72'} bg-white border-r border-gray-200 shadow-2xl z-50 transform transition-all duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:shadow-lg
      `}>
        {/* Logo/Brand */}
        <div className={`flex-shrink-0 flex items-center ${isCollapsed ? 'justify-center px-4' : 'justify-between px-6'} py-8 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50`}>
          <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
            <div className="p-2 bg-white rounded-xl shadow-md">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 115.05 69.48" 
                className="h-8 w-10"
              >
                <defs>
                  <style>{`.cls-1{fill:#1E40AF;fill-rule:evenodd;}`}</style>
                </defs>
                <g id="Layer_2" data-name="Layer 2">
                  <g id="Layer_3" data-name="Layer 3">
                    <path className="cls-1" d="M95,8.85V34.62a5.85,5.85,0,0,0-1,.67,77.45,77.45,0,0,1-6.62,5.23V8.85ZM18.82,6.26a6,6,0,0,1,1.55-4.19A6.18,6.18,0,0,1,24.77,0a6,6,0,0,1,4.71,2.07,5.54,5.54,0,0,1,1.81,4.19,6.29,6.29,0,0,1-6.52,6.52,6.49,6.49,0,0,1-4.4-1.86A6.9,6.9,0,0,1,18.82,6.26ZM15.41,9.11l9.78,16.14L35.49,9.11H46.4L30.52,34.77V54.7H20V34.77L4.59,9.11ZM37.56,29.19l7.71-14.33v6.52h7.3l-.16,7.55H45.27V42.48q0,3.88,1.55,5.17A11,11,0,0,0,51,49.73l1.91.41-3.52,6.62a2.18,2.18,0,0,0-.52.16l-2.33-.78a14.56,14.56,0,0,1-6.26-3.78,10.27,10.27,0,0,1-2.07-3.93,20.1,20.1,0,0,1-.52-5.07V29.19ZM16.08,46.88q-7.56,5-6.26,8.07,2.74,6.93,18.37,6.78a91.45,91.45,0,0,0,20.7-2.85,1.71,1.71,0,0,0,.52-.26Q55.15,57,60.89,55A5.34,5.34,0,0,0,63,54.44a129.08,129.08,0,0,0,16-7.3,93.39,93.39,0,0,0,8.33-5q3.52-2.33,6.62-4.81a3.32,3.32,0,0,1,1-.88q10.71-9.42,8.12-16-1.09-2.07-4.45-1.81,14.07-3.78,16,1,2.43,6.26-12.42,20.18-3.52,2.9-7.3,5.74-3.52,2.48-7.14,4.81A143.16,143.16,0,0,1,63.64,61.22q-23.34,7.71-42,8.23Q2.78,70,.3,63.55-2.19,57.44,16.08,46.88Zm69.19-5.74H60a9.38,9.38,0,0,0,2.23,5,8.66,8.66,0,0,0,6.62,2.33q3.52-.36,5.49-.78Q68.81,50.3,63,52.47q-1.19.41-2.07.78a15.71,15.71,0,0,1-6.11-5.85,16.21,16.21,0,0,1-2.48-9.11q0-8,4.66-12.89A14.78,14.78,0,0,1,68.29,21a15.6,15.6,0,0,1,8.9,2,14.89,14.89,0,0,1,6,6.26q2.12,3.62,2.12,10.66ZM68.55,27.74A8.84,8.84,0,0,0,62.34,30,7,7,0,0,0,60,35.29H77.3a7.33,7.33,0,0,0-2.48-5.49A9.08,9.08,0,0,0,68.55,27.74Z"/>
                  </g>
                </g>
              </svg>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-gray-800 tracking-tight">Ytel</h1>
                <p className="text-xs text-gray-500 font-medium">AI Call Center</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex p-2 rounded-lg text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
              title="Collapse sidebar"
            >
              <AiOutlineClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex-shrink-0 hidden lg:flex justify-center py-4 border-b border-gray-100">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Expand sidebar"
            >
              <AiOutlineMenu className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-8 overflow-y-auto">
          <div className="space-y-1">
            {navigationItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4'} py-3.5 text-sm font-medium rounded-xl transition-all duration-200 relative
                    ${isActive(item.href)
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                      : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    }
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  {isActive(item.href) && !isCollapsed && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-800 rounded-r-full"></div>
                  )}
                  <Icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-4'} transition-colors ${
                    isActive(item.href) ? "text-white" : "text-gray-400 group-hover:text-blue-500"
                  }`} />
                  {!isCollapsed && (
                    <>
                      <span className="font-semibold tracking-wide">{item.label}</span>
                      {isActive(item.href) && (
                        <div className="ml-auto">
                          <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
                        </div>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Admin Panel - At the bottom */}
        <div className="flex-shrink-0 mt-auto border-t border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100">
          {/* Admin Section Header */}
          {!isCollapsed && (
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-100/50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administration</p>
            </div>
          )}
          
          {/* Admin Navigation Items */}
          <div className="px-4 py-3">
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4'} py-3 text-sm font-medium rounded-xl transition-all duration-200 relative
                    ${isActive(item.href)
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                      : "text-gray-700 hover:bg-white hover:text-blue-600 hover:shadow-sm"
                    }
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-4'} transition-colors ${
                    isActive(item.href) ? "text-white" : "text-gray-500 group-hover:text-blue-500"
                  }`} />
                  {!isCollapsed && (
                    <span className="font-semibold tracking-wide">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Profile Section */}
          {!isCollapsed && (
            <div className="px-4 py-3 border-t border-gray-200">
              <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-white shadow-sm">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                    <AiOutlineUser className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">Administrator</p>
                  <p className="text-xs text-gray-500 truncate">admin@ytel.com</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Sign Out Button */}
          <div className="px-4 py-3 bg-gray-100 border-t border-gray-200">
            <Button
              variant="ghost"
              className={`w-full ${isCollapsed ? 'justify-center px-3' : 'justify-start'} bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-200 transition-all duration-200 rounded-xl py-3 shadow-sm`}
              onClick={logout}
              title={isCollapsed ? "Sign Out" : undefined}
            >
              <AiOutlineLogout className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-semibold">Sign Out</span>}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content spacer for desktop */}
      <div className={`hidden lg:block ${isCollapsed ? 'w-20' : 'w-72'} flex-shrink-0 transition-all duration-300`} />
    </div>
  );
}

export { Navigation };
