"use client";

import { type ReactNode, useState } from "react";

function ThemedIllustration({
  src,
  alt,
  width,
  height,
  eager = false,
  className = "h-auto w-full select-none",
  fallback
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  eager?: boolean;
  className?: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function HeroVectorFallback() {
  return (
    <svg
      viewBox="0 0 520 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full select-none"
      role="img"
      aria-label="Saudavo Mianwali digital marketplace illustration"
    >
      <circle cx="275" cy="185" r="145" fill="#E7F4EF" />
      <path
        d="M84 265C60 210 92 140 156 122C220 104 282 146 310 198C338 250 302 318 228 326C154 334 108 320 84 265Z"
        fill="#FCEFE6"
      />
      <rect
        x="160"
        y="62"
        width="210"
        height="252"
        rx="26"
        fill="#FFFFFF"
        stroke="#0F6B52"
        strokeWidth="3"
      />
      <path
        d="M160 88C160 73.64 171.64 62 186 62H344C358.36 62 370 73.64 370 88V108H160V88Z"
        fill="#0F6B52"
      />
      <circle cx="195" cy="108" r="16" fill="#D96B27" />
      <circle cx="229" cy="108" r="16" fill="#FCEFE6" />
      <circle cx="265" cy="108" r="16" fill="#D96B27" />
      <circle cx="301" cy="108" r="16" fill="#FCEFE6" />
      <circle cx="335" cy="108" r="16" fill="#D96B27" />
      <rect x="182" y="142" width="76" height="82" rx="14" fill="#E7F4EF" />
      <rect x="272" y="142" width="76" height="82" rx="14" fill="#FCEFE6" />
      <rect x="182" y="264" width="110" height="28" rx="14" fill="#0F6B52" />
      <rect x="302" y="264" width="46" height="28" rx="14" fill="#D96B27" />
    </svg>
  );
}

function AuthVectorFallback() {
  return (
    <svg
      viewBox="0 0 380 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto h-auto w-full max-w-xs select-none"
      role="img"
      aria-label="Saudavo account security and local store illustration"
    >
      <circle cx="190" cy="130" r="108" fill="#FFFFFF" fillOpacity="0.10" />
      <rect x="110" y="36" width="160" height="196" rx="24" fill="#FFFFFF" />
      <rect x="132" y="60" width="116" height="44" rx="12" fill="#E7F4EF" />
      <circle cx="190" cy="82" r="14" fill="#0F6B52" />
      <path
        d="M184 82L188 86L197 77"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="132" y="120" width="116" height="16" rx="8" fill="#F1F5F4" />
      <rect x="132" y="146" width="116" height="16" rx="8" fill="#F1F5F4" />
      <rect x="132" y="176" width="116" height="32" rx="12" fill="#D96B27" />
    </svg>
  );
}

function EmptyCartVectorFallback() {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-44 w-52 select-none"
      aria-hidden="true"
    >
      <circle cx="120" cy="102" r="76" fill="#E7F4EF" />
      <path
        d="M48 64H72L92 132H172L188 82H80"
        stroke="#0F6B52"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="102" cy="154" r="10" fill="#D96B27" />
      <circle cx="160" cy="154" r="10" fill="#D96B27" />
    </svg>
  );
}

function EmptyInboxVectorFallback() {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-44 w-52 select-none"
      aria-hidden="true"
    >
      <circle cx="120" cy="102" r="76" fill="#FCEFE6" />
      <rect
        x="58"
        y="78"
        width="124"
        height="78"
        rx="16"
        fill="#FFFFFF"
        stroke="#0F6B52"
        strokeWidth="4"
      />
      <path
        d="M62 84L120 122L178 84"
        stroke="#0F6B52"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M146 40L188 54L154 74L146 40Z" fill="#D96B27" />
    </svg>
  );
}

