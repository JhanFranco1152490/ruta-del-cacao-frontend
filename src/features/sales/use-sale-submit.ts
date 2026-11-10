'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { UseFormSetError } from 'react-hook-form';

import { notify } from '@/lib/notify';
import { MISSING_FIELDS_MESSAGE } from '@/lib/validation/messages';

import { invoiceFileIssue } from './invoice-file';
import { useRegisterSale } from './mutations';
import type { StockOption } from './sale-line-options';
import {
  invoiceNotAttached,
  SALE_NOT_REGISTERED,
  saleRegistered,
} from './sale-messages';
import { saleDetailPath } from './sale-paths';
import { saleFailureOf } from './sale-errors';
import { type SaleFormInput, toCreateRequest } from './sale-schema';

// El envío del formulario: la venta y su soporte, el aviso al guardar y cada rechazo del servidor en
// su campo o en su línea. Lo que cambió entretanto (lo disponible, los compradores activos) se vuelve
// a leer solo: registrar invalida las existencias también al fallar.
export function useSaleSubmit({
  options,
  setError,
  returnPath,
}: {
  options: readonly StockOption[];
  setError: UseFormSetError<SaleFormInput>;
  returnPath: string;
}) {
  const router = useRouter();
  const register = useRegisterSale();
  const [formError, setFormError] = useState<string>();
  const [invoice, setInvoice] = useState<File | null>(null);
  const [invoiceError, setInvoiceError] = useState<string>();

  const chooseInvoice = (file: File) => {
    const issue = invoiceFileIssue(file);
    setInvoiceError(issue ?? undefined);
    setInvoice(issue ? null : file);
  };

  const onInvalid = () => setFormError(MISSING_FIELDS_MESSAGE);

  const onValid = (values: SaleFormInput) => {
    setFormError(undefined);
    register.mutate(
      { request: toCreateRequest(values, options), invoice },
      {
        onSuccess: ({ sale, invoiceError: refused }) => {
          router.replace(returnPath);
          if (!refused) {
            notify.success(saleRegistered(sale.code));
            return;
          }
          notify.warning(invoiceNotAttached(sale.code), {
            persistent: true,
            action: {
              label: 'Ver venta',
              onClick: () => router.push(saleDetailPath(sale.id)),
            },
          });
        },
        onError: (error) => {
          const failure = saleFailureOf(error);
          switch (failure.kind) {
            case 'line':
              setError(`lines.${failure.index}.${failure.field}`, {
                type: 'server',
                message: failure.message,
              });
              setFormError(SALE_NOT_REGISTERED);
              return;
            case 'field':
              setError(failure.field as keyof SaleFormInput, {
                type: 'server',
                message: failure.message,
              });
              setFormError(SALE_NOT_REGISTERED);
              return;
            case 'lines':
              setError('lines', { type: 'server', message: failure.message });
              setFormError(SALE_NOT_REGISTERED);
              return;
            default:
              setFormError(failure.message);
          }
        },
      },
    );
  };

  return {
    onValid,
    onInvalid,
    isSaving: register.isPending,
    formError,
    invoice,
    invoiceError,
    chooseInvoice,
    removeInvoice: () => {
      setInvoice(null);
      setInvoiceError(undefined);
    },
  };
}
