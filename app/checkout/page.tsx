import Image from "next/image";

/**
 * Placeholder checkout. The sign-up row already exists in `pending_members`
 * by the time anyone lands here; `member` is its id.
 *
 * Next step: hand this off to the SumUp API, then mark the row as paid. Read
 * the amount from the stored row (membership_price_cents), never from the
 * query string — anything in the URL is attacker-controlled.
 */
export default async function Checkout({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const { member } = await searchParams;

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans">
      <div className="flex w-full max-w-3xl flex-1 flex-col bg-white">
        <Image
          src="/elsa_maastricht_cover.jpg"
          alt="ELSA Maastricht"
          width={1128}
          height={191}
          priority
          className="h-auto w-full"
        />
        <main className="flex flex-1 flex-col items-center gap-6 px-16 pt-14 pb-32 text-center">
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black">
            Checkout
          </h1>
          <p className="mx-auto max-w-md px-6 text-lg leading-8 text-zinc-600">
            Your sign-up has been saved. Online payment is not available yet —
            this page will handle it shortly.
          </p>
          {member && (
            <p className="text-sm leading-6 text-zinc-400">
              Reference: {member}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
