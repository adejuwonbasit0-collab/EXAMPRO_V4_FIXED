// builder/engine/HistoryEngine.js
// PHASE 12 — Replaces the Phase 5 version.

const MAX_HISTORY       = 100;
const TEXT_DEBOUNCE_MS  = 400;   // Text edits pushed to stack after 400ms of no typing

class HistoryEngine {
  constructor() {
    this.stack        = [];      // Array of { layout, label, timestamp }
    this.index        = -1;
    this._textTimer   = null;    // Debounce timer for text-field changes
    this._pendingText = null;    // Buffered layout waiting for debounce flush
  }

  // ─── Reset (called when a page loads) ───────────────────────────────────────
  reset(layout, label = 'Page loaded') {
    clearTimeout(this._textTimer);
    this.stack = [this._snapshot(layout, label)];
    this.index = 0;
    this._pendingText = null;
  }

  // ─── Push an immediate snapshot (structural changes: add/delete/move) ────────
  push(layout, label = 'Edit') {
    clearTimeout(this._textTimer);
    this._pendingText = null;
    this._commit(layout, label);
  }

  // ─── Push a debounced snapshot (text/number field edits) ─────────────────────
  pushDebounced(layout, label = 'Edit text') {
    clearTimeout(this._textTimer);
    this._pendingText = { layout, label };

    this._textTimer = setTimeout(() => {
      if (this._pendingText) {
        this._commit(this._pendingText.layout, this._pendingText.label);
        this._pendingText = null;
      }
    }, TEXT_DEBOUNCE_MS);
  }

  // ─── Flush pending text edit immediately (call before save/publish) ──────────
  flush() {
    if (this._pendingText) {
      clearTimeout(this._textTimer);
      this._commit(this._pendingText.layout, this._pendingText.label);
      this._pendingText = null;
    }
  }

  // ─── Undo ────────────────────────────────────────────────────────────────────
  undo() {
    this.flush();
    if (this.index <= 0) return { layout: null, label: null };
    this.index--;
    const entry = this.stack[this.index];
    return { layout: this._deepCopy(entry.layout), label: entry.label };
  }

  // ─── Redo ────────────────────────────────────────────────────────────────────
  redo() {
    if (this.index >= this.stack.length - 1) return { layout: null, label: null };
    this.index++;
    const entry = this.stack[this.index];
    return { layout: this._deepCopy(entry.layout), label: entry.label };
  }

  // ─── Status ──────────────────────────────────────────────────────────────────
  getStatus() {
    return {
      canUndo:    this.index > 0,
      canRedo:    this.index < this.stack.length - 1,
      undoLabel:  this.index > 0                        ? this.stack[this.index].label     : null,
      redoLabel:  this.index < this.stack.length - 1    ? this.stack[this.index + 1].label : null,
      stackDepth: this.stack.length,
    };
  }

  // ─── Internals ───────────────────────────────────────────────────────────────
  _commit(layout, label) {
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(this._snapshot(layout, label));
    if (this.stack.length > MAX_HISTORY) {
      this.stack.shift();
    } else {
      this.index++;
    }
  }

  _snapshot(layout, label) {
    return { layout: this._deepCopy(layout), label, timestamp: Date.now() };
  }

  _deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

export default new HistoryEngine();
