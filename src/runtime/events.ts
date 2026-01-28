import type { InfographicOptions } from '../options';
import type { SyntaxError } from '../syntax';
import type { Element } from '../types';

/**
 * Payload for the 'change' event, emitted when data/options change in the editor.
 */
export interface InfographicChangeEvent {
  /** The type of change operation */
  operation: 'add' | 'remove' | 'update';
  /** Human-readable path to the changed data (e.g., "data.items[0].label") */
  path: string;
  /** The new value */
  value: any;
  /** Previous value (when available) */
  previousValue?: any;
  /** Current options snapshot */
  options: Partial<InfographicOptions>;
}

/**
 * Payload for the 'selectionChange' event, emitted when selection changes in the editor.
 */
export interface InfographicSelectionChangeEvent {
  /** Currently selected elements */
  selection: Element[];
  /** Elements added to selection in this change */
  added: Element[];
  /** Elements removed from selection in this change */
  removed: Element[];
}

/**
 * Payload for the 'historyChange' event, emitted on undo/redo or command execution.
 */
export interface InfographicHistoryChangeEvent {
  /** What triggered the history change */
  action: 'execute' | 'undo' | 'redo';
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of commands in the undo stack */
  historySize: number;
}

/**
 * Payload for the 'geometryChange' event, emitted when selected elements are moved/resized.
 */
export interface InfographicGeometryChangeEvent {
  /** The element being modified */
  target: Element;
  /** Type of geometry change */
  changeType: 'move' | 'resize';
}

/**
 * Payload for the 'rendered' event.
 */
export interface InfographicRenderedEvent {
  /** The rendered SVG element */
  node: SVGSVGElement;
  /** The options used for rendering */
  options: Partial<InfographicOptions>;
}

/**
 * Payload for the 'loaded' event (after all resources are loaded).
 */
export interface InfographicLoadedEvent {
  /** The rendered SVG element */
  node: SVGSVGElement;
  /** The options used for rendering */
  options: Partial<InfographicOptions>;
}

/**
 * Map of event names to their payload types for typed event handling.
 */
export interface InfographicEventMap {
  /** Emitted when data/options change in the editor */
  change: InfographicChangeEvent;
  /** Emitted when selection changes in the editor */
  selectionChange: InfographicSelectionChangeEvent;
  /** Emitted on undo/redo or command execution */
  historyChange: InfographicHistoryChangeEvent;
  /** Emitted when selected elements are moved/resized */
  geometryChange: InfographicGeometryChangeEvent;
  /** Emitted after initial render */
  rendered: InfographicRenderedEvent;
  /** Emitted after all resources (images, fonts) are loaded */
  loaded: InfographicLoadedEvent;
  /** Emitted when the infographic is destroyed */
  destroyed: void;
  /** Emitted on error */
  error: Error | SyntaxError[];
  /** Emitted on warning */
  warning: SyntaxError[];
}

/**
 * Callback props that can be passed to InfographicOptions for event handling.
 */
export interface InfographicEventCallbacks {
  /** Callback when data/options change (requires editable:true) */
  onChange?: (event: InfographicChangeEvent) => void;
  /** Callback when selection changes (requires editable:true) */
  onSelectionChange?: (event: InfographicSelectionChangeEvent) => void;
  /** Callback when history changes (requires editable:true) */
  onHistoryChange?: (event: InfographicHistoryChangeEvent) => void;
  /** Callback when geometry changes during drag/resize (requires editable:true) */
  onGeometryChange?: (event: InfographicGeometryChangeEvent) => void;
  /** Callback after render completes */
  onRendered?: (event: InfographicRenderedEvent) => void;
  /** Callback after all resources are loaded */
  onLoaded?: (event: InfographicLoadedEvent) => void;
  /** Callback on error */
  onError?: (error: Error | SyntaxError[]) => void;
  /** Callback on warning */
  onWarning?: (warnings: SyntaxError[]) => void;
}
