export interface IEditor {
  getDocument(): SVGSVGElement;
  canUndo(): boolean;
  canRedo(): boolean;
  getHistorySize(): number;
  destroy(): void;
}
