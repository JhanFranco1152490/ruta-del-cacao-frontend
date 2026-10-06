'use client';

import Link from 'next/link';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useWatch } from 'react-hook-form';

import {
  CAPTURE_BUTTON_CLASS,
  CAPTURE_FIELD_CLASS,
} from '@/components/capture-field-class';
import { Breadcrumb } from '@/components/breadcrumb';
import { FormSection } from '@/components/form-section';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { PolygonEditorMapPanel } from '@/components/map/polygon-editor-map-panel';
import { PageHeader } from '@/components/page-header';
import { TextField } from '@/components/text-field';
import { Button, buttonVariants } from '@/components/ui/button';
import { loadPolygonEditorMapProvider } from '@/config/map';
import { useSession } from '@/hooks/use-session';
import { useWarmGps } from '@/hooks/use-warm-gps';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { formatHectares } from '@/lib/format/hectares';
import { parseCoordinates } from '@/lib/format/coordinates';
import type { Coordinates } from '@/types/geo';

import type { KnownPlot } from '../known-plots';
import type { PlotFormValues } from '../plot-queue';
import { toPoints } from '../plot-vertices';
import { usePlotEditor } from '../use-plot-editor';
import { PlotAreaExceeded } from './plot-area-exceeded';
import { PlotGpsButton } from './plot-gps-button';
import { PlotGeometrySummary } from './plot-geometry-summary';
import { PlotMapControls } from './plot-map-controls';
import { PlotNotices } from './plot-notices';
import { PlotVertexList } from './plot-vertex-list';

export type PlotEditorFarm = {
  id: string;
  name: string;
  areaHectares: string;
  location: Coordinates;
  editPath?: string;
};