function NotFoundVectorFallback() {
  return (
    <svg
      viewBox="0 0 240 190"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-44 w-52 select-none"
      aria-hidden="true"
    >
      <circle cx="120" cy="96" r="74" fill="#E7F4EF" />
      <circle
        cx="106"
        cy="88"
        r="38"
        fill="#FFFFFF"
        stroke="#0F6B52"
        strokeWidth="5"
      />
      <line
        x1="134"
        y1="116"
        x2="168"
        y2="148"
        stroke="#D96B27"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IsometricTrackingVectorFallback() {
  return (
    <svg
      viewBox="0 0 440 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full select-none"
      aria-hidden="true"
    >
      <rect width="440" height="260" rx="20" fill="#F8FAF9" />
      <path
        d="M40 205L390 120"
        stroke="#0F6B52"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M52 202L378 123"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeDasharray="8 8"
      />
      <rect
        x="72"
        y="74"
        width="104"
        height="88"
        rx="14"
        fill="#0F6B52"
      />
      <path d="M64 82L184 82L174 102H74L64 82Z" fill="#D96B27" />
      <rect x="236" y="138" width="44" height="32" rx="8" fill="#D96B27" />
      <circle cx="330" cy="76" r="22" fill="#E7F4EF" stroke="#0F6B52" strokeWidth="4" />
      <circle cx="330" cy="76" r="7" fill="#0F6B52" />
    </svg>
  );
}

function MascotVectorFallback() {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full select-none"
      aria-hidden="true"
    >
      <circle cx="40" cy="40" r="38" fill="#E7F4EF" />
      <circle cx="40" cy="42" r="22" fill="#FFFFFF" stroke="#0F6B52" strokeWidth="3" />
      <path d="M22 28C25 18 32 14 42 14C52 14 58 20 58 28H22Z" fill="#D96B27" />
      <circle cx="33" cy="39" r="3" fill="#0F6B52" />
      <circle cx="47" cy="39" r="3" fill="#0F6B52" />
      <path
        d="M34 48C37 51 43 51 46 48"
        stroke="#0F6B52"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Soft 3D Claymorphism Storefront Hero Illustration
 */
export function HeroMarketplaceIllustration() {
  return (
    <ThemedIllustration
      src="/illustrations/hero-clay-storefront.webp"
      alt="Saudavo Soft 3D Claymorphism local marketplace illustration"
      width={880}
      height={657}
      eager
      className="animate-float h-auto w-full rounded-2xl object-contain select-none"
      fallback={<HeroVectorFallback />}
    />
  );
}

/**
 * Corporate Memphis Split-Screen Auth Panel Illustration
 */
export function AuthSplitIllustration() {
  return (
    <ThemedIllustration
      src="/illustrations/auth-memphis-onboarding.webp"
      alt="Saudavo account onboarding and local storefront illustration"
      width={720}
      height={964}
      eager
      className="mx-auto h-auto max-h-72 w-full rounded-2xl object-contain select-none"
      fallback={<AuthVectorFallback />}
    />
  );
}

/**
 * 3D Isometric Live Order Logistics Illustration
 */
export function IsometricTrackingIllustration() {
  return (
    <ThemedIllustration
      src="/illustrations/track-isometric-logistics.webp"
      alt="Saudavo isometric live parcel delivery tracking illustration"
      width={880}
      height={491}
      eager
      className="h-auto w-full rounded-2xl border border-border-subtle object-cover select-none"
      fallback={<IsometricTrackingVectorFallback />}
    />
  );
}

/**
 * Sauda Buddy Mascot Avatar
 */
export function SaudaBuddyAvatar({
  className = "h-full w-full"
}: {
  className?: string;
}) {
  return (
    <ThemedIllustration
      src="/illustrations/mascot-sauda-buddy.webp"
      alt="Sauda Buddy helper mascot"
      width={256}
      height={256}
      className={`${className} rounded-full object-cover select-none`}
      fallback={<MascotVectorFallback />}
    />
  );
}

/**
 * Spot Illustration: Empty Shopping Cart
 */
export function EmptyCartSpot() {
  return (
    <ThemedIllustration
      src="/illustrations/spot-empty-cart.webp"
      alt="Empty Saudavo cart illustration"
      width={520}
      height={520}
      className="mx-auto h-48 w-48 object-contain select-none sm:h-52 sm:w-52"
      fallback={<EmptyCartVectorFallback />}
    />
  );
}

/**
 * Spot Illustration: Empty Inbox / No Orders Yet
 */
export function EmptyInboxSpot() {
  return (
    <ThemedIllustration
      src="/illustrations/spot-empty-inbox.webp"
      alt="Empty orders and inbox illustration"
      width={520}
      height={520}
      className="mx-auto h-48 w-48 object-contain select-none sm:h-52 sm:w-52"
      fallback={<EmptyInboxVectorFallback />}
    />
  );
}

/**
 * Spot Illustration: 404 Error / Page Not Found
 */
export function NotFoundSpot() {
  return (
    <ThemedIllustration
      src="/illustrations/spot-404-not-found.webp"
      alt="Page not found illustration"
      width={560}
      height={418}
      className="mx-auto h-auto w-60 max-w-full object-contain select-none sm:w-72"
      fallback={<NotFoundVectorFallback />}
    />
  );
}

function SellerStudioVectorFallback() {
  return (
    <svg
      viewBox="0 0 420 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto h-auto w-full max-w-sm select-none"
      role="img"
      aria-label="Saudavo Mianwali local seller studio illustration"
    >
      <circle cx="210" cy="150" r="126" fill="#FFFFFF" fillOpacity="0.12" />
      <rect x="76" y="72" width="268" height="176" rx="24" fill="#FFFFFF" />
      <path
        d="M76 96C76 82.75 86.75 72 100 72H320C333.25 72 344 82.75 344 96V114H76V96Z"
        fill="#0F6B52"
      />
      <circle cx="110" cy="114" r="15" fill="#D96B27" />
      <circle cx="144" cy="114" r="15" fill="#FCEFE6" />
      <circle cx="178" cy="114" r="15" fill="#D96B27" />
      <circle cx="212" cy="114" r="15" fill="#FCEFE6" />
      <circle cx="246" cy="114" r="15" fill="#D96B27" />
      <circle cx="280" cy="114" r="15" fill="#FCEFE6" />
      <circle cx="312" cy="114" r="15" fill="#D96B27" />
      <rect x="98" y="144" width="96" height="78" rx="14" fill="#E7F4EF" />
      <rect x="122" y="164" width="48" height="38" rx="8" fill="#0F6B52" />
      <rect x="210" y="144" width="112" height="32" rx="10" fill="#FCEFE6" />
      <rect x="210" y="186" width="76" height="36" rx="10" fill="#0F6B52" />
      <rect x="294" y="186" width="28" height="36" rx="10" fill="#D96B27" />
    </svg>
  );
}

/**
 * Corporate Memphis Local Storefront & Onboarding Illustration for Seller Studio
 */
export function SellerStudioIllustration() {
  return (
    <ThemedIllustration
      src="/illustrations/seller-studio-onboarding.webp"
      alt="Saudavo Mianwali local seller studio illustration"
      width={800}
      height={447}
      eager
      className="mx-auto h-auto max-h-72 w-full rounded-2xl object-contain select-none"
      fallback={<SellerStudioVectorFallback />}
    />
  );
}

/**
 * Spot Illustration: Empty Seller Catalog (Products / Services)
 */
export function EmptyCatalogSpot() {
  return (
    <svg
      viewBox="0 0 220 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto h-32 w-40 select-none"
      aria-hidden="true"
    >
      <circle cx="110" cy="82" r="64" fill="#E7F4EF" />
      <rect
        x="48"
        y="46"
        width="124"
        height="76"
        rx="16"
        fill="#FFFFFF"
        stroke="#0F6B52"
        strokeWidth="3.5"
      />
      <path
        d="M48 60C48 52.27 54.27 46 62 46H158C165.73 46 172 52.27 172 60V70H48V60Z"
        fill="#0F6B52"
      />
      <circle cx="72" cy="70" r="9" fill="#D96B27" />
      <circle cx="96" cy="70" r="9" fill="#FCEFE6" />
      <circle cx="120" cy="70" r="9" fill="#D96B27" />
      <circle cx="144" cy="70" r="9" fill="#FCEFE6" />
      <rect x="64" y="88" width="54" height="10" rx="5" fill="#E7F4EF" />
      <rect x="64" y="104" width="38" height="8" rx="4" fill="#DDE5E2" />
      <path
        d="M142 84H162L168 96L152 112L134 94L142 84Z"
        fill="#D96B27"
      />
      <circle cx="155" cy="94" r="3" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Reusable Centered Spot State Card
 */
export function SpotState({
  illustration,
  badge,
  title,
  description,
  actions
}: {
  illustration: ReactNode;
  badge?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="fade-slide flex flex-col items-center justify-center rounded-3xl border border-border-subtle bg-surface-card px-6 py-10 text-center shadow-card sm:px-10">
      <div className="mb-3 flex items-center justify-center">{illustration}</div>
      {badge && (
        <span className="mb-2 inline-block rounded-full bg-brand-primary-soft px-3.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-primary">
          {badge}
        </span>
      )}
      <h2 className="text-xl font-extrabold text-ink-primary sm:text-2xl">
        {title}
      </h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-secondary">
        {description}
      </p>
      {actions && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>
      )}
    </div>
  );
}
