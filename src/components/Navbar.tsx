import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Film, LogOut, User, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const Navbar = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Film className="w-6 h-6 text-primary" />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              CineMax
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/admin')}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/bookings')}
                >
                  <User className="w-4 h-4 mr-2" />
                  My Bookings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
