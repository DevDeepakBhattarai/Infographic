import { COMPONENT_ROLE } from '../../../constants';
import { getCombinedBounds } from '../../../jsx';
import { IconElement, TextElement } from '../../../types';
import {
  getCommonAttrs,
  getIconAttrs,
  getTextElementProps,
  isEditableText,
  isGeometryElement,
  isIconElement,
  setElementRole,
} from '../../../utils';
import type {
  IPlugin,
  PluginInitOptions,
  Selection,
  SelectionChangePayload,
} from '../../types';
import { Plugin } from '../base';
import { createCommandHelpers } from './command-helpers';
import {
  ElementAlign,
  FontAlign,
  FontColor,
  FontFamily,
  FontSize,
  IconColor,
} from './edit-items';
import { cleanupReactEditBar } from './react-adapter';
import type {
  CustomEditItem,
  EditBarContext,
  EditBarOptions,
  SelectionType,
} from './types';

type EditItem = HTMLElement;

export class EditBar extends Plugin implements IPlugin {
  name = 'edit-bar';
  private container?: HTMLDivElement;
  private selection: Selection = [];

  constructor(private options?: EditBarOptions) {
    super();
  }

  init(options: PluginInitOptions) {
    super.init(options);
    const { emitter } = options;
    emitter.on('selection:change', this.handleSelectionChanged);
    emitter.on('selection:geometrychange', this.handleGeometryChanged);
    emitter.on('history:change', this.handleHistoryChanged);
  }

  destroy() {
    const { emitter } = this;
    emitter.off('selection:change', this.handleSelectionChanged);
    emitter.off('selection:geometrychange', this.handleGeometryChanged);
    emitter.off('history:change', this.handleHistoryChanged);
    this.container?.remove();
  }

  private handleSelectionChanged = ({ next }: SelectionChangePayload) => {
    this.selection = next;

    // Apply filter if provided
    if (this.options?.filter && !this.options.filter(next)) {
      if (this.container) hideContainer(this.container);
      return;
    }

    if (next.length === 0) {
      if (this.container) hideContainer(this.container);
      return;
    }

    // Build context for custom rendering
    const context = this.buildContext(next);

    // Use custom render if provided
    if (this.options?.render) {
      const customContent = this.options.render(context);
      if (!customContent) {
        if (this.container) hideContainer(this.container);
        return;
      }
      const container = this.getOrCreateEditBar();
      // Cleanup previous React content if any
      cleanupContainerItems(container);
      setContainerItems(container, [customContent]);
      this.placeEditBar(container, next);
      showContainer(container);
      return;
    }

    // Otherwise use item-based approach
    const container = this.getOrCreateEditBar();
    const items = this.getEditItems(next, context);

    if (items.length === 0) {
      hideContainer(container);
      return;
    }

    cleanupContainerItems(container);
    setContainerItems(container, items);

    this.placeEditBar(container, next);
    showContainer(container);
  };

  private handleGeometryChanged = ({
    target,
  }: {
    type: 'selection:geometrychange';
    target: Selection[number];
  }) => {
    if (this.selection.indexOf(target) === -1 || !this.container) return;
    this.placeEditBar(this.container, this.selection);
    showContainer(this.container);
  };

  private handleHistoryChanged = () => {
    if (!this.container || this.selection.length === 0) return;
    this.placeEditBar(this.container, this.selection);
    showContainer(this.container);
  };

  /**
   * Build context object for custom edit bar items and renderers.
   */
  private buildContext(selection: Selection): EditBarContext {
    const attrs = this.getSelectionAttributes(selection);
    return {
      selection,
      attributes: attrs,
      commander: this.commander,
      state: this.state,
      commands: createCommandHelpers(this.commander),
    };
  }

  /**
   * Get merged attributes from the current selection.
   */
  private getSelectionAttributes(selection: Selection): Record<string, any> {
    if (selection.length === 0) return {};

    const selectionType = this.getSelectionType(selection);

    if (selectionType === 'text') {
      if (selection.length === 1) {
        return getTextElementProps(selection[0] as TextElement).attributes || {};
      }
      return getCommonAttrs(
        selection.map(
          (text) => getTextElementProps(text as TextElement).attributes || {},
        ),
      );
    }

    if (selectionType === 'icon') {
      if (selection.length === 1) {
        return getIconAttrs(selection[0] as IconElement);
      }
      return getCommonAttrs(
        selection.map((icon) => getIconAttrs(icon as IconElement)),
      );
    }

    return {};
  }

