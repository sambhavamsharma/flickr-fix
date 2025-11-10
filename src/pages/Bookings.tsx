import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Bookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        showtimes (
          show_date,
          show_time,
          ticket_price,
          movies (title, poster_url),
          theater_halls (name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBookings(data);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Bookings</h1>

        {loading ? (
          <p className="text-muted-foreground">Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No bookings yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking) => (
              <Card key={booking.id} className="p-6">
                <div className="flex gap-4 mb-4">
                  <img
                    src={booking.showtimes.movies.poster_url || '/placeholder.svg'}
                    alt={booking.showtimes.movies.title}
                    className="w-20 h-28 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold mb-2">{booking.showtimes.movies.title}</h3>
                    <Badge>{booking.booking_status}</Badge>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {booking.showtimes.show_date}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {booking.showtimes.show_time.slice(0, 5)}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Ticket className="w-4 h-4" />
                    {booking.showtimes.theater_halls.name}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Seats: {booking.seats.join(', ')}
                    </span>
                    <span className="font-bold text-primary">
                      ${booking.total_price}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;
