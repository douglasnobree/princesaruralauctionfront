import * as React from 'react';
import { cn } from '@/lib/utils';

interface PrincesaLogoIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

const PrincesaLogoIcon = React.forwardRef<
  SVGSVGElement,
  PrincesaLogoIconProps
>(({ size = 64, className, ...props }, ref) => {
  const uniqueId = React.useId();
  const gradientId = `icon-gradient-${uniqueId}`;
  const st0 = `icon-st0-${uniqueId}`;
  const st1 = `icon-st1-${uniqueId}`;
  const st2 = `icon-st2-${uniqueId}`;
  const st3 = `icon-st3-${uniqueId}`;

  return (
    <svg
      ref={ref}
      xmlns='http://www.w3.org/2000/svg'
      xmlnsXlink='http://www.w3.org/1999/xlink'
      viewBox='240 240 420 280'
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-label='Princesa Rural Icon'
      role='img'
      {...props}
    >
      <defs>
        <style>
          {`
      .${st0} {
        fill: #adc849;
      }

      .${st1} {
        fill: #0d603f;
      }

      .${st2} {
        fill: #28834c;
      }

      .${st3} {
        fill: url(#${gradientId});
      }
    `}
        </style>
        <radialGradient
          id={gradientId}
          cx={440.9}
          cy={375.88}
          fx={440.9}
          fy={375.88}
          r={129.29}
          gradientUnits='userSpaceOnUse'
        >
          <stop offset={0} stopColor='#ffd234' />
          <stop offset={1} stopColor='#f89b34' />
        </radialGradient>
      </defs>
      <path
        className={st3}
        d='M447.02,455.61l-43.53-51.42-2.52-15.64,91.94-53,9.01-12.52v-7.52s-.72-6.64-8.65-10.39c-5.6-2.64-40.26-3.58-60.19-3.9l-14.08-.16s5.77.03,14.08.16l50.64.58,35.69-.51h45.03c-24.15-36.29-65.41-60.21-112.27-60.21-74.45,0-134.8,60.35-134.8,134.79s60.35,134.8,134.8,134.8c11.25,0,22.17-1.4,32.62-4l-37.76-51.07Z'
      />
      <path
        className={st1}
        d='M644.92,517.41l-125.78-110.94c-4.48-3.95-5.24-10.73-1.57-15.44,1.21-1.55,2.91-3.16,5.24-4.76,10.51-7.21,55.07-37.4,71.64-48.62,5.57-3.77,9.13-10.12,8.65-16.83-.41-5.75-3.41-11.9-13.18-14.71-2.6-.75-5.32-.99-8.03-.99h-62.5s0-4.06,0-4.06h78.06c4.86.24,8.55,1.1,12.05,3.55,4.23,2.96,8.36,8.29,7.96,17.78-.72,16.7-25.18,30.1-25.18,30.1l-55.04,35.57s-7.22,3.98,4.08,12.80l142.66,116.54h-39.06Z'
      />
      <path
        className={st2}
        d='M552.27,515.09l-102.59-97.85c-4.29-4.09-7.13-9.66-7.17-15.59-.04-6.9,3.3-15.53,16.82-22.49,32.6-16.77,60.49-35.7,79.61-47.63,4.27-2.66,7.68-6.81,7.7-11.87.02-3.54-1.14-12.26-16.54-12.26h-62.06v-6.35h60.2c3.22,0,8.31.45,12.2,1.12,8.3,1.43,25.07,6.17,22.71,20.18-1.62,9.58-24.39,21.94-47.48,35.38-21.29,12.4-38.28,23.04-50.3,29.52-3.47,1.87-4.52,6.34-1.93,9.33l127.17,118.49h-38.35Z'
      />
      <path
        className={st0}
        d='M468.66,515.09l-80.93-99.91s-13.93-20.83,13.59-34.89c33.17-16.94,68.86-36.41,88.31-48.45,4.34-2.69,7.81-6.88,7.83-11.99.02-3.58-1.16-12.38-16.83-12.38h-61.65v-6.42h61.25c3.27,0,8.46.45,12.42,1.13,8.44,1.45,19.23,6.02,16.83,20.17-1.64,9.68-21.75,20.93-45.25,34.51-21.66,12.52-44.53,25.06-56.75,31.61-3.53,1.89-4.6,6.4-1.96,9.42l102.16,117.19h-39.02Z'
      />
    </svg>
  );
});

PrincesaLogoIcon.displayName = 'PrincesaLogoIcon';

export { PrincesaLogoIcon };
