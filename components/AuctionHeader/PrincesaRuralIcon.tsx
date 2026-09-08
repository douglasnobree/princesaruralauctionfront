import Image from "next/image";
import * as React from "react";
import { cn } from "@/lib/utils";

type LogoVariant = "color" | "white" | "black";
type SharedLogoImageProps = Omit<
  React.ComponentPropsWithoutRef<typeof Image>,
  "src" | "alt" | "width" | "height"
>;

interface PrincesaLogoIconProps extends SharedLogoImageProps {
  alt?: string;
  size?: number;
}

interface PrincesaRuralWordmarkProps extends SharedLogoImageProps {
  alt?: string;
  variant?: LogoVariant;
}

const wordmarkSources: Record<LogoVariant, string> = {
  color: "/logo.svg",
  white: "/logo-white.svg",
  black: "/logo-black.svg",
};

const PrincesaLogoIcon = React.forwardRef<
  HTMLImageElement,
  PrincesaLogoIconProps
>(({ size = 64, alt, className, "aria-hidden": ariaHidden, ...props }, ref) => (
  <Image
    ref={ref}
    src="/princesa-rural-icon.svg"
    width={size}
    height={size}
    alt={alt ?? (ariaHidden ? "" : "Ícone Princesa Rural")}
    aria-hidden={ariaHidden}
    className={cn("shrink-0", className)}
    unoptimized
    {...props}
  />
));

PrincesaLogoIcon.displayName = "PrincesaLogoIcon";

function PrincesaRuralWordmark({
  variant = "color",
  alt = "Princesa Rural",
  className,
  ...props
}: PrincesaRuralWordmarkProps) {
  return (
    <Image
      src={wordmarkSources[variant]}
      width={247}
      height={43}
      alt={alt}
      className={cn("h-auto w-auto shrink-0", className)}
      unoptimized
      {...props}
    />
  );
}

export { PrincesaLogoIcon, PrincesaRuralWordmark };
