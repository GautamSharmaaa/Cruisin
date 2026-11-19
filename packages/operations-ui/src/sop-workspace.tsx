"use client";

import { useRef, useState, type ReactNode } from "react";
import { Alert, Button, Dialog, Input, Pagination, Skeleton, Status } from "@cruisin/ui";
import type { Principal, Sop } from "@cruisin/contracts";
import type { OperationsTransport } from "./api";
import { useList } from "./common";
import { OPS_COPY as C } from "./constants/copy";
import { CRUISIN_PACKAGING_TITLE, SOP_FLOW_COPY as F } from "./constants/packaging-sop";
import { SopEditor, SopFlow, SopPanel } from "./sops";
import { SopStepEditor } from "./sop-step-editor";

export interface SopWorkspaceProps {
  api: OperationsTransport;
  principal: Principal;
  description?: string;
}

export function SopWorkspace({ api, principal, description }: SopWorkspaceProps): ReactNode {
  const [editing, setEditing] = useState(false);
  const [savedDraft, setSavedDraft] = useState<Sop>();
  const editButton = useRef<HTMLButtonElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const featured = useList<Sop>(api, "/sops", CRUISIN_PACKAGING_TITLE);
  const library = useList<Sop>(api, libraryOpen ? "/sops" : "", query, "", page);
  const loadedSop = featured.data?.items.find(item => item.title === CRUISIN_PACKAGING_TITLE && item.kind === "PACKAGING");
  const sop = loadedSop && savedDraft?._id === loadedSop._id && savedDraft.version > loadedSop.version ? savedDraft : loadedSop;
  const closeEditor = (): void => {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  };
  const canEdit = principal.permissions.includes("sop.create");
  const refresh = (): void => {
    featured.reload();
    if (libraryOpen) library.reload();
  };

  return (
    <div className="ui-stack ops-sop-workspace">
      <header className="ops-heading">
        <div>
          <p className="ops-eyebrow">{C.eyebrow}</p>
          <h1>{C.sops}</h1>
          {description && <p className="ops-description">{description}</p>}
        </div>
        <div className="ui-row">
          {canEdit && <Dialog title={C.newSop} trigger={<Button>{C.newSop}</Button>}>
            <SopEditor api={api} onSaved={() => {
              setQuery("");
              setPage(1);
              setLibraryOpen(true);
              library.reload();
              featured.reload();
            }} />
          </Dialog>}
          <Button variant="ghost" onClick={refresh}>{C.refresh}</Button>
        </div>
      </header>

      {featured.error ? <Alert tone="danger">{featured.error}</Alert> : !featured.data ? <Skeleton /> : sop ? (
        <section className="ops-sop-feature ui-stack" aria-labelledby="packaging-sop-title">
          <header className="ops-sop-feature-header">
            <div className="ui-stack">
              <h2 id="packaging-sop-title">{sop.title}</h2>
              <div className="ui-row ops-sop-feature-meta"><Status>{sop.status}</Status><span>{C.version} {sop.version}</span><span>{sop.requirements?.length ?? 0} {F.count}</span></div>
            </div>
            <div className="ui-row">
              {canEdit && !editing && <Button ref={editButton} onClick={() => setEditing(true)}>{F.edit}</Button>}
              {!editing && <Dialog title={sop.title} trigger={<Button variant="secondary">{F.manage}</Button>}>
                <SopPanel key={sop.version} sop={sop} api={api} principal={principal} onSaved={refresh} />
              </Dialog>}
            </div>
          </header>
          {editing && canEdit ? (
            <SopStepEditor sop={sop} api={api} onCancel={closeEditor} onSaved={saved => {
              setSavedDraft(saved);
              closeEditor();
              refresh();
            }} />
          ) : <SopFlow requirements={sop.requirements ?? []} labels={sop.flowLabels} />}
        </section>
      ) : <Alert>{F.unavailable}</Alert>}

      <section className="ops-sop-library ui-stack">
        <Button variant="secondary" aria-expanded={libraryOpen} aria-controls="sop-library" onClick={() => setLibraryOpen(value => !value)}>
          {F.library}
        </Button>
        {libraryOpen && <div id="sop-library" className="ui-stack">
          <Input aria-label={C.search} placeholder={C.search} value={query} onChange={event => {
            setQuery(event.target.value);
            setPage(1);
          }} />
          {library.error ? <Alert tone="danger">{library.error}</Alert> : !library.data ? <Skeleton /> : (
            <>
              {library.data.items.length === 0 && <Alert>{C.empty}</Alert>}
              <ul className="ops-sop-library-list">
                {library.data.items.map(item => (
                  <li key={item._id}>
                    <div><h2>{item.title}</h2><p>{item.category} · {C.version} {item.version}</p></div>
                    <div className="ui-row">
                      <Status>{item.status}</Status>
                      <Dialog title={item.title} trigger={<Button variant="secondary">{C.details}</Button>}>
                        <SopPanel key={item.version} sop={item} api={api} principal={principal} onSaved={refresh} />
                      </Dialog>
                    </div>
                  </li>
                ))}
              </ul>
              {library.data.pages > 1 && <Pagination page={page} pages={library.data.pages} onChange={setPage} />}
            </>
          )}
        </div>}
      </section>
    </div>
  );
}