export function PlotEditor({
  farm,
  knownPlots,
  selfId,
  defaultValues,
  title,
  crumb,
  description,
  banner,
  notice,
  submitLabel,
  isSaving,
  error,
  blockedMessage,
  secondaryAction,
  cancelHref,
  onSubmit,
}: {
  farm: PlotEditorFarm;
  knownPlots: readonly KnownPlot[];
  // La parcela que se edita: no cuenta contra sí misma en el área ni en la superposición.
  selfId?: string;
  defaultValues: PlotFormValues;
  title: string;
  // El último nivel de la ruta: el código de la parcela que se edita, o "Nueva parcela".
  crumb?: string;
  description: string;
  banner?: ReactNode;
  notice?: ReactNode;
  submitLabel: string;
  isSaving: boolean;
  error?: string | null;
  // Si hay motivo, no se puede guardar: se explica junto al botón.
  blockedMessage?: string | null;
  secondaryAction?: ReactNode;
  cancelHref: string;
  onSubmit: (values: PlotFormValues) => void;
}) {
  const { data: user } = useSession();
  const canEditFarm = hasPermission(user, PERMISSIONS.FARMS_CHANGE);
  // Vive aquí y no en los botones: el mapa también necesita saber dónde está la persona.
  const warm = useWarmGps();
  const [vertexListFolded, setVertexListFolded] = useState(false);
  const editor = usePlotEditor({ defaultValues, farm, knownPlots, selfId });
  const {
    form: {
      register,
      control,
      handleSubmit,
      formState: { errors },
    },
    draft,
    check,
  } = editor;
  const area = useWatch({ control, name: 'area_hectares' });
  const declared = Number((area ?? '').replace(',', '.'));
  const farmPoint = useMemo(
    () => parseCoordinates(farm.location),
    [farm.location],
  );
  const referenceShapes = useMemo(
    () =>
      editor.neighbours.map((neighbour) => ({
        id: neighbour.id,
        label: neighbour.code,
        positions: neighbour.points,
        tone: 'info' as const,
      })),
    [editor.neighbours],
  );
  // Los vértices que pasan del límite de distancia a la finca, para marcarlos en el mapa y en la
  // lista. Lo demás que falla (lados que se cruzan, superposición) no es de un vértice en
  // particular.
  const flaggedVertices = useMemo(
    () => check.farVertices.map(({ index }) => index),
    [check.farVertices],
  );
  const flaggedReasons = useMemo(
    () =>
      Object.fromEntries(
        check.farVertices.map(({ index, distanceMetres }) => [
          index,
          `Demasiado lejos del punto de la finca: ${distanceMetres} m (máximo ${check.maxDistanceFromFarmMetres} m)`,
        ]),
      ),
    [check.farVertices, check.maxDistanceFromFarmMetres],
  );
  const vertexPoints = useMemo(
    () => toPoints(draft.vertices),
    [draft.vertices],
  );
  const suggestionPoints = useMemo(
    () => check.suggestion?.map(({ point }) => point) ?? null,
    [check.suggestion],
  );
  const saveBlocked = !!blockedMessage || editor.hasBlockers;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
      <Breadcrumb
        items={[
          { label: 'Fincas', href: '/fincas' },
          { label: farm.name, href: cancelHref },
          { label: crumb ?? title },
        ]}
      />
      <PageHeader
        eyebrow={`Finca ${farm.name}`}
        title={title}
        description={description}
      />
      {banner && <div className="mt-6">{banner}</div>}
      {notice}
      <form
        className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
        noValidate
        onSubmit={handleSubmit((values) =>
          onSubmit({
            code: values.code,
            area_hectares: values.area_hectares,
            vertices: draft.vertices,
          }),
        )}
      >
        {/* Pegado al desplazarse: con muchos vértices la lista de la derecha es larga y el mapa
            sigue a la vista mientras se recorre. */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <PolygonEditorMapPanel
            disabled={isSaving}
            drawing={draft.drawing}
            farmPoint={farmPoint}
            flaggedVertices={flaggedVertices}
            gpsPosition={warm.fix}
            frameClassName="lg:h-[min(32rem,calc(100dvh-20rem))]"
            loadProvider={loadPolygonEditorMapProvider!}
            onAddVertex={editor.addMapVertex}
            onRequestGps={warm.start}
            onMoveVertex={editor.moveVertex}
            overlapRegions={check.overlapRegions}
            referenceShapes={referenceShapes}
            suggestion={suggestionPoints}
            vertices={vertexPoints}
          />
          <PlotMapControls
            canUndo={draft.vertices.length > 0}
            disabled={isSaving}
            drawing={draft.drawing}
            gps={
              <PlotGpsButton
                disabled={isSaving || editor.isAtMaxVertices}
                onVertex={editor.addGpsVertex}
                warm={warm}
              />
            }
            onStartDrawing={editor.startDrawing}
            onUndo={editor.undo}
          />
          <PlotGeometrySummary
            measuredAreaHectares={check.measuredAreaHectares}
            perimeterMetres={check.perimeterMetres}
          />
        </div>

        <div className="space-y-6">
          <FormSection title="Datos de la parcela">
            <div className="grid gap-5">
              <TextField
                className={CAPTURE_FIELD_CLASS}
                error={errors.code?.message}
                label="Código de la parcela"
                maxLength={50}
                {...register('code')}
              />
              <TextField
                className={CAPTURE_FIELD_CLASS}
                error={errors.area_hectares?.message}
                hint={`Disponible en la finca: ${formatHectares(check.availableHectares.toFixed(2))}`}
                inputMode="decimal"
                label="Área declarada (hectáreas)"
                {...register('area_hectares', {
                  onChange: (event) => editor.onAreaTyped(event.target.value),
                })}
              />
            </div>
          </FormSection>

          <FormSection
            actions={
              draft.vertices.length > 0 && (
                <Button
                  aria-expanded={!vertexListFolded}
                  aria-label={
                    vertexListFolded
                      ? 'Desplegar la lista de vértices'
                      : 'Plegar la lista de vértices'
                  }
                  className="size-11"
                  onClick={() => setVertexListFolded((value) => !value)}
                  size="icon"
                  title={
                    vertexListFolded
                      ? 'Desplegar la lista de vértices'
                      : 'Plegar la lista de vértices'
                  }
                  type="button"
                  variant="outline"
                >
                  {vertexListFolded ? (
                    <ChevronsUpDown aria-hidden="true" className="size-4" />
                  ) : (
                    <ChevronsDownUp aria-hidden="true" className="size-4" />
                  )}
                </Button>
              )
            }
            title="Vértices del polígono"
          >
            <PlotVertexList
              collapsed={vertexListFolded}
              closeAttempted={editor.closeAttempted}
              disabled={isSaving}
              drawing={draft.drawing}
              flagged={flaggedReasons}
              onClose={editor.close}
              onRemove={editor.removeVertex}
              vertices={draft.vertices}
            />
          </FormSection>

          {check.exceedsFarmArea && (
            <PlotAreaExceeded
              availableHectares={check.availableHectares}
              farmAreaHectares={farm.areaHectares}
              farmDetailPath={cancelHref}
              farmEditPath={canEditFarm ? farm.editPath : undefined}
              onUseAvailable={editor.useAvailableArea}
            />
          )}
          <PlotNotices
            check={check}
            declaredAreaHectares={
              Number.isFinite(declared) && declared > 0 ? declared : null
            }
            drawing={draft.drawing}
            hasVertices={draft.vertices.length > 0}
            onApplySuggestion={editor.applySuggestion}
            onUseMeasuredArea={editor.useMeasuredArea}
          />

          <div className="space-y-4">
            {error && (
              <p
                className="rounded-(--radius) bg-err-bg px-4 py-3 text-sm font-bold text-err"
                role="alert"
              >
                {error}
              </p>
            )}
            {blockedMessage && (
              <p className="font-bold text-warn" id="plot-save-blocked">
                {blockedMessage}
              </p>
            )}
            <MobileActionBar>
              <Button
                aria-describedby={
                  blockedMessage ? 'plot-save-blocked' : undefined
                }
                className={CAPTURE_BUTTON_CLASS}
                disabled={isSaving || saveBlocked}
                size="office"
                type="submit"
              >
                {isSaving ? 'Guardando…' : submitLabel}
              </Button>
              <Link
                className={buttonVariants({
                  size: 'office',
                  variant: 'outline',
                  className: CAPTURE_BUTTON_CLASS,
                })}
                href={cancelHref}
              >
                Cancelar
              </Link>
              {secondaryAction}
            </MobileActionBar>
          </div>
        </div>
      </form>
    </div>
  );
}
