import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildAgriculturalActivity,
  buildAssignee,
  buildSession,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { EVIDENCE_RESOURCE, type EvidencePayload } from '../evidence-queue';
import { MAX_PHOTOS } from '../photo-selection';

// jsdom no tiene lienzo para reducir fotos: la preparación tiene sus propias pruebas. Un PDF se
// rechaza como lo haría la de verdad.
vi.mock('@/lib/images/prepare-photo', () => ({
  preparePhoto: vi.fn(async (file: File) =>
    file.type === 'application/pdf'
      ? {
          ok: false,
          message: 'Formato no permitido. Puedes adjuntar fotos JPG o PNG',
        }
      : { ok: true, blob: new Blob(['foto']), name: file.name },
  ),
}));

import { EvidenceSection } from './evidence-section';

type Evidence = components['schemas']['Evidence'];

const photo = (id: string, uploadedBy = 'u-other'): Evidence => ({
  id,
  file_name: `${id}.jpg`,
  content_type: 'image/jpeg',
  size: 300_000,
  uploaded_by: { id: uploadedBy, full_name: 'Otra cuenta' },
  uploaded_at: '2026-10-19T16:00:00Z',
  captured_at: '2026-10-19T15:20:00Z',
});

const monitoring = buildAgriculturalActivity({
  id: 'm1',
  activity_type: 'phytosanitary_monitoring',
  status: 'done',
  done_date: '2026-10-19',
  assignee: buildAssignee({ id: 'u-foreman' }),
  monitoring: {
    sampling_unit: 'trees',
    evaluated_units: 50,
    sampling_method: null,
    notes: null,
    no_presence: true,
    detections: [],
    detections_without_control: 0,
    evidence_count: 1,
  },
});

let saved: Evidence[];
let deleted: string[];
let userId: string;

beforeEach(() => {
  userId = `evidence-section-${crypto.randomUUID()}`;
  saved = [photo('e1')];
  deleted = [];
  let next = 0;
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: () => `blob:foto-${(next += 1)}`,
      revokeObjectURL: () => {},
    }),
  );
  server.use(
    http.get(apiUrl('/api/agricultural-activities/m1/evidence'), () =>
      HttpResponse.json({ results: saved }),
    ),
    http.get(
      apiUrl('/api/evidence/:id/file'),
      () =>
        new HttpResponse('foto', { headers: { 'Content-Type': 'image/jpeg' } }),
    ),
    http.delete(apiUrl('/api/evidence/:id'), ({ params }) => {
      deleted.push(String(params.id));
      saved = saved.filter(({ id }) => id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
});

// Un rol propio de un empleado que solo registra lo suyo.
const WORKER_ROLES = [
  { id: 'role-worker', code: null, name: 'Recolector', farm_scope: 'one' },
];

const FOREMAN = [
  PERMISSIONS.ACTIVITIES_VIEW,
  PERMISSIONS.ACTIVITIES_COMPLETE,
  PERMISSIONS.ACTIVITIES_ADD,
];

function renderSection(
  user: Parameters<typeof buildSession>[0] = { permissions: FOREMAN },
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, all_farms: false, ...user }),
  );
  renderWithProviders(<EvidenceSection activity={monitoring} />, {
    queryClient,
  });
}

const queuedPhotos = async () =>
  (
    await getOfflineDb(userId)
      .queue.where('resource')
      .equals(EVIDENCE_RESOURCE)
      .toArray()
  ).map((item) => item.payload as EvidencePayload);

const upload = (files: File[]) =>
  userEvent.upload(screen.getByLabelText('Fotos de la galería'), files);

const jpg = (name: string) =>
  new File(['x'], name, { type: 'image/jpeg', lastModified: 0 });