  /**
   * Determine the type of the current selection.
   */
  private getSelectionType(selection: Selection): SelectionType {
    let hasText = false;
    let hasIcon = false;
    let hasGeometry = false;

    for (const item of selection) {
      if (isEditableText(item)) hasText = true;
      else if (isIconElement(item)) hasIcon = true;
      else if (isGeometryElement(item)) hasGeometry = true;

      if (hasText && hasIcon && hasGeometry) break;
    }

    if (hasText && !hasIcon && !hasGeometry) return 'text';
    if (!hasText && hasIcon && !hasGeometry) return 'icon';
    if (!hasText && !hasIcon && hasGeometry) return 'geometry';
    return 'mixed';
  }

  /**
   * Render custom items from factory functions.
   */
  private renderCustomItems(
    factories: CustomEditItem[],
    context: EditBarContext,
  ): HTMLElement[] {
    return factories
      .map((factory) => factory(context))
      .filter((item): item is HTMLElement => item !== null);
  }

  protected getEditItems(
    selection: Selection,
    context?: EditBarContext,
  ): EditItem[] {
    const { items: itemConfig, includeDefaults = true } = this.options || {};
    const selectionType = this.getSelectionType(selection);

    // Build context if not provided
    const ctx = context || this.buildContext(selection);

    let items: EditItem[] = [];

    // Add prepend items
    if (itemConfig?.prepend) {
      items.push(...this.renderCustomItems(itemConfig.prepend, ctx));
    }

    // Add default items if enabled
    if (includeDefaults) {
      items.push(...this.getDefaultItems(selection, selectionType));
    }

    // Add type-specific custom items
    const typeItems = itemConfig?.[selectionType];
    if (typeItems) {
      items.push(...this.renderCustomItems(typeItems, ctx));
    }

    // Add append items
    if (itemConfig?.append) {
      items.push(...this.renderCustomItems(itemConfig.append, ctx));
    }

    return items.filter(Boolean);
  }

  /**
   * Get default edit items based on selection type.
   */
  private getDefaultItems(
    selection: Selection,
    selectionType: SelectionType,
  ): EditItem[] {
    switch (selectionType) {
      case 'text':
        if (selection.length === 1) {
          return this.getTextEditItems(selection[0] as TextElement);
        }
        return this.getTextCollectionEditItems(selection as TextElement[]);

      case 'icon':
        if (selection.length === 1) {
          return this.getIconEditItems(selection);
        }
        return this.getIconCollectionEditItems(selection);

      case 'geometry':
        if (selection.length === 1) {
          return this.getGeometryEditItems(selection);
        }
        return this.getGeometryCollectionEditItems(selection);

      case 'mixed':
      default:
        return this.getElementCollectionEditItems(selection);
    }
  }

  protected getOrCreateEditBar() {
    if (this.container) return this.container;

    const { style, className } = this.options || {};
    const container = document.createElement('div');
    Object.assign(container.style, {
      visibility: 'hidden',
      position: 'absolute',
      left: '0',
      top: '0',
      display: 'flex',
      flexFlow: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      height: '40px',
      minWidth: '40px',
      minHeight: '40px',
      borderRadius: '8px',
      padding: '0 4px',
      backgroundColor: '#fff',
      border: '1px solid rgba(239, 240, 240, 0.9)',
      zIndex: '9999',
      boxShadow:
        'rgba(0, 0, 0, 0.08) 0px 1px 2px -2px, rgba(0, 0, 0, 0.04) 0px 2px 6px, rgba(0, 0, 0, 0.02) 0px 4px 8px 1px',
      ...style,
    } satisfies Partial<CSSStyleDeclaration>);
    if (className) {
      container.classList.add(className);
    }

    setElementRole(container, COMPONENT_ROLE);

    this.container = container;

    const { getContainer } = this.options || {};
    const resolvedContainer =
      typeof getContainer === 'function' ? getContainer() : getContainer;
    const containerParent = resolvedContainer ?? document.body;

    containerParent?.appendChild(container);

    return container;
  }

  protected getTextEditItems(text: TextElement): EditItem[] {
    const { attributes = {} } = getTextElementProps(text);
    return [FontColor, FontSize, FontAlign, FontFamily].map((item) =>
      item([text], attributes, this.commander),
    );
  }

