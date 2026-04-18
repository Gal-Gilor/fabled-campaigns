import Chat from '../components/chat';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  return <Chat initialSessionId={session} />;
}
