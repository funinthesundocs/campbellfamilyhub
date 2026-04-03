import { useState, useEffect, useMemo } from 'react';

interface AnimatedLogoProps {
  primaryName: string;
  familyNames: string[];
  size?: 'default' | 'small';
}

export function AnimatedLogo({ primaryName, familyNames, size = 'default' }: AnimatedLogoProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const isSmall = size === 'small';

  const { baseName, suffix } = useMemo(() => {
    const parts = primaryName.split(' ');
    if (parts.length >= 2) {
      return {
        baseName: parts.slice(0, -1).join(' '),
        suffix: parts[parts.length - 1],
      };
    }
    return { baseName: primaryName, suffix: '' };
  }, [primaryName]);

  const allFamilyNames = useMemo(() => {
    const names = [baseName, ...familyNames];
    return names.filter(Boolean);
  }, [baseName, familyNames]);

  const currentName = allFamilyNames[currentIndex];
  const nextName = allFamilyNames[(currentIndex + 1) % allFamilyNames.length];

  useEffect(() => {
    if (allFamilyNames.length <= 1) return;

    const cycleInterval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % allFamilyNames.length);
        setIsAnimating(false);
      }, 1400);
    }, 5000);

    return () => clearInterval(cycleInterval);
  }, [allFamilyNames.length]);

  if (allFamilyNames.length <= 1) {
    return (
      <span className={`font-logo font-black text-[var(--accent-gold)] ${isSmall ? 'text-sm' : 'text-xl'}`}>
        {primaryName}
      </span>
    );
  }

  const currentFull = suffix ? `${currentName} ${suffix}` : currentName;
  const nextFull = suffix ? `${nextName} ${suffix}` : nextName;
  const maxLength = Math.max(currentFull.length, nextFull.length);
  const paddedCurrent = currentFull.padEnd(maxLength, ' ');
  const paddedNext = nextFull.padEnd(maxLength, ' ');

  const letterDelay = isSmall ? 30 : 50;

  return (
    <span className={`font-logo font-black text-[var(--accent-gold)] inline-flex items-baseline ${isSmall ? 'text-sm' : 'text-xl'}`}>
      <span className="relative inline-block">
        <span className="inline-flex">
          {paddedCurrent.split('').map((char, index) => {
          const nextChar = paddedNext[index];
          const delay = index * letterDelay;

          return (
            <span
              key={index}
              className="relative inline-block"
              style={{
                minWidth: char === ' ' ? '0.3em' : undefined,
                perspective: '1000px',
              }}
            >
              <span
                className={`relative inline-block transition-all duration-700 ${
                  isAnimating ? 'animate-flip-letter' : ''
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                  animationDelay: isAnimating ? `${delay}ms` : '0ms',
                  textShadow: isAnimating
                    ? `0 0 20px rgba(201, 169, 98, 0.6), 0 0 40px rgba(201, 169, 98, 0.3)`
                    : 'none',
                }}
              >
                <span
                  className="inline-block"
                  style={{
                    backfaceVisibility: 'hidden',
                  }}
                >
                  {char}
                </span>
                <span
                  className="absolute inset-0 inline-block"
                  style={{
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  {nextChar}
                </span>
              </span>

              {isAnimating && !isSmall && (
                <>
                  <span
                    className="absolute inset-0 pointer-events-none animate-particle-1"
                    style={{
                      animationDelay: `${delay}ms`,
                    }}
                  />
                  <span
                    className="absolute inset-0 pointer-events-none animate-particle-2"
                    style={{
                      animationDelay: `${delay + 100}ms`,
                    }}
                  />
                  <span
                    className="absolute inset-0 pointer-events-none animate-particle-3"
                    style={{
                      animationDelay: `${delay + 50}ms`,
                    }}
                  />
                </>
              )}
            </span>
          );
        })}
        </span>
      </span>

      <style>{`
        @keyframes flipLetter {
          0% {
            transform: rotateY(0deg);
            filter: blur(0px);
          }
          25% {
            filter: blur(2px);
          }
          50% {
            transform: rotateY(90deg);
            filter: blur(4px);
          }
          75% {
            filter: blur(2px);
          }
          100% {
            transform: rotateY(180deg);
            filter: blur(0px);
          }
        }

        @keyframes particle1 {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-10px, -15px) scale(1.5);
            box-shadow: 0 0 8px 2px rgba(201, 169, 98, 0.8);
          }
        }

        @keyframes particle2 {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(12px, -18px) scale(1.2);
            box-shadow: 0 0 6px 1px rgba(201, 169, 98, 0.6);
          }
        }

        @keyframes particle3 {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(0, -20px) scale(1);
            box-shadow: 0 0 10px 3px rgba(201, 169, 98, 0.7);
          }
        }

        .animate-flip-letter {
          animation: flipLetter 1.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .animate-particle-1 {
          animation: particle1 1s ease-out forwards;
          width: 3px;
          height: 3px;
          background: radial-gradient(circle, rgba(201, 169, 98, 1) 0%, rgba(201, 169, 98, 0) 70%);
          border-radius: 50%;
        }

        .animate-particle-2 {
          animation: particle2 0.9s ease-out forwards;
          width: 2px;
          height: 2px;
          background: radial-gradient(circle, rgba(201, 169, 98, 1) 0%, rgba(201, 169, 98, 0) 70%);
          border-radius: 50%;
        }

        .animate-particle-3 {
          animation: particle3 1.1s ease-out forwards;
          width: 2.5px;
          height: 2.5px;
          background: radial-gradient(circle, rgba(201, 169, 98, 1) 0%, rgba(201, 169, 98, 0) 70%);
          border-radius: 50%;
        }
      `}</style>
    </span>
  );
}
