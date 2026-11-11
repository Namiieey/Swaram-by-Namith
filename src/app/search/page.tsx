import { Suspense } from "react";
import { SearchView } from "./view";

export const metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="skeleton mt-4 h-12 w-full max-w-md rounded-full" />}>
      <SearchView />
    </Suspense>
  );
}
