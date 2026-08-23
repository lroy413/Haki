import type { ComponentType } from 'react';
import { Switch, type SwitchProps } from 'react-native';
import { useHaki } from '../state/HakiProvider';

/**
 * A switch that is the same colour everywhere.
 *
 * React Native Web ignores `thumbColor` once a switch is on and reads
 * `activeThumbColor` instead, falling back to a Material teal that belongs to
 * no palette in this app. React Native core has no such prop, so both have to
 * be passed — and that is the whole reason this file exists rather than a bare
 * `Switch` at each call site.
 */
const PlatformSwitch = Switch as ComponentType<SwitchProps & { activeThumbColor?: string }>;

export function Toggle({ tint, ...props }: SwitchProps & { tint?: string }) {
  const { palette } = useHaki();
  const on = tint ?? palette.violet;
  return (
    <PlatformSwitch
      trackColor={{ true: on, false: palette.line }}
      thumbColor={palette.ink}
      activeThumbColor={palette.ink}
      ios_backgroundColor={palette.line}
      {...props}
    />
  );
}
