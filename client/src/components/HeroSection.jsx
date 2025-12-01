import { ArrowRight, Calendar1Icon, ClockIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/autoplay';

const heroSlides = [
  {
    id: 1,
    title: 'Moon Knight',
    genres: 'Action | Adventure | Superhero',
    year: '2022',
    duration: '5hr 15min',
    description: 'Moon Knight follows Marc Spector, a former mercenary with Dissociative Identity Disorder, who becomes the avatar of the Egyptian moon god Khonshu.',
    logo: '/MarvelLogo.png',
    bgDesktop: '/backgroundImage.jpg',
    bgMobile: '/mobileback.jpg',
  },
  {
    id: 2,
    title: 'Avengers: Endgame',
    genres: 'Action | Adventure | Superhero',
    year: '2019',
    duration: '3hr 1min',
    description: 'After the devastating events of Avengers: Infinity War, the universe is in ruins. The Avengers assemble once more to undo Thanos’ actions and restore balance.',
    logo: '/MarvelLogo.png',
    bgDesktop: '/AvengersBg.jpg',
    bgMobile: '/AvengersMobile.jpg',
  },
  {
    id: 3,
    title: 'Black Panther',
    genres: 'Action | Drama | Superhero',
    year: '2018',
    duration: '2hr 14min',
    description: "T'Challa returns to Wakanda to take his throne, but a powerful enemy reappears, testing his mettle as king and Black Panther.",
    logo: '/MarvelLogo.png',
    bgDesktop: '/blackPanther.jpg',
    bgMobile: '/blackPantherMobile.jpg',
  },
  {
    id: 4,
    title: 'Spider-Man: Homecoming',
    genres: 'Action | Sci-Fi | Superhero',
    year: '2017',
    duration: '2hr 13min',
    description: 'Peter Parker balances his life as an ordinary high school student in Queens with his superhero alter ego Spider-Man, facing the Vulture as his first major threat.',
    logo: '/MarvelLogo.png',
    bgDesktop: '/spidermanBg.jpg',
    bgMobile: '/spidermanMobile.jpg',
  },
  {
    id: 5,
    title: 'Doctor Strange',
    genres: 'Action | Fantasy | Superhero',
    year: '2016',
    duration: '1hr 55min',
    description: 'After a tragic accident, Dr. Stephen Strange learns the secrets of a hidden world of mysticism and alternate dimensions, becoming the Sorcerer Supreme.',
    logo: '/MarvelLogo.png',
    bgDesktop: '/drStrangeBg.jpg',
    bgMobile: '/drStrangeMobile.jpg',
  },
  {
    id: 6,
    title: 'Guardians of the Galaxy',
    genres: 'Action | Comedy | Sci-Fi',
    year: '2014',
    duration: '2hr 1min',
    description: 'A group of intergalactic criminals must pull together to stop a fanatical warrior from taking control of the universe.',
    logo: '/MarvelLogo.png',
    bgDesktop: '/galaxyBg.jpg',
    bgMobile: '/galaxyMobile.jpg',
  },
];

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <Swiper
      modules={[Autoplay]}
      slidesPerView={1}
      loop={true}
      autoplay={{
        delay: 3000,
        disableOnInteraction: false,
      }}
      className='h-screen'
    >
      {heroSlides.map((slide) => (
        <SwiperSlide key={slide.id}>
          <div className='relative h-screen w-full'>
            {/* Desktop Image */}
            <img src={slide.bgDesktop} alt={slide.title} className='hidden md:block w-full h-full object-cover' />
            {/* Mobile Image */}
            <img src={slide.bgMobile} alt={slide.title} className='block md:hidden w-full h-full object-cover' />
            {/* Overlay Content */}
            <div className='absolute inset-0 flex flex-col items-start justify-center gap-8 px-10 md:px-14 lg:px-23'>
              <div className='flex flex-col items-start justify-center max-md:text-sm mt-10 min-2xl:text-xl'>
                <img src={slide.logo} alt='Logo' className='w-60 mx-2 max-md:w-40' />
                <h1 className='text-5xl leading-18 max-w-120 font-semibold li mx-2 max-md:text-3xl max-md:leading-10'>{slide.title}</h1>
                <div className='flex mx-3 my-2 gap-6 max-sm:flex-col max-sm:gap-2 text-gray-300 max-md:font-semibold'>
                  <span>{slide.genres}</span>
                  <div className='flex items-center'>
                    <Calendar1Icon className='w-4 h-4 mx-1' />
                    {slide.year}
                  </div>
                  <div className='flex items-center'>
                    <ClockIcon className='w-4 h-4 mx-1' />
                    {slide.duration}
                  </div>
                </div>
                <p className='max-w-md mx-3 max-md:font-semibold min-2xl:max-w-lg text-gray-300 max-md:max-w-sm'>{slide.description}</p>
                <button
                  className='flex items-center px-5 py-3 max-md:px-4 text-md min-2xl:my-6 font-medium bg-primary hover:bg-primary-dull transition rounded-full cursor-pointer my-4 mx-3 max-md:text-xs'
                  onClick={() => {
                    navigate('/movies');
                  }}
                >
                  Explore Movies
                  <ArrowRight className='w-5 h-5 ml-1' />
                </button>
              </div>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default HeroSection;
