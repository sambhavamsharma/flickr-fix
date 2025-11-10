import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Armchair } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Seat {
  label: string;
  row: string;
  col: number;
  type: string;
  isBooked: boolean;
}

const SeatSelection = () => {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [showtime, setShowtime] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (showtimeId) {
      fetchShowtimeAndSeats();
    }
  }, [showtimeId]);

  useEffect(() => {
    if (!showtimeId) return;

    // Subscribe to seat updates
    const channel = supabase
      .channel('booked_seats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booked_seats',
          filter: `showtime_id=eq.${showtimeId}`,
        },
        () => {
          fetchShowtimeAndSeats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showtimeId]);

  const fetchShowtimeAndSeats = async () => {
    try {
      const { data: showtimeData, error: showtimeError } = await supabase
        .from('showtimes')
        .select('*, movies(*), theater_halls(*)')
        .eq('id', showtimeId)
        .single();

      if (showtimeError) throw showtimeError;
      setShowtime(showtimeData);

      // Fetch booked seats
      const { data: bookedSeats, error: bookedError } = await supabase
        .from('booked_seats')
        .select('seat_label')
        .eq('showtime_id', showtimeId);

      if (bookedError) throw bookedError;

      const bookedSeatLabels = new Set(bookedSeats?.map(s => s.seat_label) || []);

      // Generate seat layout
      const layout = showtimeData.theater_halls.seat_layout as any;
      const allSeats: Seat[] = [];

      layout.seats.forEach((rowData: any) => {
        for (let col = 1; col <= rowData.cols; col++) {
          const seatLabel = `${rowData.row}${col}`;
          allSeats.push({
            label: seatLabel,
            row: rowData.row,
            col,
            type: rowData.type,
            isBooked: bookedSeatLabels.has(seatLabel),
          });
        }
      });

      setSeats(allSeats);
    } catch (error) {
      toast({
        title: 'Error loading seats',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSeat = (seatLabel: string, isBooked: boolean) => {
    if (isBooked) return;

    setSelectedSeats(prev =>
      prev.includes(seatLabel)
        ? prev.filter(s => s !== seatLabel)
        : [...prev, seatLabel]
    );
  };

  const handleBooking = async () => {
    if (!user || !showtime || selectedSeats.length === 0) return;

    setBooking(true);
    try {
      // Create booking
      const totalPrice = showtime.ticket_price * selectedSeats.length;
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          showtime_id: showtimeId,
          seats: selectedSeats,
          total_price: totalPrice,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Reserve seats
      const seatReservations = selectedSeats.map(seatLabel => ({
        showtime_id: showtimeId,
        seat_label: seatLabel,
        booking_id: bookingData.id,
      }));

      const { error: seatsError } = await supabase
        .from('booked_seats')
        .insert(seatReservations);

      if (seatsError) throw seatsError;

      toast({
        title: 'Booking confirmed!',
        description: `Your ${selectedSeats.length} seat(s) have been booked successfully.`,
      });

      navigate('/bookings');
    } catch (error: any) {
      toast({
        title: 'Booking failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setBooking(false);
    }
  };

  if (loading || !showtime) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading seats...</p>
        </div>
      </div>
    );
  }

  const rows = Array.from(new Set(seats.map(s => s.row)));
  const totalPrice = showtime.ticket_price * selectedSeats.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="max-w-4xl mx-auto">
          {/* Movie Info */}
          <Card className="p-6 mb-8">
            <h1 className="text-2xl font-bold mb-2">{showtime.movies.title}</h1>
            <p className="text-muted-foreground">
              {showtime.theater_halls.name} • {showtime.show_date} • {showtime.show_time.slice(0, 5)}
            </p>
          </Card>

          {/* Screen */}
          <div className="mb-8">
            <div className="bg-muted/30 py-2 text-center rounded-t-3xl">
              <p className="text-sm text-muted-foreground">SCREEN</p>
            </div>
          </div>

          {/* Seats */}
          <div className="mb-8 space-y-4">
            {rows.map(row => {
              const rowSeats = seats.filter(s => s.row === row);
              return (
                <div key={row} className="flex justify-center items-center gap-2">
                  <span className="text-muted-foreground w-6">{row}</span>
                  <div className="flex gap-2">
                    {rowSeats.map(seat => (
                      <button
                        key={seat.label}
                        onClick={() => toggleSeat(seat.label, seat.isBooked)}
                        disabled={seat.isBooked}
                        className={cn(
                          'w-10 h-10 rounded-md transition-all',
                          'flex items-center justify-center',
                          seat.isBooked && 'bg-muted cursor-not-allowed',
                          !seat.isBooked && !selectedSeats.includes(seat.label) && 'bg-card hover:bg-primary/20 border border-border',
                          selectedSeats.includes(seat.label) && 'bg-primary text-primary-foreground'
                        )}
                        aria-label={`Seat ${seat.label}`}
                      >
                        <Armchair className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mb-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-card border border-border rounded" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-muted rounded" />
              <span>Booked</span>
            </div>
          </div>

          {/* Booking Summary */}
          {selectedSeats.length > 0 && (
            <Card className="p-6 sticky bottom-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Seats</p>
                  <p className="font-semibold">{selectedSeats.join(', ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</p>
                </div>
              </div>
              <Button 
                onClick={handleBooking} 
                className="w-full"
                disabled={booking}
              >
                {booking ? 'Processing...' : 'Confirm Booking'}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;
