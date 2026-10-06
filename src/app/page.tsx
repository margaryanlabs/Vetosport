import { Terminal } from "@/components/Terminal";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ event?: string | string[] }>;
}) {
  const params = await searchParams;
  const event = Array.isArray(params.event) ? params.event[0] : params.event;

  return <Terminal initialEventId={event} />;
}
