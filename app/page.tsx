import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-luxia-black">
      <Image
        src={"./luxia.svg"}
        alt="Luxia AI"
        width={300}
        height={300}
        className="opacity-70"
      />
      <p>You can start right up here, we are using:</p> <br />
      <ul>
        <li>Next.js 16 App Router</li>
        <li>Tailwind CSS v4</li>
        <li>TypeScript</li>
        <li>React 19</li>
        <li>Shadcn UI</li>
        <li>Lucide React Icons</li>
      </ul>
    </div>
  );
}
