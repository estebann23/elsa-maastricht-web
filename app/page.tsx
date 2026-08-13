import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white sm:items-start">
        <Image
          src="/elsa-logo.jpg"
          alt="ELSA Maastricht Logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black">
            Page not found. ELSA Maastricht Landing Page
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600">
            Looking for a starting point? Head over to <a href="https://elsa-maastricht.org" className="font-medium text-zinc-950">elsa-maastricht.org</a>
          </p>
        </div>
        
      </main>
    </div>
  );
}
