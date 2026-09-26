import { ProducerEditorScreen } from '@/features/producers/components/producer-editor-screen';

export default async function EditProducerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProducerEditorScreen id={id} />;
}
