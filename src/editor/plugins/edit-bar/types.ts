import type { Element } from '../../../types';
import type {
  ElementProps,
  ICommand,
  ICommandManager,
  IStateManager,
  Selection,
} from '../../types';

/**
 * Context passed to custom edit bar components and render functions.
 * This provides everything needed to build custom toolbar buttons that can edit selected elements.
 */
export interface EditBarContext {
  /** Currently selected elements */
  selection: Selection;
  /** Merged attributes of selected elements */
  attributes: Record<string, any>;
  /** Commander for executing edit commands */
  commander: ICommandManager;
  /** State manager for reading current state */
  state: IStateManager;
  /** Helper functions for creating and executing commands */
  commands: EditBarCommandHelpers;
}

/**
 * Helper functions for creating and executing commands in custom edit bar items.
 */
export interface EditBarCommandHelpers {
  /**
   * Create a command to update an element's properties
   * @param element The element to update
   * @param props The properties to update
   */
  updateElement: (element: Element, props: Partial<ElementProps>) => ICommand;

  /**
   * Execute a single command
   * @param command The command to execute
   */
  execute: (command: ICommand) => Promise<void>;

  /**
   * Execute multiple commands as a batch
   * @param commands The commands to execute
   */
  executeBatch: (commands: ICommand[]) => Promise<void>;
}

/**
 * Factory function for creating custom edit bar items.
 * Return an HTMLElement to display, or null to skip this item.
 */
export type CustomEditItem = (context: EditBarContext) => HTMLElement | null;

/**
 * Custom render function that completely replaces the default edit bar.
 * Return an HTMLElement to display, or null to hide the bar.
 */
export type EditBarRenderer = (context: EditBarContext) => HTMLElement | null;

/**
 * Configuration for extending or replacing default edit bar items.
 */
export interface EditBarItemConfig {
  /** Custom items to show for text selection */
  text?: CustomEditItem[];
  /** Custom items to show for icon selection */
  icon?: CustomEditItem[];
  /** Custom items to show for geometry/shape selection */
  geometry?: CustomEditItem[];
  /** Custom items to show for mixed/multiple selection types */
  mixed?: CustomEditItem[];
  /** Items to prepend before default items (for all selection types) */
  prepend?: CustomEditItem[];
  /** Items to append after default items (for all selection types) */
  append?: CustomEditItem[];
}

/**
 * Extended options for the EditBar plugin.
 */
export interface EditBarOptions {
  /** Custom CSS styles for the edit bar container */
  style?: Partial<CSSStyleDeclaration>;
  /** Custom CSS class name for the edit bar container */
  className?: string;
  /** Container element or getter for positioning the edit bar */
  getContainer?: HTMLElement | (() => HTMLElement);

  /**
   * Custom render function that completely replaces the default edit bar.
   * When provided, this takes precedence over the items configuration.
   * Return null to hide the bar for certain selections.
   */
  render?: EditBarRenderer;

  /**
   * Configure which items to show in the edit bar.
   * Can extend or replace default items based on selection type.
   */
  items?: EditBarItemConfig;

  /**
   * Whether to include default items when using custom items config.
   * When true (default), custom items are added to defaults.
   * When false, only custom items are shown.
   * @default true
   */
  includeDefaults?: boolean;

  /**
   * Filter function to control which selections get an edit bar.
   * Return false to hide the bar for certain selections.
   */
  filter?: (selection: Selection) => boolean;
}

/**
 * Selection type identifier for categorizing selections.
 */
export type SelectionType = 'text' | 'icon' | 'geometry' | 'mixed';