describe('EvidenceSection', () => {
  it('shows the photos of the monitoring', async () => {
    renderSection();

    expect(
      await screen.findByRole('button', { name: 'Ver Foto 1' }),
    ).toBeInTheDocument();
  });

  it('attaches photos from the gallery through the device queue', async () => {
    renderSection();
    await screen.findByRole('button', { name: 'Ver Foto 1' });

    await upload([jpg('mazorca.jpg'), jpg('hoja.jpg')]);

    expect(await screen.findByText('Fotos adjuntadas')).toBeVisible();
    const queued = await queuedPhotos();
    expect(queued.map(({ fileName }) => fileName).sort()).toEqual([
      'hoja.jpg',
      'mazorca.jpg',
    ]);
    expect(queued[0]).toMatchObject({
      activityId: 'm1',
      kind: 'monitoring',
      label: 'P-03 · 19 de octubre',
    });
    expect(await screen.findAllByText('Pendiente de enviar')).toHaveLength(2);
  });

  it('says why a file was not attached', async () => {
    renderSection();
    await screen.findByRole('button', { name: 'Ver Foto 1' });

    // En el teléfono `accept` es solo una sugerencia: se puede elegir otro archivo igual.
    await userEvent
      .setup({ applyAccept: false })
      .upload(screen.getByLabelText('Fotos de la galería'), [
        new File(['x'], 'informe.pdf', { type: 'application/pdf' }),
      ]);

    expect(
      await screen.findByText(
        'Formato no permitido. Puedes adjuntar fotos JPG o PNG',
      ),
    ).toBeVisible();
    expect(await queuedPhotos()).toEqual([]);
  });

  it('attaches no more than five, counting the ones already there', async () => {
    saved = Array.from({ length: MAX_PHOTOS - 1 }, (_, index) =>
      photo(`e${index + 1}`),
    );
    renderSection();
    await screen.findByRole('button', { name: 'Ver Foto 4' });

    await upload([jpg('a.jpg'), jpg('b.jpg')]);

    expect(
      await screen.findByText('Ya tiene 5 fotos, el máximo'),
    ).toBeVisible();
    await waitFor(async () => expect(await queuedPhotos()).toHaveLength(1));
  });

  it('deletes a photo after confirming', async () => {
    renderSection();
    await screen.findByRole('button', { name: 'Ver Foto 1' });

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Eliminar foto',
      }),
    );

    await waitFor(() => expect(deleted).toEqual(['e1']));
    expect(await screen.findByText('Foto eliminada')).toBeVisible();
  });

  it('lets a worker attach to its own monitoring but not delete the photos of others', async () => {
    renderSection({
      id: 'u-foreman',
      roles: WORKER_ROLES,
      permissions: [
        PERMISSIONS.ACTIVITIES_VIEW,
        PERMISSIONS.ACTIVITIES_COMPLETE,
      ],
    });
    await screen.findByRole('button', { name: 'Ver Foto 1' });

    expect(screen.getByRole('button', { name: 'Tomar foto' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Eliminar' }),
    ).not.toBeInTheDocument();
  });

  it('does not let a worker who reaches every farm delete the photos of others', async () => {
    saved = [photo('e1'), photo('e2', 'u-worker')];
    renderSection({
      id: 'u-worker',
      roles: WORKER_ROLES,
      all_farms: true,
      permissions: [
        PERMISSIONS.ACTIVITIES_VIEW,
        PERMISSIONS.ACTIVITIES_COMPLETE,
      ],
    });
    await screen.findByRole('button', { name: 'Ver Foto 2' });

    // Solo la suya.
    expect(screen.getAllByRole('button', { name: 'Eliminar' })).toHaveLength(1);
  });

  it('does not offer to attach to who cannot record that monitoring', async () => {
    renderSection({
      id: 'u-worker',
      roles: WORKER_ROLES,
      permissions: [
        PERMISSIONS.ACTIVITIES_VIEW,
        PERMISSIONS.ACTIVITIES_COMPLETE,
      ],
    });
    await screen.findByRole('button', { name: 'Ver Foto 1' });

    expect(
      screen.queryByRole('button', { name: 'Tomar foto' }),
    ).not.toBeInTheDocument();
  });
});
