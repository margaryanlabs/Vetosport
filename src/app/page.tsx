import { Terminal } from "@/components/Terminal";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ event?: string | string[]; view?: string | string[] }>;
}) {
  const params = await searchParams;
  const event = Array.isArray(params.event) ? params.event[0] : params.event;
  const view = Array.isArray(params.view) ? params.view[0] : params.view;

  return <Terminal initialEventId={event} initialView={view} />;
}
