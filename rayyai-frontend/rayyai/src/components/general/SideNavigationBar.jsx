import React from "react";
import {
    BarChart3,
    Settings as SettingsIcon,
    User,
    ChevronUp,
    LogOut,
} from "lucide-react";
import {
    Sidebar,
    SidebarProvider,
    SidebarHeader,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
    SidebarRail,
} from "../ui/sidebar";
import { useNavigate, useLocation } from "react-router-dom";

function SideNavigationBar({
    isHoveringToggle,
    isSidebarOpen,
    navigation,
    onSidebarOpenClose,
    onSidebarHover,
    onLogout,
    user,
    onProfileClick,
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const isActivePage = (path) => {
        return location.pathname === path;
    };

    const displayName = React.useMemo(() => {
        if (user?.full_name) return user.full_name;
        const nameParts = [user?.first_name, user?.last_name].filter(Boolean);
        if (nameParts.length > 0) {
            return nameParts.join(" ");
        }
        return "Your Profile";
    }, [user]);

    const displayEmail = user?.email || "Update your details";

    return (
        <SidebarProvider
            open={isSidebarOpen}
            onOpenChange={onSidebarOpenClose}
            // defaultOpen={true}
        >
            <Sidebar
                className="border-r-0 transition-all duration-300 sidebar-auto-collapse backdrop-blur-sm"
                style={{
                    background: '#04362c'
                }}
                onMouseEnter={() => onSidebarHover(true)}
                onMouseLeave={() => onSidebarHover(false)}
                data-state={isSidebarOpen ? "expanded" : "collapsed"}
            >
                <SidebarHeader className="border-b-0 px-6 py-15">
                    
                </SidebarHeader>

                <SidebarContent
                    className={`sidebar-scroll transition-all duration-300 text-[#d2eaee] px-4 py-6 scrollbar-hide ${
                        !isSidebarOpen
                            ? "opacity-0 pointer-events-none"
                            : "opacity-100 pointer-events-auto"
                    }`}
                >
                    {navigation.map((section) => (
                        <SidebarGroup key={section.title} className="mb-6">
                            <SidebarGroupLabel className="text-[#d2eaee] text-xl sm:text-2xl font-bold mb-4">
                                {section.title}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {section.items.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                onClick={() =>
                                                    navigate(item.path)
                                                }
                                                isActive={isActivePage(
                                                    item.path
                                                )}
                                                className={`
                                                    ${
                                                        isActivePage(item.path)
                                                            ? "bg-[#d2eaee]/20 text-[#d2eaee] text-lg sm:text-xl font-semibold border border-[#d2eaee]/30"
                                                            : "hover:bg-[#d2eaee]/10 text-[#d2eaee]/80 hover:text-[#d2eaee] text-lg sm:text-xl font-semibold"
                                                    }
                                                    p-4 rounded-lg mb-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:text-[#d2eaee] focus:text-[#d2eaee]
                                                `}
                                                size="lg"
                                            >
                                                <item.icon className="!h-6 !w-6" />
                                                {item.title}
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}
                </SidebarContent>

                <SidebarFooter
                    className={`border-t-0 p-6 transition-all duration-300 ${
                        !isSidebarOpen
                            ? "opacity-0 pointer-events-none"
                            : "opacity-100 pointer-events-auto"
                    }`}
                >
                    <SidebarMenu>

                    <SidebarMenuItem className="mb-6">
                    <SidebarMenuButton
                        variant="outline"
                        size="lg"
                        onClick={onLogout}
                        className="bg-[#d2eaee]/20 backdrop-blur-sm rounded-xl p-7 border border-[#d2eaee]/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-lg sm:text-xl text-[#d2eaee] text-center hover:bg-[#d2eaee]/30 hover:text-[#d2eaee]"
                >
                        <LogOut className="h-5 w-5" />
                        <span>Sign Out</span>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                        
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                type="button"
                                onClick={() => onProfileClick?.()}
                                className="h-24 bg-transparent hover:bg-transparent text-[#d2eaee] hover:text-[#d2eaee] rounded-lg p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border border-transparent cursor-pointer"
                            >
                                <div className="flex items-center gap-4 w-full">
                                    <div className="w-12 h-12 bg-[#04362c] rounded-full flex items-center justify-center shadow-lg border border-white/70">
                                        <User className="h-5 w-5 text-[#d2eaee]" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-xl sm:text-2xl mb-1 font-semibold text-[#d2eaee]">
                                            {displayName}
                                        </p>
                                        <p className="text-base sm:text-lg text-[#d2eaee]/70">
                                            {displayEmail}
                                        </p>
                                    </div>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>

               
            </Sidebar>
        </SidebarProvider>
    );
}

export default SideNavigationBar;
