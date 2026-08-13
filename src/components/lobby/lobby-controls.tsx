'use client';

import { CopyInviteButton } from '@/components/lobby/copy-invite-button';
import { DevicePicker } from '@/components/lobby/device-picker';
import { DeviceToggle } from '@/components/lobby/device-toggle';
import { DisplayNameField } from '@/components/lobby/display-name-field';
import type { MediaPreviewController } from '@/hooks/use-media-preview';

interface LobbyControlsProps {
  code: string;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  preview: MediaPreviewController;
}

/**
 * Everything the lobby lets you set before joining.
 *
 * No Join control: minting a token and connecting are both the next feature, and
 * a primary action that does nothing when pressed reads as broken. The layout
 * leaves the slot for it at the end.
 */
export function LobbyControls({
  code,
  displayName,
  onDisplayNameChange,
  preview,
}: LobbyControlsProps) {
  const { camera, microphone, devices } = preview;

  return (
    <div className="flex flex-col gap-4">
      {/* flex-none on every target: a control row that fits by shrinking its
          buttons below 44px has been broken quietly, not made responsive. */}
      <div className="flex flex-wrap gap-2">
        <DeviceToggle
          label="Camera"
          on={camera.enabled}
          busy={camera.busy}
          onChange={preview.setCameraEnabled}
        />
        <DeviceToggle
          label="Mic"
          on={microphone.enabled}
          busy={microphone.busy}
          // Your own muted microphone is one of the two sanctioned uses of red.
          signalWhenOff
          onChange={preview.setMicrophoneEnabled}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <DevicePicker
          label="Camera"
          devices={devices.cameras}
          selectedId={camera.deviceId}
          disabled={camera.busy}
          onSelect={preview.selectCamera}
          className="sm:flex-1"
        />
        <DevicePicker
          label="Microphone"
          devices={devices.microphones}
          selectedId={microphone.deviceId}
          disabled={microphone.busy}
          onSelect={preview.selectMicrophone}
          className="sm:flex-1"
        />
      </div>

      <DisplayNameField value={displayName} onChange={onDisplayNameChange} />

      <CopyInviteButton code={code} />
    </div>
  );
}
