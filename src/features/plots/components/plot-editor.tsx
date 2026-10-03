'use client';

import Link from 'next/link';
import { type ReactNode, useMemo } from 'react';
import { useWatch } from 'react-hook-form';

import {
  CAPTURE_BUTTON_CLASS,
  CAPTURE_FIELD_CLASS,
} from '@/components/capture-field-class';
import { FormSection } from '@/components/form-section';
import { PolygonEditorMapPanel } from '@/components/map/polygon-editor-map-panel';
import { PageHeader } from '@/components/page-header';
import { TextField } from '@/components/text-field';
import { Button, buttonVariants } from '@/components/ui/button';
import { loadPolygonEditorMapProvider } from '@/config/map';
import { formatHectares } from '@/lib/format/hectares';
import { parseCoordinates } from '@/lib/format/coordinates';
import type { Coordinates } from '@/types/geo';

import type { KnownPlot } from '../known-plots';
import type { PlotFormValues } from '../plot-queue';
import { toPoints } from '../plot-vertices';
import { usePlotEditor } from '../use-plot-editor';
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
};

export function PlotEditor({
  farm,
  knownPlots,
  selfId,
  defaultValues,
  title,
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
      <nav
        aria-label="Ruta de navegación"
        className="text-sm text-muted-foreground"
      >
        <Link className="underline underline-offset-4" href="/fincas">
          Fincas
        </Link>{' '}
        /{' '}
        <Link className="underline underline-offset-4" href={cancelHref}>
          {farm.name}
        </Link>{' '}
        / <span className="font-bold text-foreground">{title}</span>
      </nav>
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
        <div className="space-y-4">
          <PolygonEditorMapPanel
            disabled={isSaving}
            drawing={draft.drawing}
            farmPoint={farmPoint}
            frameClassName="lg:h-[32rem]"
            loadProvider={loadPolygonEditorMapProvider!}
            onAddVertex={editor.addMapVertex}
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
                {...register('area_hectares')}
              />
              {check.exceedsFarmArea && (
                <p className="font-bold text-err" role="alert">
                  El área ingresada supera el área disponible de la finca
                </p>
              )}
            </div>
          </FormSection>

          <FormSection title="Vértices del polígono">
            <PlotVertexList
              closeAttempted={editor.closeAttempted}
              disabled={isSaving}
              drawing={draft.drawing}
              onClose={editor.close}
              onRemove={editor.removeVertex}
              vertices={draft.vertices}
            />
          </FormSection>

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
