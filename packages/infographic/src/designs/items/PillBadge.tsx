/** @jsxImportSource @antv/infographic-jsx */
import { ComponentType, Defs, Group, Rect } from '@antv/infographic-jsx';
import { ItemDesc, ItemLabel } from '../components';
import { DropShadow, LinearGradient } from '../defs';
import { registerItem } from './registry';
import type { BaseItemProps } from './types';
import { getItemProps } from './utils';

export interface PillBadgeProps extends BaseItemProps {
  width?: number;
  pillWidth?: number;
  pillHeight?: number;
  gap?: number;
}

export const PillBadge: ComponentType<PillBadgeProps> = (props) => {
  const [
    {
      datum,
      indexes,
      width = 300,
      pillWidth = 120,
      pillHeight = 36,
      gap = 16,
      positionH = 'normal',
      themeColors,
    },
    restProps,
  ] = getItemProps(props, ['width', 'pillWidth', 'pillHeight', 'gap']);
  // Calculate pill position based on alignment
  const pillX =
    positionH === 'center'
      ? (width - pillWidth) / 2
      : positionH === 'flipped'
        ? width - pillWidth
        : 0;

  const pillY = 0;

  // Calculate content position
  const contentX = positionH === 'center' ? 0 : positionH === 'flipped' ? 0 : 0;

  const contentY = pillHeight + gap;
  const contentWidth = width;

  const dropShadowId = `drop-shadow-${themeColors.colorPrimary}`;
  const linearGradientId = `linear-gradient-white-top-bottom`;

  return (
    <Group {...restProps}>
      <Defs>
        <DropShadow id={dropShadowId} color={themeColors.colorPrimary} />
        <LinearGradient
          id={linearGradientId}
          startColor="#fff"
          stopColor="#ffffff33"
          direction="top-bottom"
        />
      </Defs>
      {/* Pill-shaped badge */}
      <Rect
        x={pillX}
        y={pillY}
        width={pillWidth}
        height={pillHeight}
        fill={themeColors.colorPrimaryBg}
        stroke={themeColors.colorPrimary}
        rx={pillHeight / 2}
        ry={pillHeight / 2}
        filter={`url(#${dropShadowId})`}
      />
      <Rect
        x={pillX}
        y={pillY}
        width={pillWidth}
        height={pillHeight}
        fill={`url(#${linearGradientId})`}
        opacity={themeColors.isDarkMode ? 0.4 : 0.7}
        rx={pillHeight / 2}
        ry={pillHeight / 2}
      />

      {/* Pill label */}
      <ItemLabel
        indexes={indexes}
        x={pillX}
        y={pillY}
        width={pillWidth}
        height={pillHeight}
        alignHorizontal="center"
        alignVertical="center"
        fontSize={14}
        fontWeight="500"
        fill={themeColors.colorText}
      >
        {datum.label}
      </ItemLabel>

      {/* Description below */}
      {datum.desc && (
        <ItemDesc
          indexes={indexes}
          x={contentX}
          y={contentY}
          width={contentWidth}
          alignHorizontal={
            positionH === 'center'
              ? 'center'
              : positionH === 'flipped'
                ? 'right'
                : 'left'
          }
          fontSize={14}
          fill={themeColors.colorText}
          lineNumber={2}
          wordWrap={true}
        >
          {datum.desc}
        </ItemDesc>
      )}
    </Group>
  );
};

registerItem('pill-badge', { component: PillBadge });
