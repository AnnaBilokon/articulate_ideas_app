import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { loadWishlist } from "@/lib/wishlist";
import { WishlistBoard } from "./wishlist-board";

// Things to buy later, in lists of your own, each with a photo or screenshot.
export default async function WishlistPage({ searchParams }: PageProps<"/money/wishlist">) {
  await connection();
  const { add } = await searchParams;
  const { lists, items } = await loadWishlist();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader title="Wishlist" description="Things to buy later: snap a photo or paste a screenshot, and sort them into lists." />
      <WishlistBoard lists={lists} items={items} startAdding={add === "1"} />
    </main>
  );
}
