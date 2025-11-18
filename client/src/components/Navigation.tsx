import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, User, LogOut, LayoutDashboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { APP_LOGO } from "@/const";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";
// Removed getLoginUrl import - using direct /login route instead

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile } = useCurrentUser();
  const [, setLocation] = useLocation();

  const isAuthenticated = !!user;

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      setLocation("/");
      window.location.reload(); // Refresh to clear all state
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (profile?.name) {
      return profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (profile?.name) return profile.name;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  };

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <img src={APP_LOGO} alt="CommercialX" className="h-32 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/inventory" className="text-foreground hover:text-primary transition-colors font-medium">
              Browse Vehicles
            </Link>
            <Link href="/bodies-equipment" className="text-foreground hover:text-primary transition-colors font-medium">
              Body & Equipment
            </Link>
            <Link href="/infrastructure" className="text-foreground hover:text-primary transition-colors font-medium">
              Infrastructure
            </Link>
            <Link href="/financing" className="text-foreground hover:text-primary transition-colors font-medium">
              Financing
            </Link>
            <Link href="/resources" className="text-foreground hover:text-primary transition-colors font-medium">
              Resource Center
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full"
                      aria-label="User menu"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {getUserDisplayName()}
                        </p>
                        {user?.email && (
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                        {profile?.organization_name && (
                          <p className="text-xs leading-none text-muted-foreground mt-1">
                            {profile.organization_name}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>View Profile</span>
                    </DropdownMenuItem>
                    {profile?.organization_type === "dealer" && (
                      <DropdownMenuItem onClick={() => setLocation("/dealer")} className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}
            {profile && (
              <Button className="bg-primary hover:bg-primary/90" asChild>
                <Link href="/dealer">List Your Inventory</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-foreground hover:text-primary"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border">
            <Link
              href="/inventory"
              className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
              onClick={toggleMenu}
            >
              Browse Vehicles
            </Link>
            <Link
              href="/bodies-equipment"
              className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
              onClick={toggleMenu}
            >
              Body & Equipment
            </Link>
            <Link
              href="/infrastructure"
              className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
              onClick={toggleMenu}
            >
              Infrastructure
            </Link>
            <Link
              href="/financing"
              className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
              onClick={toggleMenu}
            >
              Financing
            </Link>
            <Link
              href="/resources"
              className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
              onClick={toggleMenu}
            >
              Resource Center
            </Link>
            <div className="pt-4 space-y-2">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 px-2 py-2 border-b border-border mb-2">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">{getUserDisplayName()}</p>
                      {user?.email && (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={toggleMenu} asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      View Profile
                    </Link>
                  </Button>
                  {profile?.organization_type === "dealer" && (
                    <Button variant="outline" className="w-full" onClick={toggleMenu} asChild>
                      <Link href="/dealer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/login" onClick={toggleMenu}>Sign In</Link>
                </Button>
              )}
              {profile && (
                <Button className="w-full bg-primary hover:bg-primary/90" onClick={toggleMenu} asChild>
                  <Link href="/dealer">List Your Inventory</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
