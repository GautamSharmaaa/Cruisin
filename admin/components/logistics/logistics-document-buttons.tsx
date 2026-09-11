// Governed by .rules v1.0
'use client';

import { FileText, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGenerateLogisticsDocument, type LogisticsDocumentAccess, type Shipment } from '@/hooks/useLogistics';

const title = (kind: 'label' | 'invoice'): string => kind === 'label' ? 'Shipping label' : 'Order invoice';

const renderPrintPreview = (popup: Window, document: LogisticsDocumentAccess): void => {
  if (document.url.startsWith('https://')) {
    // Open the provider PDF directly: Shiprocket may block cross-origin iframes,
    // while direct navigation keeps the browser's native print/download controls.
    popup.location.replace(document.url);
    return;
  }
  popup.document.body.replaceChildren();
  popup.document.title = `Cruisin ${title(document.kind as 'label' | 'invoice')}`;
  const heading = popup.document.createElement('h1');
  heading.textContent = `Cruisin ${title(document.kind as 'label' | 'invoice')}`;
  popup.document.body.append(heading);
  const reference = popup.document.createElement('p');
  reference.textContent = `Mock document reference: ${document.url}`;
  popup.document.body.append(reference);
  popup.print();
};

export function LogisticsDocumentButtons({ shipment, compact = false }: { shipment: Shipment; compact?: boolean }): ReactNode {
  const documents = useGenerateLogisticsDocument();
  const [notice, setNotice] = useState('');

  const printDocument = (kind: 'label' | 'invoice'): void => {
    const popup = window.open('about:blank', '_blank');
    if (!popup) {
      setNotice('Allow pop-ups to open the secure print preview.');
      return;
    }
    popup.opener = null;
    popup.document.title = `Preparing ${title(kind)}`;
    popup.document.body.textContent = `Preparing secure ${title(kind).toLowerCase()} preview…`;
    setNotice('');
    documents.mutate({ shipmentId: shipment._id, kind }, {
      onSuccess: (document) => {
        setNotice(`${title(kind)} ready to print.`);
        renderPrintPreview(popup, document);
      },
      onError: (error) => {
        popup.close();
        setNotice(error.message);
      },
    });
  };

  const buttonClass = compact ? 'min-h-9 px-3 text-[11px]' : 'min-h-9 px-4';
  return <>
    <Button variant="secondary" className={buttonClass} onClick={() => printDocument('label')} disabled={!shipment.awb || documents.isPending} title={shipment.awb ? 'Open the Shiprocket label print preview' : 'Sync an AWB from Shiprocket before printing the label'}><Printer className="mr-1 h-3 w-3" />Print label</Button>
    <Button variant="secondary" className={buttonClass} onClick={() => printDocument('invoice')} disabled={!shipment.providerOrderId || documents.isPending} title={shipment.providerOrderId ? 'Open the Shiprocket invoice print preview' : 'Create or sync the Shiprocket order before printing the invoice'}><FileText className="mr-1 h-3 w-3" />Print invoice</Button>
    {notice ? <span className="basis-full text-xs text-text-muted" role={documents.error ? 'alert' : 'status'}>{notice}</span> : null}
  </>;
}
