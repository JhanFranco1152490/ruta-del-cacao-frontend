import { ProducerEditor } from '@/components/producers/producer-detail';

export default async function EditProducerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProducerEditor id={id} />;
}
