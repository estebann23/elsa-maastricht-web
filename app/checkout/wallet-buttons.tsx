/**
 * The two Add-to-Wallet buttons shown once a payment is confirmed.
 *
 * Both are plain links, so they work with no JavaScript and behave correctly on
 * the device that matters: iOS installs the `.pkpass` it downloads from our own
 * route, and Android follows Google's save link.
 *
 * Deliberately shows both on every device rather than sniffing the user agent —
 * a member may be paying on a laptop and want the card on their phone, and a
 * wrong guess would hide the only button that works for them.
 */
export function WalletButtons({
  serialNumber,
  googleSaveUrl,
}: {
  serialNumber: string;
  googleSaveUrl: string;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-base leading-7 text-zinc-600">
        Add your member card to your wallet:
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={`/api/wallet/${encodeURIComponent(serialNumber)}/apple`}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-base font-medium text-background transition-colors hover:bg-[#383838]"
        >
          Add to Apple Wallet
        </a>

        <a
          href={googleSaveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-full border border-solid border-black/[.08] px-6 text-base font-medium text-zinc-950 transition-colors hover:border-transparent hover:bg-black/[.04]"
        >
          Add to Google Wallet
        </a>
      </div>

      <p className="mx-auto max-w-md text-sm leading-6 text-zinc-500">
        Open this page on your phone to add the card. On iPhone use Apple
        Wallet, on Android use Google Wallet.
      </p>
    </div>
  );
}
