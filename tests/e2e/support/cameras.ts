import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Virtual front/rear lenses: only enumeration and capture are replaced. The
 * application, LiveKit track restarts, SFU and remote decoding stay real. Labels
 * deliberately say nothing about direction; facingMode is the camera's metadata.
 * This proves our wiring, not a phone browser's hardware-switching support.
 */
export async function stubPhoneCameras(page: Page, count = 2): Promise<void> {
  await page.addInitScript((cameraCount: number) => {
    const media = navigator.mediaDevices;
    const enumerate = media.enumerateDevices.bind(media);
    const target = window as unknown as {
      __cameraFailure?: boolean;
      __unavailableCamera?: string;
      __cameraDelay?: number;
    };
    media.enumerateDevices = async () => [
      ...(await enumerate()).filter((device) => device.kind !== 'videoinput'),
      ...Array.from({ length: cameraCount }, (_, index) => {
        const device = {
          deviceId: index === 0 ? 'lens-a' : 'lens-b',
          groupId: 'virtual-phone',
          kind: 'videoinput' as const,
          label: index === 0 ? 'Lens A' : 'Lens B',
        };
        return { ...device, toJSON: () => device };
      }),
    ];
    media.getUserMedia = async (constraints) => {
      function audioStream(): MediaStream {
        const context = new AudioContext();
        const source = context.createOscillator();
        const destination = context.createMediaStreamDestination();
        source.connect(destination);
        source.start();
        const audio = destination.stream.getAudioTracks()[0];
        if (audio) {
          const stop = audio.stop.bind(audio);
          let stopped = false;
          audio.stop = () => {
            if (stopped) return;
            stopped = true;
            source.stop();
            void context.close();
            stop();
          };
        }
        return destination.stream;
      }
      if (!constraints?.video) return audioStream();
      if (target.__cameraDelay) {
        await new Promise((resolve) => setTimeout(resolve, target.__cameraDelay));
      }
      if (target.__cameraFailure) {
        target.__cameraFailure = false;
        throw new DOMException('Virtual lens unavailable', 'NotReadableError');
      }

      const video = constraints.video === true ? {} : constraints.video;
      const requested = video.deviceId;
      const deviceId =
        typeof requested === 'string'
          ? requested
          : Array.isArray(requested)
            ? requested[0]
            : (requested?.exact ?? requested?.ideal);
      if (deviceId === target.__unavailableCamera && target.__unavailableCamera) {
        throw new DOMException('Virtual lens remains unavailable', 'NotReadableError');
      }
      const rear = deviceId === 'lens-b';
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not create virtual camera');
      let frame = 0;
      const paint = () => {
        context.fillStyle = rear ? '#0000ff' : '#00ff00';
        context.fillRect(0, 0, 640, 360);
        // Red stays at the left in the sent frames, whatever the local CSS does.
        context.fillStyle = '#ff0000';
        context.fillRect(0, 0, 160, 360);
        context.fillStyle = '#ffffff';
        context.font = '40px monospace';
        context.fillText(`READ ME ${frame++}`, 180, 180);
      };
      paint();
      const timer = window.setInterval(paint, 100);
      const stream = canvas.captureStream(10);
      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error('Virtual camera produced no track');
      const settings = track.getSettings.bind(track);
      track.getSettings = () => ({
        ...settings(),
        deviceId: rear ? 'lens-b' : 'lens-a',
        facingMode: rear ? 'environment' : 'user',
      });
      track.getConstraints = () => ({ deviceId: rear ? 'lens-b' : 'lens-a' });
      const stop = track.stop.bind(track);
      track.stop = () => {
        window.clearInterval(timer);
        stop();
      };
      if (constraints.audio) {
        const audio = audioStream();
        for (const audioTrack of audio.getAudioTracks()) stream.addTrack(audioTrack);
      }
      return stream;
    };
  }, count);
}

/** Assert the displayed direction, not the presence of a particular CSS class. */
export async function expectMirrored(video: Locator, mirrored: boolean): Promise<void> {
  await expect
    .poll(() =>
      video.evaluate((element) => {
        const style = getComputedStyle(element);
        const scale = style.scale === 'none' ? 1 : Number(style.scale.split(' ')[0]);
        const transform = style.transform === 'none' ? 1 : new DOMMatrixReadOnly(style.transform).a;
        return scale * transform < 0;
      }),
    )
    .toBe(mirrored);
}

/** Frames actually decoded by the receiver, before any display transform. */
export async function expectRearFrames(video: Locator): Promise<void> {
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => {
        if (element.readyState < 2) return false;
        const canvas = document.createElement('canvas');
        canvas.width = element.videoWidth;
        canvas.height = element.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) return false;
        context.drawImage(element, 0, 0);
        const left = context.getImageData(canvas.width / 8, canvas.height / 2, 1, 1).data;
        const right = context.getImageData((canvas.width * 3) / 4, canvas.height / 2, 1, 1).data;
        return (
          (left[0] ?? 0) > 180 &&
          (left[2] ?? 255) < 80 &&
          (right[2] ?? 0) > 180 &&
          (right[0] ?? 255) < 80
        );
      }),
    )
    .toBe(true);
}