  protected getTextCollectionEditItems(selection: TextElement[]): EditItem[] {
    const attrs = getCommonAttrs(
      selection.map((text) => getTextElementProps(text).attributes || {}),
    );
    const items = [FontColor, FontSize, FontAlign, FontFamily].map((item) =>
      item(selection, attrs, this.commander),
    );
    const commonItems = this.getElementCollectionEditItems(selection);
    return [...items, ...commonItems];
  }

  protected getIconEditItems(selection: Selection): EditItem[] {
    const attrs = getIconAttrs(selection[0] as IconElement);
    return [IconColor].map((item) => item(selection, attrs, this.commander));
  }
  protected getIconCollectionEditItems(selection: Selection): EditItem[] {
    const attrs = getCommonAttrs(
      selection.map((icon) => getIconAttrs(icon as IconElement)),
    );
    return [IconColor].map((item) => item(selection, attrs, this.commander));
  }

  protected getGeometryEditItems(_selection: Selection): EditItem[] {
    return [];
  }

  protected getGeometryCollectionEditItems(selection: Selection): EditItem[] {
    const commonItems = this.getElementCollectionEditItems(selection);
    return [...commonItems];
  }

  protected getElementCollectionEditItems(selection: Selection): EditItem[] {
    if (selection.length <= 1) return [];
    return [
      ElementAlign(selection, {}, this.commander, {
        enableDistribution: selection.length > 2,
      }),
    ];
  }

  private placeEditBar(container: HTMLDivElement, selection: Selection) {
    if (selection.length === 0) return;

    const combinedBounds = getCombinedBounds(
      selection.map((element) => element.getBoundingClientRect()),
    );

    const offsetParent =
      (container.offsetParent as HTMLElement | null) ??
      (document.documentElement as HTMLElement);
    const viewportHeight = document.documentElement.clientHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const containerRect = container.getBoundingClientRect();
    const offset = 8;
    const anchorTop = {
      x: combinedBounds.x + combinedBounds.width / 2,
      y: combinedBounds.y,
    };
    const anchorBottom = {
      x: anchorTop.x,
      y: combinedBounds.y + combinedBounds.height,
    };

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max);

    // Use viewport space, not container space, to decide whether we have enough room above.
    const spaceAbove = anchorTop.y - offset;
    const spaceBelow = viewportHeight - anchorBottom.y - offset;
    const shouldPlaceAbove =
      spaceAbove >= containerRect.height || spaceAbove >= spaceBelow;

    if (
      offsetParent === document.body ||
      offsetParent === document.documentElement
    ) {
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      let left = scrollX + anchorTop.x - containerRect.width / 2;
      left = clamp(
        left,
        scrollX,
        scrollX + Math.max(viewportWidth - containerRect.width, 0),
      );

      let top = shouldPlaceAbove
        ? scrollY + anchorTop.y - containerRect.height - offset
        : scrollY + anchorBottom.y + offset;
      top = clamp(
        top,
        scrollY,
        scrollY + Math.max(viewportHeight - containerRect.height, 0),
      );

      container.style.left = `${left}px`;
      container.style.top = `${top}px`;
      return;
    }

    const parentRect = offsetParent.getBoundingClientRect();
    let left = anchorTop.x - parentRect.left - containerRect.width / 2;
    left = clamp(left, 0, Math.max(parentRect.width - containerRect.width, 0));

    let top = shouldPlaceAbove
      ? anchorTop.y - parentRect.top - containerRect.height - offset
      : anchorBottom.y - parentRect.top + offset;
    top = clamp(top, 0, Math.max(parentRect.height - containerRect.height, 0));

    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
  }
}

function showContainer(container: HTMLDivElement) {
  container.style.visibility = 'visible';
}

function hideContainer(container: HTMLDivElement) {
  container.style.visibility = 'hidden';
}

function setContainerItems(container: HTMLDivElement, items: EditItem[]) {
  container.innerHTML = '';
  items.forEach((node) => {
    container.appendChild(node);
  });
}

/**
 * Cleanup container items, including React-rendered content.
 */
function cleanupContainerItems(container: HTMLDivElement) {
  // Cleanup React-rendered items
  Array.from(container.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      cleanupReactEditBar(child);
    }
  });
}
