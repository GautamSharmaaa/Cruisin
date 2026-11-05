import { UI_COPY as C } from "./constants/copy";
export interface LogisticsPrintDocument {
  kind: string;
  url: string;
}
export function renderLogisticsPrintPreview(
  popup: Window,
  document: LogisticsPrintDocument,
): void {
  if (document.url.startsWith("https://")) {
    popup.location.replace(document.url);
    return;
  }
  if (!document.url.startsWith("mock://logistics/"))
    throw new Error(C.invalidDocumentUrl);
  const title =
    document.kind === "invoice"
      ? C.orderInvoice
      : document.kind === "manifest"
        ? C.shipmentManifest
        : C.shippingLabel;
  popup.document.body.replaceChildren();
  popup.document.title = `CRUISIN ${title}`;
  const heading = popup.document.createElement("h1");
  heading.textContent = `CRUISIN ${title}`;
  popup.document.body.append(heading);
  const reference = popup.document.createElement("p");
  reference.textContent = `${C.mockDocumentReference}: ${document.url}`;
  popup.document.body.append(reference);
  popup.print();
}
