import { FarmEditorScreen } from '@/features/farms/components/farm-editor-screen';

export default async function EditFarmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FarmEditorScreen id={id} />;
}
