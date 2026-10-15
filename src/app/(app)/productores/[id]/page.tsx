import { ProducerDetailWithFarms } from './producer-detail-with-farms';

export default async function ProducerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProducerDetailWithFarms id={id} />;
}
