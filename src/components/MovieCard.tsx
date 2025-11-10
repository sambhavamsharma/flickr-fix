import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface MovieCardProps {
  id: string;
  title: string;
  poster_url: string | null;
  genres: string[];
  duration: number;
}

export const MovieCard = ({ id, title, poster_url, genres, duration }: MovieCardProps) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="group cursor-pointer overflow-hidden border-0 bg-card transition-all hover:scale-105 hover:shadow-xl"
      onClick={() => navigate(`/movie/${id}`)}
    >
      <div className="aspect-[2/3] relative overflow-hidden">
        <img 
          src={poster_url || '/placeholder.svg'} 
          alt={title}
          className="w-full h-full object-cover transition-transform group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2 line-clamp-1">{title}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Clock className="w-4 h-4" />
          <span>{duration} min</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {genres.slice(0, 2).map((genre) => (
            <span 
              key={genre}
              className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
};
