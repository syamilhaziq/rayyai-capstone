import {
    BarChart3,
    Bell,
    Bot,
    PanelLeftIcon,
    Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function TopNavigation({
    isSidebarLocked,
    isSidebarOpen,
    isHoveringSidebar,
    isHoveringToggle,
    onSidebarLockChange,
    onSidebarButtonHover,
    onLogout,
}) {
    const navigate = useNavigate();

    const handleLogoClick = () => {
        navigate('/'); // Navigate to home page
    };

    return (
        <header 
            className="border-b-0 px-6 py-4 flex items-center gap-4 fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
            style={{
                background: '#04362c'
            }}
        >
            {/* Logo and Sidebar Toggle - Left Side */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSidebarLockChange}
                    onMouseEnter={() => onSidebarButtonHover(true)}
                    onMouseLeave={() => onSidebarButtonHover(false)}
                    className={`w-10 h-10 p-0 hover:bg-[#d2eaee]/20 transition-all duration-200 flex-shrink-0 relative ${
                        isSidebarLocked
                            ? "bg-[#d2eaee]/20 text-[#d2eaee] shadow-sm"
                            : isHoveringToggle
                            ? "bg-[#d2eaee]/10 text-[#d2eaee]"
                            : ""
                    }`}
                >
                    <PanelLeftIcon className="w-10 h-10 text-[#d2eaee]"/>
                    {isSidebarLocked && (
                        <div className="w-1.5 h-1.5 bg-[#d2eaee] rounded-full absolute top-1 right-1 shadow-sm" />
                    )}
                </Button>

                <div className="flex items-center gap-2">
                    
                    <div 
                        className="text-4xl sm:text-5xl font-bold cursor-pointer hover:opacity-80 transition-opacity text-[#0DaD8D]"
                        onClick={handleLogoClick}
                        style={{ lineHeight: '1.2', paddingBottom: '0.1em', paddingTop: '0.1em' }}
                    >
                        RayyAI
                    </div>
                </div>
            </div>

            <div className="flex-1" />
        </header>
    );
}
export default TopNavigation;
