import EventEmitter from 'eventemitter3';
import {
  Editor,
  type HistoryChangePayload,
  type IEditor,
  type SelectionChangePayload,
  type StateChangePayload,
} from '../editor';
import {
  exportToPNGString,
  exportToSVGString,
  type ExportOptions,
} from '../exporter';
import { renderSVG } from '../jsx';
import {
  InfographicOptions,
  ParsedInfographicOptions,
  parseOptions,
} from '../options';
import { Renderer } from '../renderer';
import { waitForSvgLoads } from '../resource';
import { parseSyntax, type SyntaxError } from '../syntax';
import { IEventEmitter } from '../types';
import { getTypes, parseSVG } from '../utils';
import type {
  InfographicChangeEvent,
  InfographicEventMap,
  InfographicGeometryChangeEvent,
  InfographicHistoryChangeEvent,
  InfographicSelectionChangeEvent,
} from './events';
import { DEFAULT_OPTIONS } from './options';
import {
  cloneOptions,
  isCompleteParsedInfographicOptions,
  mergeOptions,
} from './utils';

export class Infographic {
  rendered: boolean = false;

  private emitter: IEventEmitter = new EventEmitter();

  private node: SVGSVGElement | null = null;

  private editor?: IEditor;

  private initialOptions: Partial<InfographicOptions> = {};
  private options!: Partial<InfographicOptions>;
  private parsedOptions!: Partial<ParsedInfographicOptions>;

  constructor(options: string | Partial<InfographicOptions>) {
    this.setOptions(options, 'replace', true);
  }

  getOptions() {
    return this.options;
  }

  private setOptions(
    options: string | Partial<InfographicOptions>,
    mode: 'replace' | 'merge' = 'replace',
    isInitial = false,
  ) {
    const {
      options: parsedOptions,
      errors,
      warnings,
    } = parseSyntaxOptions(options);
    if (isInitial) {
      this.initialOptions = parsedOptions;
    }

    const base =
      mode === 'replace'
        ? mergeOptions(cloneOptions(this.initialOptions || {}), parsedOptions)
        : mergeOptions(
            this.options || cloneOptions(this.initialOptions || {}),
            parsedOptions,
          );

    this.options = base;
    this.parsedOptions = parseOptions(
      mergeOptions(DEFAULT_OPTIONS, this.options),
    );

    if (warnings.length) {
      this.emitter.emit('warning', warnings);
    }
    if (errors.length) {
      this.emitter.emit('error', errors);
    }
  }

  /**
   * Render the infographic into the container
   */
  render(options?: string | Partial<InfographicOptions>) {
    if (options) {
      this.setOptions(options, 'replace');
    } else if (!this.options && this.initialOptions) {
      this.setOptions(this.initialOptions, 'replace');
    }
    this.performRender();
  }

  update(options: string | Partial<InfographicOptions>) {
    this.setOptions(options, 'merge');
    this.performRender();
  }

  private performRender() {
    const parsedOptions = this.parsedOptions;
    if (!isCompleteParsedInfographicOptions(parsedOptions)) {
      this.emitter.emit('error', new Error('Incomplete options'));
      return;
    }

    const { container } = this.parsedOptions;
    const template = this.compose(parsedOptions);
    const renderer = new Renderer(parsedOptions, template);
    this.node = renderer.render();
    container?.replaceChildren(this.node);
    this.editor?.destroy();
    this.editor = undefined;
    if (this.options.editable) {
      this.editor = new Editor(this.emitter, this.node, parsedOptions);
      this.setupEditorEventBridge();
    }

    this.rendered = true;
    this.emitter.emit('rendered', { node: this.node, options: this.options });
    const currentNode = this.node;
    if (currentNode) {
      void waitForSvgLoads(currentNode).then(() => {
        if (this.node !== currentNode) return;
        this.emitter.emit('loaded', {
          node: currentNode,
          options: this.options,
        });
      });
    }
    return true;
  }

  /**
   * Compose the SVG template
   */
  compose(parsedOptions: ParsedInfographicOptions): SVGSVGElement {
    const { design, data } = parsedOptions;
    const { title, item, items, structure } = design;
    const { component: Structure, props: structureProps } = structure;
    const Title = title.component;
    const Item = item.component;
    const Items = items.map((it) => it.component);

    const svg = renderSVG(
      <Structure
        data={data}
        Title={Title}
        Item={Item}
        Items={Items}
        options={parsedOptions}
        {...structureProps}
      />,
    );

    const template = parseSVG(svg);
    if (!template) {
      throw new Error('Failed to parse SVG template');
    }
    return template;
  }

