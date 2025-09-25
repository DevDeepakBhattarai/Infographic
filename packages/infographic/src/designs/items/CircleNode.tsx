/** @jsxImportSource @antv/infographic-jsx */
import type { ComponentType } from '@antv/infographic-jsx';
import { Defs, Ellipse, Group } from '@antv/infographic-jsx';
import { ItemLabel } from '../components';
import { registerItem } from './registry';
import type { BaseItemProps } from './types';
import { getItemProps } from './utils';

export interface CircleNodeProps extends BaseItemProps {
  width?: number;
  height?: number;
}

export const CircleNode: ComponentType<CircleNodeProps> = (props) => {
  const [
    {
      indexes,
      datum,
      themeColors,
      positionH = 'normal',
      width = 200,
      height = width,
    },
    restProps,
  ] = getItemProps(props, ['width', 'height']);
  const size = Math.min(width, height);
  const innerCircleSize = size * 0.7;
  const innerCircleOffset = (size - innerCircleSize) / 2;
  const labelSize = (innerCircleSize * Math.sqrt(2)) / 2;
  const labelOffset = (size - labelSize) / 2;

  const gradientFillId = `${themeColors.colorPrimary}-${positionH}`;
  const gradientDirection =
    positionH === 'flipped'
      ? { x1: '0%', y1: '0%', x2: '100%', y2: '0%' }
      : { x1: '100%', y1: '0%', x2: '0%', y2: '0%' };
  return (
    <Group {...restProps}>
      <Defs>
        <linearGradient id={gradientFillId} {...gradientDirection}>
          <stop offset="0%" stopColor={themeColors.colorPrimary} />
          <stop offset="100%" stopColor={themeColors.colorPrimaryBg} />
        </linearGradient>
      </Defs>
      <Ellipse width={size} height={size} fill={`url(#${gradientFillId})`} />
      <Ellipse
        x={innerCircleOffset}
        y={innerCircleOffset}
        width={innerCircleSize}
        height={innerCircleSize}
        fill="none"
        stroke={themeColors.colorBg}
      />
      <ItemLabel
        indexes={indexes}
        x={labelOffset}
        y={labelOffset}
        width={labelSize}
        height={labelSize}
        alignHorizontal="center"
        alignVertical="center"
        fill={themeColors.colorPrimary}
      >
        {datum.label}
      </ItemLabel>
    </Group>
  );
};

registerItem('circle-node', { component: CircleNode });
