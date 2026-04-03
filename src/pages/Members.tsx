import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';
import { TreeDeciduous, ExternalLink, Copy, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDESHOW_IMAGES = [
  { src: '/image copy.png', alt: 'Campbell Family Tree' }
];

const ANCESTRY_CREDENTIALS = {
  website: 'https://www.ancestry.com/',
  email: 'funinthesundocs@gmail.com',
  password: 'Sharelink123!'
};

export default function Members() {
  const { success } = useToast();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDESHOW_IMAGES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDESHOW_IMAGES.length) % SLIDESHOW_IMAGES.length);
  }, []);

  useEffect(() => {
    if (SLIDESHOW_IMAGES.length <= 1 || isPaused) return;
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    success(`${label} copied to clipboard`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl text-[var(--text-primary)] mb-2">Family Tree</h1>
        <p className="text-[var(--text-secondary)]">Explore & Add To our Family Tree</p>
      </div>

      <div
        className="relative w-[85%] mx-auto mb-12 rounded-xl overflow-hidden shadow-lg bg-[var(--bg-primary)] border-2 border-black"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20 z-10 pointer-events-none" />
        <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden">
          {SLIDESHOW_IMAGES.map((image, index) => (
            <div
              key={`${index}-${currentSlide}`}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img
                src={image.src}
                alt={image.alt}
                className={`w-full h-full object-cover object-[70%_55%] ${
                  index === currentSlide ? 'animate-kenburns' : ''
                }`}
              />
            </div>
          ))}
        </div>

        {SLIDESHOW_IMAGES.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight size={24} />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {SLIDESHOW_IMAGES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    index === currentSlide
                      ? 'bg-white'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Card className="max-w-xl mx-auto !p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(var(--accent-primary-rgb),0.15)] shrink-0">
            <TreeDeciduous className="text-[var(--accent-gold)]" size={20} />
          </div>
          <div>
            <h2 className="font-serif text-lg text-[var(--text-primary)]">Ancestry.com Access</h2>
            <p className="text-[var(--text-secondary)] text-xs">Shared Family Account</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Email</span>
              <p className="text-[var(--text-primary)] text-sm font-medium">{ANCESTRY_CREDENTIALS.email}</p>
            </div>
            <button
              onClick={() => copyToClipboard(ANCESTRY_CREDENTIALS.email, 'Email')}
              className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Copy email"
            >
              <Copy size={14} />
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Password</span>
              <p className="text-[var(--text-primary)] text-sm font-medium font-mono">
                {showPassword ? ANCESTRY_CREDENTIALS.password : '••••••••••••'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={() => copyToClipboard(ANCESTRY_CREDENTIALS.password, 'Password')}
                className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Copy password"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <Button
            onClick={() => window.open(ANCESTRY_CREDENTIALS.website, '_blank', 'noopener,noreferrer')}
            className="w-full !py-2 text-sm"
          >
            <ExternalLink size={16} />
            Open Ancestry.com
          </Button>
        </div>
      </Card>
    </div>
  );
}
