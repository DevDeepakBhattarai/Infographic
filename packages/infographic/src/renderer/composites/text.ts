import type { Bounds } from '@antv/infographic-jsx';
import { get, kebabCase } from 'lodash-es';
import { ParsedInfographicOptions } from '../../options';
import type { DynamicAttributes } from '../../themes';
import type { TextAttributes } from '../../types';
import {
  createTextElement,
  getAttributes,
  getDatumByIndexes,
  getItemIndexes,
  setAttributes,
} from '../../utils';
import { parseDynamicAttributes } from '../utils';

export function renderText(
  node: SVGElement,
  text: string,
  attrs: DynamicAttributes<TextAttributes> = {},
) {
  if (!text) return null;

  let x = 0;
  let y = 0;
  let width = 0;
  let height = 0;
  let textContent = '';
  let textElement: SVGTextElement | null = null;

  const normalizer =
    (defaultValue: number = 0) =>
    (value: string | null) =>
      value ? parseFloat(value) : defaultValue;
  const normalizePos = normalizer();
  const normalizeWidth = normalizer(800);
  const normalizeHeight = normalizer(50);

  if (node.nodeName === 'text') {
    x = normalizePos(node.getAttribute('x'));
    y = normalizePos(node.getAttribute('y'));
    width = normalizeWidth(node.getAttribute('width'));
    height = normalizeHeight(node.getAttribute('height'));
    textContent = text;
    textElement = node as SVGTextElement;
  } else {
    const bounds = node.querySelector<SVGRectElement>(`#${node.id}-bounds`);
    const character = node.querySelector<SVGTextElement>(`#${node.id}-text`);

    if (character) textElement = character;

    const target = bounds || character || node;

    x = normalizePos(target.getAttribute('x'));
    y = normalizePos(target.getAttribute('y'));
    width = normalizeWidth(target.getAttribute('width'));
    height = normalizeHeight(target.getAttribute('height'));
    textContent = text;
  }

  if (!textElement) return null;

  const staticAttrs = parseDynamicAttributes(textElement, attrs);

  setAttributes(textElement, staticAttrs);

  const renderedText = layoutText(textContent, textElement, {
    x,
    y,
    width,
    height,
  });

  for (const key in textElement.dataset) {
    renderedText.setAttribute(
      `data-${kebabCase(key)}`,
      textElement.dataset[key]!,
    );
  }

  renderedText.setAttribute('id', node.getAttribute('id')!);
  return renderedText;
}

export function renderItemText(
  type: 'label' | 'desc' | 'value',
  node: SVGElement,
  options: ParsedInfographicOptions,
  color?: string,
) {
  const textShape =
    node.nodeName === 'text'
      ? node
      : node.querySelector<SVGTextElement>(`#${node.id}-text`);

  if (!textShape) return null;
  const { data, themeConfig, design } = options;
  const coloredArea = design.item?.options?.coloredArea || [];
  const indexes = getItemIndexes(node.id);
  const text = String(get(getDatumByIndexes(data, indexes), type, ''));
  const attrs = Object.assign(
    {},
    themeConfig.base?.text,
    themeConfig.item?.[type],
  );
  const assignPaletteColor = coloredArea.includes(type) ? color : undefined;

  const staticAttrs = parseDynamicAttributes(
    textShape,
    attrs,
    assignPaletteColor,
  );
  return renderText(node, node.textContent || text, staticAttrs);
}

export function renderStaticText(
  text: SVGTextElement,
  options: ParsedInfographicOptions,
) {
  setAttributes(text, options.themeConfig.base?.text || {});
  text.style.userSelect = 'none';
  text.style.pointerEvents = 'none';
}

function layoutText(
  textContent: string,
  text: SVGTextElement,
  bounds: Bounds,
): SVGElement {
  const { x, y, width, height } = bounds;

  const attributes = getTextAttributes(text);
  Object.assign(attributes, {
    x,
    y,
    width,
    height,
    'text-alignment': get(text, 'dataset.textAlignment', 'CENTER CENTER'),
  });

  const element = createTextElement(textContent, attributes as any);
  return element;
}

function getTextAttributes(textElement: SVGTextElement) {
  const attrs: Record<string, any> = getAttributes(textElement, [
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'font-variant',
    'letter-spacing',
    'line-height',
    'fill',
    'stroke',
    'stroke-width',
    'text-anchor',
    'dominant-baseline',
  ]);

  return attrs;
}
