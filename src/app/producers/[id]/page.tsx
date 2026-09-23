import { ProducerDetail } from '@/components/producers/producer-detail';

export default async function ProducerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProducerDetail id={id} />;
}
