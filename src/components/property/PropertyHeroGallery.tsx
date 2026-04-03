import { useState, useEffect, useCallback } from 'react';
import { Building2, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

interface PropertyHeroGalleryProps {
  images: string[];
  propertyName: string;
}

export function PropertyHeroGallery({ images, propertyName }: PropertyHeroGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const nextImage = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (isPaused || isHovering || images.length <= 1) return;

    const interval = setInterval(() => {
      nextImage();
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, isHovering, nextImage, images.length]);

  if (images.length === 0) {
    return (
      <div className="w-full h-80 md:h-[28rem] bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center">
        <Building2 size={64} className="text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <img
        src={images[currentIndex]}
        alt={`${propertyName} - Image ${currentIndex + 1}`}
        className="w-full h-80 md:h-[28rem] object-cover transition-opacity duration-500"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {images.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight size={24} />
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex gap-2 justify-center items-end">
              {images.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`relative rounded-lg overflow-hidden transition-all duration-300 ${
                    i === currentIndex
                      ? 'w-20 h-14 ring-2 ring-[var(--accent-gold)] ring-offset-2 ring-offset-black/50'
                      : 'w-16 h-12 opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`View image ${i + 1}`}
                >
                  <img
                    src={url}
                    alt={`Thumbnail ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {i === currentIndex && (
                    <div className="absolute inset-0 bg-[rgba(var(--accent-primary-rgb),0.2)]" />
                  )}
                </button>
              ))}
            </div>

            {!isPaused && !isHovering && (
              <div className="mt-2 mx-auto w-48 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-gold)] rounded-full animate-progress"
                  style={{
                    animation: 'progress 5s linear infinite',
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
