import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MovieCard } from '@/components/MovieCard';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Film, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Movie {
  id: string;
  title: string;
  poster_url: string | null;
  genres: string[];
  duration: number;
}

const Index = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMovies();
  }, []);

  useEffect(() => {
    filterMovies();
  }, [searchTerm, selectedGenre, movies]);

  const fetchMovies = async () => {
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMovies(data || []);
      setFilteredMovies(data || []);
    } catch (error) {
      toast({
        title: 'Error loading movies',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMovies = () => {
    let filtered = movies;

    if (searchTerm) {
      filtered = filtered.filter(movie =>
        movie.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedGenre) {
      filtered = filtered.filter(movie =>
        movie.genres.includes(selectedGenre)
      );
    }

    setFilteredMovies(filtered);
  };

  const allGenres = Array.from(new Set(movies.flatMap(m => m.genres)));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <Film className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Experience Cinema
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Book your tickets now for the latest blockbusters
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8"
            onClick={() => document.getElementById('movies')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Browse Movies
          </Button>
        </div>
      </section>

      {/* Movies Section */}
      <section id="movies" className="container mx-auto px-4 py-12">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search movies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {allGenres.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedGenre === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedGenre('')}
              >
                All Genres
              </Button>
              {allGenres.map((genre) => (
                <Button
                  key={genre}
                  variant={selectedGenre === genre ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGenre(genre)}
                >
                  {genre}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Movies Grid */}
        {loading ? (
          <div className="text-center py-12">
            <Film className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading movies...</p>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="text-center py-12">
            <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No movies found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredMovies.map((movie) => (
              <MovieCard key={movie.id} {...movie} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
