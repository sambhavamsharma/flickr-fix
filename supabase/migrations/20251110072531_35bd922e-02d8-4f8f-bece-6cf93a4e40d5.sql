-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create movies table
CREATE TABLE public.movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  trailer_url TEXT,
  duration INTEGER NOT NULL, -- in minutes
  genres TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

-- Create theater halls table
CREATE TABLE public.theater_halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  rows INTEGER NOT NULL,
  columns INTEGER NOT NULL,
  seat_layout JSONB NOT NULL, -- stores seat labels and types
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.theater_halls ENABLE ROW LEVEL SECURITY;

-- Create showtimes table
CREATE TABLE public.showtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE NOT NULL,
  hall_id UUID REFERENCES public.theater_halls(id) ON DELETE CASCADE NOT NULL,
  show_date DATE NOT NULL,
  show_time TIME NOT NULL,
  ticket_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.showtimes ENABLE ROW LEVEL SECURITY;

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  showtime_id UUID REFERENCES public.showtimes(id) ON DELETE CASCADE NOT NULL,
  seats TEXT[] NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  booking_status TEXT DEFAULT 'confirmed' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create booked seats table for seat availability tracking
CREATE TABLE public.booked_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showtime_id UUID REFERENCES public.showtimes(id) ON DELETE CASCADE NOT NULL,
  seat_label TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(showtime_id, seat_label)
);

ALTER TABLE public.booked_seats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for movies
CREATE POLICY "Anyone can view movies" ON public.movies FOR SELECT USING (true);
CREATE POLICY "Only admins can insert movies" ON public.movies FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update movies" ON public.movies FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete movies" ON public.movies FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for theater halls
CREATE POLICY "Anyone can view halls" ON public.theater_halls FOR SELECT USING (true);
CREATE POLICY "Only admins can insert halls" ON public.theater_halls FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update halls" ON public.theater_halls FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete halls" ON public.theater_halls FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for showtimes
CREATE POLICY "Anyone can view showtimes" ON public.showtimes FOR SELECT USING (true);
CREATE POLICY "Only admins can insert showtimes" ON public.showtimes FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update showtimes" ON public.showtimes FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete showtimes" ON public.showtimes FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for bookings
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT 
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create own bookings" ON public.bookings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for booked_seats
CREATE POLICY "Anyone can view booked seats" ON public.booked_seats FOR SELECT USING (true);
CREATE POLICY "Users can insert booked seats" ON public.booked_seats FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete booked seats" ON public.booked_seats FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add trigger to movies table
CREATE TRIGGER update_movies_updated_at
  BEFORE UPDATE ON public.movies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for bookings and booked_seats
ALTER PUBLICATION supabase_realtime ADD TABLE public.booked_seats;