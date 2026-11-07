/**
 * Optional fake camera and microphone for automated tests on machines without media devices.
 * Enabled with localStorage.__web_fake_media = '1': getUserMedia then returns a tone and an
 * animated canvas instead of real devices.
 */
const FAKE_MEDIA_KEY = '__web_fake_media'

const enabled = () => {
  try {
    return localStorage.getItem(FAKE_MEDIA_KEY) === '1'
  } catch {
    return false
  }
}

function fakeAudioTrack() {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const dest = ctx.createMediaStreamDestination()
  osc.frequency.value = 440
  gain.gain.value = 0.05
  osc.connect(gain).connect(dest)
  osc.start()
  const track = dest.stream.getAudioTracks()[0]
  track.addEventListener('ended', () => ctx.close())
  return track
}

function fakeVideoTrack() {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 240
  const g = canvas.getContext('2d')!
  let frame = 0
  const draw = () => {
    frame++
    g.fillStyle = `hsl(${(frame * 4) % 360}, 60%, 45%)`
    g.fillRect(0, 0, canvas.width, canvas.height)
    g.fillStyle = '#fff'
    g.font = '28px sans-serif'
    g.fillText(`fake camera ${frame}`, 30, 130)
  }
  draw()
  // timers keep drawing in background tabs, where requestAnimationFrame stops
  const timer = setInterval(draw, 100)
  const track = canvas.captureStream(10).getVideoTracks()[0]
  const stop = track.stop.bind(track)
  track.stop = () => {
    clearInterval(timer)
    stop()
  }
  track.addEventListener('ended', () => clearInterval(timer))
  return track
}

export function installFakeMedia() {
  const devices = navigator.mediaDevices
  if (!devices) return
  const realGetUserMedia = devices.getUserMedia.bind(devices)
  const realEnumerate = devices.enumerateDevices.bind(devices)
  devices.getUserMedia = (constraints?: MediaStreamConstraints) => {
    if (!enabled()) return realGetUserMedia(constraints)
    const tracks: MediaStreamTrack[] = []
    if (constraints?.audio) tracks.push(fakeAudioTrack())
    if (constraints?.video) tracks.push(fakeVideoTrack())
    return Promise.resolve(new MediaStream(tracks))
  }
  devices.enumerateDevices = () => {
    if (!enabled()) return realEnumerate()
    const device = (kind: MediaDeviceKind, deviceId: string, label: string) =>
      ({
        kind,
        deviceId,
        groupId: 'fake',
        label,
        toJSON: () => ({ kind, deviceId, groupId: 'fake', label })
      }) as MediaDeviceInfo
    return Promise.resolve([
      device('audioinput', 'default', 'Fake microphone'),
      device('videoinput', 'fake-camera', 'Fake camera'),
      device('audiooutput', 'default', 'Fake speaker')
    ])
  }
}
