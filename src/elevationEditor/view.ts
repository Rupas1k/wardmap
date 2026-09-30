export type EditMode = "pan" | "block" | "erase";

export type EditorElements = {
  mapTarget: HTMLDivElement;
  fileInput: HTMLInputElement;
  mapVersion: HTMLSelectElement;
  brushSize: HTMLSelectElement;
  fileSummary: HTMLSpanElement;
  cellSummary: HTMLSpanElement;
  selectionSummary: HTMLSpanElement;
  saveState: HTMLSpanElement;
  errorMessage: HTMLDivElement;
  undoButton: HTMLButtonElement;
  clearButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  modeButtons: HTMLButtonElement[];
};

function required<T extends Element>(root: Element, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing editor element: ${selector}`);
  }

  return element;
}

export function renderEditor(root: HTMLDivElement): EditorElements {
  root.innerHTML = `
    <main class="elevation-editor">
      <div id="map" class="editor-map"></div>
      <aside class="editor-panel" aria-label="Elevation editor controls">
        <header class="editor-heading">
          <div class="editor-title"><strong>Elevation editor</strong><span id="save-state" hidden>Unsaved</span></div>
          <span id="file-summary">No elevation loaded</span>
        </header>
        <section class="editor-section">
          <span class="section-label">Source</span>
          <label class="editor-file button-like">Choose elevation<input id="elevation-file" type="file" accept=".bin,application/octet-stream" /></label>
          <label class="editor-row"><span>Map tiles</span><select id="map-version"><option value="2">Version 2</option><option value="1">Version 1</option><option value="0">Version 0</option></select></label>
        </section>
        <section class="editor-section">
          <span class="section-label">Edit</span>
          <div class="mode-group" role="group" aria-label="Editing mode"><button type="button" data-mode="pan">Pan</button><button type="button" data-mode="block" class="active">Block</button><button type="button" data-mode="erase">Erase</button></div>
          <label class="editor-row"><span>Brush</span><select id="brush-size"><option value="1">1 × 1</option><option value="3">3 × 3</option><option value="5">5 × 5</option></select></label>
        </section>
        <section class="editor-section editor-changes">
          <div><span class="section-label">Changes</span><strong id="selection-summary">0 blocked cells</strong></div>
          <div class="action-row"><button id="undo" type="button" disabled>Undo</button><button id="clear" type="button" disabled>Clear</button></div>
        </section>
        <button id="export" type="button" class="primary export-button" disabled>Export fixed elevation</button>
      </aside>
      <div class="editor-status"><span id="cell-summary">Import an elevation file to begin</span></div>
      <div id="editor-error" class="editor-error" role="alert" hidden></div>
    </main>`;

  return {
    mapTarget: required(root, "#map"),
    fileInput: required(root, "#elevation-file"),
    mapVersion: required(root, "#map-version"),
    brushSize: required(root, "#brush-size"),
    fileSummary: required(root, "#file-summary"),
    cellSummary: required(root, "#cell-summary"),
    selectionSummary: required(root, "#selection-summary"),
    saveState: required(root, "#save-state"),
    errorMessage: required(root, "#editor-error"),
    undoButton: required(root, "#undo"),
    clearButton: required(root, "#clear"),
    exportButton: required(root, "#export"),
    modeButtons: [...root.querySelectorAll<HTMLButtonElement>("[data-mode]")],
  };
}
