import { useEffect, useState, type ComponentType } from 'react';
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

/**
 * `tint` is required, and deliberately has no default.
 *
 * It used to fall back to violet, which meant a switch dropped onto any
 * screen quietly wore 見聞色's colour — the exact way *one screen, one
 * light* gets broken. A control that cannot be mounted without naming its
 * light cannot drift.
 */
export function Toggle({
  tint,
  value,
  onValueChange,
  ...props
}: SwitchProps & { tint: string }) {
  const { palette } = useHaki();

  // The switch answers the finger. Every value it is handed comes back
  // through a settings write and a provider reload down the single sqlite
  // channel, so a switch that waits for its prop reads as stuck. It shows
  // the tapped position immediately and reconciles when the stored value
  // arrives — the same optimism TaskRow holds, made the default for every
  // switch so no screen can forget it.
  const [shown, setShown] = useState(value);
  useEffect(() => {
    setShown(value);
  }, [value]);

  return (
    <PlatformSwitch
      trackColor={{ true: tint, false: palette.line }}
      thumbColor={palette.ink}
      activeThumbColor={palette.ink}
      ios_backgroundColor={palette.line}
      value={shown}
      onValueChange={(next) => {
        setShown(next);
        onValueChange?.(next);
      }}
      {...props}
    />
  );
}
