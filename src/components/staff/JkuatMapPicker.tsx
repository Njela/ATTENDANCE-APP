import React from 'react';
import { Platform } from 'react-native';

export type JkuatMapPickerProps = {
  latitude: number;
  longitude: number;
  radiusM: number;
  onChange: (lat: number, lng: number) => void;
  /** Native: remount map when the edit sheet context changes. */
  layoutKey?: string;
};

/* Metro resolves native vs web without static import cycles. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NativePicker = require('./JkuatMapPicker.native').JkuatMapPicker as React.ComponentType<JkuatMapPickerProps>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WebPicker = require('./JkuatMapPicker.web').JkuatMapPicker as React.ComponentType<JkuatMapPickerProps>;

export function JkuatMapPicker(props: JkuatMapPickerProps) {
  const Cmp = Platform.OS === 'web' ? WebPicker : NativePicker;
  return <Cmp {...props} />;
}
