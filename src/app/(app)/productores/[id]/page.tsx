import { ProducerDetailScreen } from '@/features/producers/components/producer-detail-screen';

export default async function ProducerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProducerDetailScreen id={id} />;
}
