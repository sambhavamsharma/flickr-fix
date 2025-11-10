import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Play, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Movie {
  id: string;
  title: string;
  description: string;
  poster_url: string | null;
  trailer_url: string | null;
  duration: number;
  genres: string[];
}

interface Showtime {
  id: string;
  show_date: string;
  show_time: string;
  ticket_price: number;
  theater_halls: {
    name: string;
  };
}

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchMovieDetails();
      fetchShowtimes();
    }
  }, [id]);

  const fetchMovieDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setMovie(data);
    } catch (error) {
      toast({
        title: 'Error loading movie',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchShowtimes = async () => {
    try {
      const { data, error } = await supabase
        .from('showtimes')
        .select('*, theater_halls(name)')
        .eq('movie_id', id)
        .gte('show_date', new Date().toISOString().split('T')[0])
        .order('show_date')
        .order('show_time');

      if (error) throw error;
      setShowtimes(data || []);
      
      // Set first available date as default
      if (data && data.length > 0) {
        setSelectedDate(data[0].show_date);
      }
    } catch (error) {
      console.error('Error fetching showtimes:', error);
    }
  };

  const handleBooking = (showtimeId: string) => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to book tickets',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    navigate(`/booking/${showtimeId}`);
  };

  const uniqueDates = Array.from(new Set(showtimes.map(s => s.show_date)));
  const filteredShowtimes = showtimes.filter(s => s.show_date === selectedDate);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading movie details...</p>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Movie not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Movies
        </Button>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Poster */}
          <div className="md:col-span-1">
            <img
              src={movie.poster_url || '/placeholder.svg'}
              alt={movie.title}
              className="w-full rounded-lg shadow-2xl"
            />
          </div>

          {/* Details */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{movie.title}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {movie.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{movie.duration} min</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-2xl font-semibold mb-2">Synopsis</h2>
              <p className="text-muted-foreground leading-relaxed">
                {movie.description}
              </p>
            </div>

            {/* Trailer */}
            {movie.trailer_url && (
              <Button variant="outline" className="gap-2">
                <Play className="w-4 h-4" />
                Watch Trailer
              </Button>
            )}

            {/* Showtimes */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Showtimes</h2>
              
              {uniqueDates.length > 0 ? (
                <>
                  {/* Date Selection */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {uniqueDates.map((date) => (
                      <Button
                        key={date}
                        variant={selectedDate === date ? 'default' : 'outline'}
                        onClick={() => setSelectedDate(date)}
                        className="flex-shrink-0"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        {format(new Date(date), 'MMM dd')}
                      </Button>
                    ))}
                  </div>

                  {/* Time Slots */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredShowtimes.map((showtime) => (
                      <Card
                        key={showtime.id}
                        className="p-4 hover:border-primary cursor-pointer transition-colors"
                        onClick={() => handleBooking(showtime.id)}
                      >
                        <div className="font-semibold">
                          {showtime.show_time.slice(0, 5)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {showtime.theater_halls.name}
                        </div>
                        <div className="text-sm font-semibold text-primary mt-2">
                          ${showtime.ticket_price}
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No showtimes available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;
