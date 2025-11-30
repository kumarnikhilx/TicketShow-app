import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { MenuIcon, SearchIcon, TicketPlus, XIcon } from "lucide-react";
import { useClerk, UserButton, useUser } from "@clerk/clerk-react";
import { useAppContext } from "../context/Appcontext";

const Navbar = () => {
  const { favorites, shows } = useAppContext();
  console.log("shows:", shows);
  
  const { user, isLoaded } = useUser();

  const [isOpen, setisOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // const { user } = useUser();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();
  const location = useLocation();

  const searchRef = useRef();
//  const { user, isLoaded } = useUser();

const isAdmin = isLoaded && user?.publicMetadata?.role === "admin";


 useEffect(() => {
 if (isLoaded) {
   console.log("CLERK USER:", user);
   console.log("PUBLIC META:", user?.publicMetadata);
   console.log("PRIVATE META:", user?.privateMetadata);
 }
}, [isLoaded, user]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false); // search close anywhere outside
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const getLinkClass = (path) => {
    return location.pathname === path
      ? "text-purple-600 hover:text-purple-700 transition-colors"
      : "text-white hover:text-primary transition-colors";
  };

  const filteredMovies =
    searchTerm.trim() === ""
      ? shows.length > 0
        ? [shows[0]]
        : []
      : shows.filter((movie) =>
          movie.originalTitle.toLowerCase().includes(searchTerm.toLowerCase())
        );

  console.log("filteredMovies:", filteredMovies);

  const handleMovieClick = (id) => {
    setSearchTerm("");
    setSearchOpen(false);
    navigate(`/movies/${id}`);
  };

  return (
    <div className="fixed top-0 left-0 z-50 w-full flex items-center justify-between px-6 md:px-8 lg:px-16 py-1 bg-black/10 ">
      {/* Logo */}
      <Link
        to="/"
        onClick={() => {
          scrollTo(0, 0);
        }}
        className="max-md:flex-1"
      >
        <img src="/navlogo.png" alt="Logo" className="h-auto w-40" />
      </Link>

      {/* Navigation Links */}
      <div
        className={`max-md:absolute max-md:top-0 max-md:-left-10 max-md:font-medium max-md:text-lg z-50 flex flex-col md:flex-row items-center max-md:justify-center gap-6 min-md:px-6 py-3 max-md:px-3 max-md:h-screen min-md:rounded-full backdrop-blur bg-black/70 md:bg-white/10 md:border border-gray-300/20 overflow-hidden transition-[width] duration-300 ${
          isOpen ? "max-md:w-full" : "max-md:w-0"
        }`}
      >
        <XIcon
          className="min-md:hidden absolute top-6 right-6 w-8 h-8 cursor-pointer"
          onClick={() => setisOpen(false)}
        />
        <Link
          to="/"
          onClick={() => {
            scrollTo(0, 0);
            setisOpen(false);
          }}
          className={getLinkClass("/")}
        >
          Home
        </Link>
        <Link
          to="/movies"
          onClick={() => {
            scrollTo(0, 0);
            setisOpen(false);
          }}
          className={getLinkClass("/movies")}
        >
          Movies
        </Link>
        {favorites.length > 0 && (
          <Link
            to="/favourites"
            onClick={() => {
              scrollTo(0, 0);
              setisOpen(false);
            }}
            className={getLinkClass("/favourites")}
          >
            Favourite
          </Link>
        )}
        <Link
          to="/my-bookings"
          onClick={() => {
            scrollTo(0, 0);
            setisOpen(false);
          }}
          className={getLinkClass("/my-bookings")}
        >
          Bookings
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            onClick={() => {
              scrollTo(0, 0);
              setisOpen(false);
            }}
            className={getLinkClass("/admin")}
          >
            Dashboard
          </Link>
        )}
      </div>

      {/* Search and User Controls */}
      <div className="w-40 flex items-center justify-around relative">
        <div ref={searchRef} className="relative">
          <SearchIcon
            className="max-md:hidden w-6 h-6 mr-4 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation(); // stop bubbling so it won’t trigger outside handler
              setSearchOpen((prev) => !prev); // toggle search on/off
            }}
          />
          {searchOpen && (
            <div className="absolute right-0 top-8 bg-black p-3 rounded shadow-lg w-80 z-50 max-h-[400px] overflow-y-auto border border-gray-700">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black border border-gray-700 text-white placeholder-gray-500 p-2 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <div className="flex flex-col gap-3">
                {filteredMovies.length > 0 ? (
                  filteredMovies.map((movie) => (
                    <div
                      key={movie._id}
                      className="flex gap-3 cursor-pointer hover:bg-gray-800 p-3 rounded transition duration-200"
                      onClick={() => handleMovieClick(movie._id)}
                    >
                      <img
                        src={movie.primaryImage}
                        alt={movie.originalTitle}
                        className="w-20 h-30 object-cover rounded"
                      />
                      <div className="flex flex-col justify-start text-white">
                        <span className="font-bold">{movie.originalTitle}</span>
                        <span className="text-sm text-gray-400">
                          Rating: {movie.averageRating || "N/A"}
                        </span>
                        <span className="text-xs text-gray-500 line-clamp-2">
                          {movie.description}
                        </span>
                        <span className="text-xs text-gray-500">
                          Duration:{" "}
                          {movie.runtime ? `${movie.runtime} min` : "N/A"}
                        </span>
                        <span className="text-xs text-gray-500">
                          Genres: {movie.genres.join(", ")}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 p-2">No movies found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {!user ? (
          <button
            onClick={openSignIn}
            className="sm:px-7 sm:py-2 bg-primary hover:bg-primary-dull transition px-4 py-1 rounded-full font-medium cursor-pointer max-md:text-sm"
          >
            Login
          </button>
        ) : (
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Action
                label="My Bookings"
                labelIcon={<TicketPlus width={15} />}
                onClick={() => navigate("/my-bookings")}
              />
            </UserButton.MenuItems>
          </UserButton>
        )}
      </div>

      {/* Hamburger Menu Icon */}
      <MenuIcon
        className="min-md:hidden w-8 h-8 cursor-pointer"
        onClick={() => setisOpen(true)}
      />
    </div>
  );
};

export default Navbar;
