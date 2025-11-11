import React from 'react';
import NotificationBell from './NotificationBell';

interface HeaderProps {
    onMenuClick: () => void;
    onNewOSClick: () => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onNewOSClick, searchTerm, setSearchTerm }) => {
    return (
        <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-md">
            <div className="flex items-center justify-between p-2">
                <div className="flex items-center">
                    {/* Hamburger menu button is now hidden on large screens */}
                    <button onClick={onMenuClick} className="lg:hidden p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                        </svg>
                    </button>
                    <div className="relative ml-4">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none">
                                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                        </span>
                        <input 
                            type="text"
                            placeholder="Buscar OS..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full py-2 pl-10 pr-4 text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 border border-transparent rounded-lg focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:border-blue-500"
                        />
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                   <button
                        onClick={onNewOSClick}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    >
                        + Nova OS
                    </button>
                   <NotificationBell />
                </div>
            </div>
        </header>
    );
};

export default Header;