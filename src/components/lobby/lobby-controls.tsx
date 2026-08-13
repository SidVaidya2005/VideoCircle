'use client';

import { CopyInviteButton } from '@/components/lobby/copy-invite-button';
import { DevicePicker } from '@/components/lobby/device-picker';
import { DeviceToggle } from '@/components/lobby/device-toggle';
import { DisplayNameField } from '@/components/lobby/display-name-field';
import { Button } from '@/components/ui/button';
import type { MediaPreviewController } from '@/hooks/use-media-preview';

interface LobbyControlsProps {
  code: string;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  preview: MediaPreviewController;
  joining: boolean;
  onJoin: () => void;
}

/** Everything the lobby lets you set, and the control that acts on it. */
export function LobbyControls({
  code,
  displayName,
  onDisplayNameChange,
  preview,
  joining,
  onJoin,
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

      {/* Disabled on an empty name only — never on a failed device. Joining with
          nothing working is the whole point of the states feature 07 built, and
          the room connects view-only. The name rule matches the min(1) the token
          route enforces, so the button cannot offer something the server refuses. */}
      <Button type="button" onClick={onJoin} disabled={joining || displayName.trim().length === 0}>
        {joining ? 'Joining' : 'Join now'}
      </Button>

      <CopyInviteButton code={code} />
    </div>
  );
}
