// ---------- midi-devices/scale: the Scale device, a MIDI insert mapping notes from one key into the key chosen (its entry) ----------
// Its parts:
//   - scale-device.ts: the device, a Receiver around the one it plays into;
//   - steps.ts: how far a pitch moves from one key into another, by its step.
export { keySpec, ScaleDevice, type ScaleDeviceSetup } from './scale-device.ts';
