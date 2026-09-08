import Image from "next/image";

export type PrLeiloesSocialVariant =
  | "landscape"
  | "square"
  | "portrait"
  | "story";

type PrLeiloesSocialTemplateProps = {
  variant?: PrLeiloesSocialVariant;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  imageSrc?: string;
  imageAlt?: string;
};

const variantClasses: Record<PrLeiloesSocialVariant, string> = {
  landscape: "aspect-[1200/630] min-w-[18rem]",
  square: "aspect-square min-w-[16rem]",
  portrait: "aspect-[4/5] min-w-[16rem]",
  story: "aspect-[9/16] min-w-[13rem]",
};

export function PrLeiloesSocialTemplate({
  variant = "landscape",
  eyebrow = "Leilões rurais",
  title,
  subtitle,
  imageSrc,
  imageAlt = "",
}: PrLeiloesSocialTemplateProps) {
  const isCompact = variant === "square" || variant === "story";

  return (
    <article
      className={`relative isolate overflow-hidden rounded-[1.25rem] bg-[#062518] text-white ${variantClasses[variant]}`}
      data-brand-template={`pr-leiloes-${variant}`}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      ) : null}
      <div
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,37,24,0.96),rgba(6,37,24,0.56)_58%,rgba(40,131,76,0.7))]"
        aria-hidden="true"
      />
      <div
        className="absolute -right-[18%] -top-[20%] aspect-square w-[62%] rounded-full border border-[#fbaa34]/35"
        aria-hidden="true"
      />
      <div
        className={`relative flex h-full flex-col justify-between ${isCompact ? "p-6 sm:p-8" : "p-8 sm:p-10"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <Image
            src="/brand/pr-leiloes/logo-horizontal-white.svg"
            alt="PR Leilões"
            width={247}
            height={43}
            className={`${isCompact ? "w-[8.5rem]" : "w-[10rem]"} h-auto`}
          />
          <span
            className="mt-1 size-3 shrink-0 rounded-full bg-[#fbaa34] shadow-[0_0_0_0.35rem_rgba(251,170,52,0.16)]"
            aria-hidden="true"
          />
        </div>
        <div className="max-w-[38rem]">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#fbaa34]">
            {eyebrow}
          </p>
          <h2 className="mt-3 max-w-[18ch] text-[clamp(1.65rem,4vw,3.8rem)] font-black leading-[0.95] tracking-[-0.05em] text-balance">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-white/80 sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
