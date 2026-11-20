import type { SVGProps } from "react";

/**
 * Approved Saudavo primary brand mark (Concept A: S-Ribbon & Market Handle).
 */
export function SaudavoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Saudavo logo mark"
      {...props}
    >
      <path
        d="M21.5 17C21.5 8.5 42.5 8.5 42.5 17H37.5C37.5 12.8 26.5 12.8 26.5 17H21.5Z"
        fill="#D96B27"
      />
      <path
        d="M46 20H25C18.925 20 14 24.925 14 31C14 37.075 18.925 42 25 42H39C40.657 42 42 43.343 42 45C42 46.657 40.657 48 39 48H18C15.791 48 14 49.791 14 52C14 54.209 15.791 56 18 56H39C45.075 56 50 51.075 50 45C50 38.925 45.075 34 39 34H25C23.343 34 22 32.657 22 31C22 29.343 23.343 28 25 28H46C48.209 28 50 26.209 50 24C50 21.791 48.209 20 46 20Z"
        fill="#0F6B52"
      />
    </svg>
  );
}
