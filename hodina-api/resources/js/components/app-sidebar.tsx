import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    BookCheck,
    Building2,
    LayoutGrid,
    Shapes,
    SlidersHorizontal,
    Users,
} from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const isAdmin = auth.user.role === 'admin';

    const mainNavItems: NavItem[] = isAdmin
        ? [
              {
                  title: 'Overview',
                  href: '/admin',
                  icon: LayoutGrid,
              },
              {
                  title: 'Hosts',
                  href: '/admin/guesthouses',
                  icon: Building2,
              },
              {
                  title: 'Utilizatori',
                  href: '/admin/users',
                  icon: Users,
              },
              {
                  title: 'Categorii',
                  href: '/admin/categories',
                  icon: Shapes,
              },
              {
                  title: 'Atribute',
                  href: '/admin/attributes',
                  icon: SlidersHorizontal,
              },
              {
                  title: 'Rezervări',
                  href: '/admin/bookings',
                  icon: BookCheck,
              },
          ]
        : [
              {
                  title: 'Dashboard',
                  href: '/dashboard',
                  icon: LayoutGrid,
              },
          ];

    const homeHref = isAdmin ? '/admin' : '/dashboard';

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={homeHref} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