  getTypes() {
    const parsedOptions = this.parsedOptions;
    if (!isCompleteParsedInfographicOptions(parsedOptions)) {
      this.emitter.emit('error', new Error('Incomplete options'));
      return;
    }
    const design = parsedOptions.design;
    const structure = design.structure.composites || [];
    const items = design.items.map((it) => it.composites || []);
    return getTypes({ structure, items });
  }

  /**
   * Export the infographic to data URL
   * @param options Export option
   * @returns Data URL string of the exported infographic
   * @description This method need to be called after `render()` and in a browser environment.
   */
  async toDataURL(options?: ExportOptions): Promise<string> {
    if (!this.node) {
      throw new Error('Infographic is not rendered yet.');
    }
    if (options?.type === 'svg') {
      return await exportToSVGString(this.node, options);
    }
    return await exportToPNGString(this.node, options);
  }

  /**
   * Subscribe to an event
   * @param event Event name
   * @param listener Event handler
   */
  on<K extends keyof InfographicEventMap>(
    event: K,
    listener: (payload: InfographicEventMap[K]) => void,
  ): void;
  on(event: string, listener: (...args: any[]) => void): void;
  on(event: string, listener: (...args: any[]) => void) {
    this.emitter.on(event, listener);
  }

  /**
   * Unsubscribe from an event
   * @param event Event name
   * @param listener Event handler to remove
   */
  off<K extends keyof InfographicEventMap>(
    event: K,
    listener: (payload: InfographicEventMap[K]) => void,
  ): void;
  off(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void) {
    this.emitter.off(event, listener);
  }

  /**
   * Setup event bridging from internal editor events to public events
   */
  private setupEditorEventBridge() {
    // Bridge options:change to public 'change' event
    this.emitter.on('options:change', (payload: StateChangePayload) => {
      const change = payload.changes[0];
      if (!change) return;

      const publicEvent: InfographicChangeEvent = {
        operation: change.op,
        path: change.path,
        value: change.value,
        options: this.getOptions(),
      };
      this.emitter.emit('change', publicEvent);

      // Call callback prop if provided
      const { onChange } = this.options as InfographicOptions;
      if (onChange) {
        onChange(publicEvent);
      }
    });

    // Bridge selection:change to public 'selectionChange' event
    this.emitter.on('selection:change', (payload: SelectionChangePayload) => {
      const publicEvent: InfographicSelectionChangeEvent = {
        selection: payload.next,
        added: payload.added,
        removed: payload.removed,
      };
      this.emitter.emit('selectionChange', publicEvent);

      // Call callback prop if provided
      const { onSelectionChange } = this.options as InfographicOptions;
      if (onSelectionChange) {
        onSelectionChange(publicEvent);
      }
    });

    // Bridge history:change to public 'historyChange' event
    this.emitter.on('history:change', (payload: HistoryChangePayload) => {
      const publicEvent: InfographicHistoryChangeEvent = {
        action: payload.action,
        canUndo: this.editor?.canUndo() ?? false,
        canRedo: this.editor?.canRedo() ?? false,
        historySize: this.editor?.getHistorySize() ?? 0,
      };
      this.emitter.emit('historyChange', publicEvent);

      // Call callback prop if provided
      const { onHistoryChange } = this.options as InfographicOptions;
      if (onHistoryChange) {
        onHistoryChange(publicEvent);
      }
    });

    // Bridge selection:geometrychange to public 'geometryChange' event
    this.emitter.on(
      'selection:geometrychange',
      (payload: { type: 'selection:geometrychange'; target: any }) => {
        const publicEvent: InfographicGeometryChangeEvent = {
          target: payload.target,
          changeType: 'move', // Default to move, could be enhanced
        };
        this.emitter.emit('geometryChange', publicEvent);

        // Call callback prop if provided
        const { onGeometryChange } = this.options as InfographicOptions;
        if (onGeometryChange) {
          onGeometryChange(publicEvent);
        }
      },
    );
  }

  destroy() {
    this.editor?.destroy();
    this.node?.remove();
    this.node = null;
    this.rendered = false;
    this.emitter.emit('destroyed');
    this.emitter.removeAllListeners();
  }
}

type SyntaxParseFeedback = {
  options: Partial<InfographicOptions>;
  errors: SyntaxError[];
  warnings: SyntaxError[];
};

function parseSyntaxOptions(
  input: string | Partial<InfographicOptions>,
): SyntaxParseFeedback {
  if (typeof input === 'string') {
    const { options, errors, warnings } = parseSyntax(input);
    return { options, errors, warnings };
  }

  return {
    options: cloneOptions(input),
    errors: [],
    warnings: [],
  };
}
