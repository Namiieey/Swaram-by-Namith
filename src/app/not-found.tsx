import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-7xl font-black text-brand">404</p>
        <h1 className="mt-2 text-2xl font-extrabold">Page not found</h1>
        <p className="mt-1 text-sub">Looks like this track skipped.</p>
        <Link href="/" className="press mt-5 inline-block rounded-full bg-fg px-6 py-2.5 text-sm font-bold text-bg">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
