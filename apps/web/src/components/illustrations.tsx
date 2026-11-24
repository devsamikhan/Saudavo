"use client";

import type { ReactNode } from "react";

/**
 * Corporate Memphis Flat-Vector Marketplace Hero Illustration
 * Rendered strictly in Saudavo Emerald (#0F6B52), Saffron (#D96B27), and Soft Mint/Cream tones.
 */
export function HeroMarketplaceIllustration() {
  return (
    <svg
      viewBox="0 0 520 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full select-none"
      role="img"
      aria-label="Saudavo Mianwali digital marketplace illustration"
    >
      {/* Organic Background Shapes */}
      <circle cx="275" cy="185" r="145" fill="#E7F4EF" />
      <path
        d="M84 265C60 210 92 140 156 122C220 104 282 146 310 198C338 250 302 318 228 326C154 334 108 320 84 265Z"
        fill="#FCEFE6"
      />
      <circle cx="430" cy="85" r="24" fill="#FDE68A" />
      <circle cx="96" cy="96" r="14" fill="#0F6B52" fillOpacity="0.18" />

      {/* Storefront / Mobile Frame */}
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
      {/* Store Awning */}
      <path
        d="M160 88C160 73.64 171.64 62 186 62H344C358.36 62 370 73.64 370 88V108H160V88Z"
        fill="#0F6B52"
      />
      <circle cx="195" cy="108" r="16" fill="#D96B27" />
      <circle cx="229" cy="108" r="16" fill="#FCEFE6" />
      <circle cx="265" cy="108" r="16" fill="#D96B27" />
      <circle cx="301" cy="108" r="16" fill="#FCEFE6" />
      <circle cx="335" cy="108" r="16" fill="#D96B27" />

      {/* Product Cards Inside Storefront */}
      <rect x="182" y="142" width="76" height="82" rx="14" fill="#E7F4EF" />
      <path
        d="M204 176L220 162L236 176V194H204V176Z"
        fill="#0F6B52"
      />
      <rect x="272" y="142" width="76" height="82" rx="14" fill="#FCEFE6" />
      <circle cx="310" cy="178" r="18" fill="#D96B27" />
      <rect x="182" y="238" width="166" height="16" rx="8" fill="#F1F5F4" />
      <rect x="182" y="264" width="110" height="28" rx="14" fill="#0F6B52" />
      <rect x="302" y="264" width="46" height="28" rx="14" fill="#D96B27" />

      {/* Left Character (Local Seller / Home Maker) */}
      <circle cx="105" cy="176" r="22" fill="#E8B49A" />
      <path
        d="M84 174C84 156 96 146 112 148C125 150 130 164 128 180H84V174Z"
        fill="#111827"
      />
      <path
        d="M72 288C72 238 84 206 108 206C132 206 144 238 144 288H72Z"
        fill="#D96B27"
      />
      <path
        d="M126 226L170 208"
        stroke="#E8B49A"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <rect x="64" y="286" width="88" height="22" rx="11" fill="#0F6B52" />

      {/* Right Character (Buyer Receiving COD Package) */}
      <circle cx="424" cy="178" r="21" fill="#DDA58A" />
      <path
        d="M402 174C403 157 416 148 430 151C442 154 446 168 444 178H402V174Z"
        fill="#111827"
      />
      <path
        d="M390 296C392 240 404 208 424 208C446 208 456 240 458 296H390Z"
        fill="#0F6B52"
      />
      <rect
        x="360"
        y="220"
        width="44"
        height="36"
        rx="8"
        fill="#FDE68A"
        stroke="#D96B27"
        strokeWidth="2.5"
      />
      <path d="M360 234H404" stroke="#D96B27" strokeWidth="2.5" />

      {/* Ground Horizon */}
      <line
        x1="44"
        y1="316"
        x2="476"
        y2="316"
        stroke="#0F6B52"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Corporate Memphis Split-Screen Auth Panel Illustration
 */
export function AuthSplitIllustration() {
  return (
    <svg
      viewBox="0 0 380 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full max-w-xs mx-auto select-none"
      role="img"
      aria-label="Saudavo account security and local store illustration"
    >
      <circle cx="190" cy="130" r="108" fill="#FFFFFF" fillOpacity="0.10" />
      <circle cx="105" cy="70" r="18" fill="#D96B27" fillOpacity="0.85" />
      <circle cx="290" cy="195" r="14" fill="#FDE68A" fillOpacity="0.85" />

      {/* Mobile Auth Card Motif */}
      <rect
        x="110"
        y="36"
        width="160"
        height="196"
        rx="24"
        fill="#FFFFFF"
      />
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

      {/* Floating Security Key Character */}
      <circle cx="88" cy="148" r="18" fill="#E8B49A" />
      <path
        d="M66 218C66 184 74 170 88 170C102 170 110 184 110 218H66Z"
        fill="#FDE68A"
      />
      <circle
        cx="294"
        cy="108"
        r="24"
        fill="#FCEFE6"
        stroke="#D96B27"
        strokeWidth="3"
      />
      <path
        d="M286 112V104C286 99.6 289.6 96 294 96C298.4 96 302 99.6 302 104V112"
        stroke="#0F6B52"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="282" y="108" width="24" height="16" rx="4" fill="#0F6B52" />
    </svg>
  );
}

/**
 * Spot Illustration: Empty Shopping Cart
 */
export function EmptyCartSpot() {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-44 w-52 select-none"
      aria-hidden="true"
    >
      <circle cx="120" cy="102" r="76" fill="#E7F4EF" />
      <circle cx="176" cy="54" r="12" fill="#FCEFE6" />
      <path
        d="M48 64H72L92 132H172L188 82H80"
        stroke="#0F6B52"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="102" cy="154" r="10" fill="#D96B27" />
      <circle cx="160" cy="154" r="10" fill="#D96B27" />
      <path
        d="M114 96L144 96M129 81L129 111"
        stroke="#0F6B52"
        strokeWidth="4"
        strokeLinecap="round"
        strokeOpacity="0.35"
      />
    </svg>
  );
}

/**
 * Spot Illustration: Empty Inbox / No Orders Yet
 */
export function EmptyInboxSpot() {
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
      <path
        d="M146 40L188 54L154 74L146 40Z"
        fill="#D96B27"
      />
      <path
        d="M116 64C126 56 134 54 142 54"
        stroke="#0F6B52"
        strokeWidth="3"
        strokeDasharray="4 4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Spot Illustration: 404 Error / Page Not Found
 */
export function NotFoundSpot() {
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
      <path
        d="M94 82L118 96M118 82L94 96"
        stroke="#D96B27"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="176" cy="52" r="10" fill="#FDE68A" />
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
    <div className="fade-slide flex flex-col items-center justify-center rounded-3xl border border-border-subtle bg-surface-card px-6 py-10 text-center shadow-card">
      <div className="mb-3 flex items-center justify-center">{illustration}</div>
      {badge && (
        <span className="mb-2 inline-block rounded-full bg-brand-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-primary">
          {badge}
        </span>
      )}
      <h2 className="text-xl font-bold text-ink-primary">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-secondary">
        {description}
      </p>
      {actions && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>
      )}
    </div>
  );
}
