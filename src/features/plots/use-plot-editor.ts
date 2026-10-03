'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { MAX_VERTICES } from '@/lib/geo/polygon';
import { snapToBorders } from '@/lib/geo/snap';
import { polygonProblem } from '@/lib/geo/validate';
import { parseCoordinates } from '@/lib/format/coordinates';
import type { Coordinates, GeoPoint } from '@/types/geo';

import type { KnownPlot } from './known-plots';
import type { PlotFormValues } from './plot-queue';
import { checkPlot, type KnownNeighbour } from './plot-rules';
import { toPoints } from './plot-vertices';
import {
  applySuggestion,
  initialDraft,
  polygonDraftReducer,
} from './polygon-draft';
import {
  createPlotFormSchema,
  normalizeCode,
  type PlotFormFields,
} from './schemas';

// Por debajo de media centésima el área, con dos decimales, sería 0,00: no se propone.
const MIN_PROPOSED_AREA_HECTARES = 0.005;

type EditorFarm = { areaHectares: string; location: Coordinates };

const toNumber = (value: string | undefined) => {
  const number = Number((value ?? '').trim().replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : null;
};

const toCentihectares = (hectares: string) =>
  Math.round(Number(hectares) * 100);

// Todo el estado del editor de una parcela: el formulario (código y área), el polígono que se
// dibuja y lo que el dispositivo comprueba sobre ambos.
export function usePlotEditor({
  defaultValues,
  farm,
  knownPlots,
  selfId,
}: {
  defaultValues: PlotFormValues;
  farm: EditorFarm;
  // Todas las parcelas de la finca que conoce el dispositivo; la que se edita se descarta aquí.
  knownPlots: readonly KnownPlot[];
  selfId?: string;
}) {
  const others = useMemo(
    () => knownPlots.filter((plot) => plot.id !== selfId),
    [knownPlots, selfId],
  );
  const takenCodes = useMemo(
    () => new Set(others.map((plot) => normalizeCode(plot.code))),
    [others],
  );
  const schema = useMemo(() => createPlotFormSchema(takenCodes), [takenCodes]);

  const form = useForm<PlotFormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: defaultValues.code,
      area_hectares: defaultValues.area_hectares,
    },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const area = useWatch({ control: form.control, name: 'area_hectares' });

  const [draft, dispatch] = useReducer(
    polygonDraftReducer,
    defaultValues.vertices,
    initialDraft,
  );
  // El área sigue al polígono mientras la persona no la haya escrito ella: una parcela que ya
  // tiene área (la que se edita) cuenta como escrita. Borrar el campo la devuelve a seguirlo.
  // Es una referencia y no un estado: cambiarla no debe volver a llenar el campo en ese instante
  // (quien lo borra para escribir otro valor vería cómo se llena de nuevo mientras teclea). Solo se
  // consulta cuando cambia el polígono.
  const areaIsManual = useRef(defaultValues.area_hectares.trim() !== '');
  // Se intentó cerrar el polígono con menos de 3 vértices: recién entonces se explica.
  const [closeAttempted, setCloseAttempted] = useState(false);

  // Las vecinas que cuentan: activas, con polígono válido. Un contorno guardado que ya no es
  // válido no debe tumbar el editor.
  const neighbours = useMemo<KnownNeighbour[]>(
    () =>
      others
        .filter((plot) => plot.isActive && plot.vertices.length >= 3)
        .map((plot) => ({
          id: plot.id,
          code: plot.code,
          points: toPoints(plot.vertices),
        }))
        .filter(({ points }) => polygonProblem(points) === null),
    [others],
  );
  const otherAllocatedHectares =
    others
      .filter((plot) => plot.isActive)
      .reduce((total, plot) => total + toCentihectares(plot.areaHectares), 0) /
    100;

  const points = useMemo(() => toPoints(draft.vertices), [draft.vertices]);
  const farmLatitude = farm.location.latitude;
  const farmLongitude = farm.location.longitude;
  const farmPoint = useMemo(
    () =>
      parseCoordinates({ latitude: farmLatitude, longitude: farmLongitude }),
    [farmLatitude, farmLongitude],
  );
  const check = useMemo(
    () =>
      checkPlot({
        declaredAreaHectares: toNumber(area),
        vertices: points,
        farmAreaHectares: Number(farm.areaHectares),
        farmPoint,
        otherAllocatedHectares,
        neighbours,
      }),
    [
      area,
      points,
      farm.areaHectares,
      farmPoint,
      otherAllocatedHectares,
      neighbours,
    ],
  );

  const measuredArea = check.measuredAreaHectares;
  const vertexCount = draft.vertices.length;
  const { getValues, setValue, formState } = form;
  useEffect(() => {
    if (areaIsManual.current) return;
    const options = {
      shouldDirty: true,
      shouldValidate: formState.isSubmitted,
    };
    if (vertexCount === 0) {
      // Sin polígono no hay área calculada: se quita la que se había propuesto.
      if (getValues('area_hectares')) setValue('area_hectares', '', options);
      return;
    }
    // Mientras el polígono no es válido (se está dibujando, o un lado se cruzó un instante al
    // arrastrar) se deja la última área propuesta en vez de hacerla parpadear.
    if (measuredArea === null || measuredArea < MIN_PROPOSED_AREA_HECTARES)
      return;
    const proposed = measuredArea.toFixed(2);
    if (getValues('area_hectares') !== proposed) {
      setValue('area_hectares', proposed, options);
    }
  }, [measuredArea, vertexCount, getValues, setValue, formState]);

  const borders = useMemo(
    () => neighbours.map(({ points: p }) => p),
    [neighbours],
  );
  const nowIso = () => new Date().toISOString();

  // Lo que impide guardar; el servidor repite estas comprobaciones con todos los datos.
  const blockers = {
    polygon: draft.vertices.length > 0 && check.polygonProblem !== null,
    areaExceedsFarm: check.exceedsFarmArea,
    areaMismatch: check.areaMismatch,
    overlap: check.overlaps.length > 0,
    farFromFarm: check.farVertices.length > 0,
  };

  return {
    form,
    draft,
    check,
    neighbours,
    closeAttempted,
    isAtMaxVertices: draft.vertices.length >= MAX_VERTICES,
    hasBlockers: Object.values(blockers).some(Boolean),
    blockers,
    startDrawing: () => dispatch({ type: 'startDrawing' }),
    // Cerrar exige al menos 3 vértices: con menos se explica y se sigue dibujando.
    close: () => {
      if (draft.vertices.length < 3) {
        setCloseAttempted(true);
        return;
      }
      setCloseAttempted(false);
      dispatch({ type: 'close' });
    },
    undo: () => dispatch({ type: 'undo' }),
    removeVertex: (index: number) => dispatch({ type: 'remove', index }),
    // Un vértice que se pone o se suelta cerca del borde de otra parcela se pega a él.
    addMapVertex: (point: GeoPoint) =>
      dispatch({
        type: 'add',
        vertex: {
          ...snapToBorders(point, borders),
          source: 'map',
          accuracyM: null,
          capturedAt: nowIso(),
        },
      }),
    addGpsVertex: (vertex: { point: GeoPoint; accuracyM: number | null }) =>
      dispatch({
        type: 'add',
        vertex: {
          ...vertex.point,
          source: 'gps',
          accuracyM: vertex.accuracyM,
          capturedAt: nowIso(),
        },
      }),
    moveVertex: (index: number, point: GeoPoint) =>
      dispatch({ type: 'move', index, point: snapToBorders(point, borders) }),
    applySuggestion: () => {
      if (!check.suggestion) return;
      dispatch({
        type: 'replace',
        vertices: applySuggestion(draft.vertices, check.suggestion, nowIso()),
      });
    },
    // Lo que la persona escribe en el campo del área: desde ahí el polígono ya no la cambia, salvo
    // que lo deje vacío.
    onAreaTyped: (value: string) => {
      areaIsManual.current = value.trim() !== '';
    },
    // Reduce el área de la parcela a lo que queda libre en la finca.
    useAvailableArea: () => {
      if (check.availableHectares <= 0) return;
      areaIsManual.current = true;
      form.setValue('area_hectares', check.availableHectares.toFixed(2), {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    useMeasuredArea: () => {
      if (check.measuredAreaHectares === null) return;
      // Aceptar la calculada es volver a que el área siga al polígono.
      areaIsManual.current = false;
      form.setValue('area_hectares', check.measuredAreaHectares.toFixed(2), {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
  };
}
