import Image from "next/image";

/**
 * White page column with the cover banner, matching /signup so the two halves
 * of the sign-up flow look like one thing.
 */
export function PageShell({ children }: { children: React.ReactNode }) {
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
        <main className="flex flex-1 flex-col items-center gap-8 px-16 pt-14 pb-32">
          {children}
        </main>
      </div>
    </div>
  );
}

export function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black">
        {title}
      </h1>
      <p className="mx-auto max-w-md text-lg leading-8 text-zinc-600">{body}</p>
    </div>
  );
}

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
