import type { EditBarContext, EditBarRenderer } from './types';

/**
 * Type definition for a React-like createElement function.
 */
type CreateElement = (
  type: any,
  props: Record<string, any> | null,
  ...children: any[]
) => any;

/**
 * Type definition for a React DOM root.
 */
interface ReactRoot {
  render(element: any): void;
  unmount(): void;
}

/**
 * Type definition for the ReactDOM client module.
 */
interface ReactDOMClient {
  createRoot(container: Element | DocumentFragment): ReactRoot;
}

/**
 * Type definition for a React-like module.
 */
interface ReactLike {
  createElement: CreateElement;
}

/**
 * Type definition for a React component (function or class).
 */
type ComponentType<P = any> = ((props: P) => any) | (new (props: P) => any);

/**
 * Extended HTMLElement with cleanup function for React unmounting.
 */
interface CleanableHTMLElement extends HTMLElement {
  __editBarCleanup?: () => void;
}

/**
 * Creates an EditBar renderer from a React component.
 *
 * This adapter allows you to use React components (including shadcn/ui components)
 * as custom edit bar content. The React module must be provided by the user to avoid
 * bundling React with the library.
 *
 * @param Component - React component that receives EditBarContext as props
 * @param React - The React module (must have createElement)
 * @param ReactDOM - The react-dom/client module (must have createRoot)
 * @returns An EditBarRenderer function compatible with EditBarOptions.render
 *
 * @example
 * ```tsx
 * import React from 'react';
 * import * as ReactDOM from 'react-dom/client';
 * import { createReactEditBar, EditBarContext } from '@antv/infographic';
 * import { Button } from '@/components/ui/button';
 *
 * function CustomToolbar({ selection, commands }: EditBarContext) {
 *   const handleBold = () => {
 *     commands.executeBatch(
 *       selection.map(el =>
 *         commands.updateElement(el, { attributes: { 'font-weight': 'bold' } })
 *       )
 *     );
 *   };
 *
 *   return (
 *     <div className="flex gap-2 p-2">
 *       <Button onClick={handleBold}>Bold</Button>
 *     </div>
 *   );
 * }
 *
 * new EditBar({
 *   render: createReactEditBar(CustomToolbar, React, ReactDOM),
 * });
 * ```
 */
export function createReactEditBar<P extends EditBarContext>(
  Component: ComponentType<P>,
  React: ReactLike,
  ReactDOM: ReactDOMClient,
): EditBarRenderer {
  return (context: EditBarContext): HTMLElement | null => {
    const container = document.createElement('div') as CleanableHTMLElement;
    // Use display: contents so the container doesn't affect flex layout
    container.style.display = 'contents';

    const root = ReactDOM.createRoot(container);

    // Render the React component with context as props
    root.render(React.createElement(Component, context as P));

    // Store cleanup function for when the edit bar is destroyed or re-rendered
    container.__editBarCleanup = () => {
      root.unmount();
    };

    return container;
  };
}

/**
 * Cleans up a React-rendered edit bar element.
 * Call this before removing or replacing the element to properly unmount React.
 *
 * @param element - The element that was returned by a React edit bar renderer
 */
export function cleanupReactEditBar(element: HTMLElement): void {
  const cleanable = element as CleanableHTMLElement;
  if (cleanable.__editBarCleanup) {
    cleanable.__editBarCleanup();
    delete cleanable.__editBarCleanup;
  }
}
