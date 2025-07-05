import * as lamejs from '@breezystack/lamejs'

/**
 * 音频压缩配置接口
 */
export interface AudioCompressionConfig {
  /** 声道数：1为单声道，2为立体声 */
  channels?: number
  /** 采样率 (Hz) */
  sampleRate?: number
  /** MP3比特率 (kbps) */
  bitRate?: number
}

/**
 * 默认音频压缩配置
 */
const DEFAULT_CONFIG: Required<AudioCompressionConfig> = {
  channels: 1, // 单声道可以减小文件大小
  sampleRate: 22050, // 降低采样率以减小文件大小
  bitRate: 64 // 较低的比特率以减小文件大小
}

/**
 * 将WAV音频数据转换为压缩的MP3格式
 * @param audioBuffer - 音频缓冲区数据
 * @param config - 压缩配置
 * @returns 压缩后的MP3 Blob
 */
export async function compressAudioToMp3(audioBuffer: ArrayBuffer, config: AudioCompressionConfig = {}): Promise<Blob> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  try {
    // 创建AudioContext来处理音频数据
    const audioContext = new AudioContext()
    const decodedAudio = await audioContext.decodeAudioData(audioBuffer.slice())

    // 重采样到目标采样率
    const resampledBuffer = await resampleAudio(decodedAudio, finalConfig.sampleRate)

    // 转换为Int16Array格式
    const samples = convertToInt16Array(resampledBuffer, finalConfig.channels)

    // 使用lamejs进行MP3编码
    const mp3Data = encodeToMp3(samples, finalConfig)

    // 创建MP3 Blob
    const blob = new Blob(mp3Data, { type: 'audio/mp3' })

    // 清理AudioContext
    await audioContext.close()

    return blob
  } catch (error) {
    console.error('音频压缩失败:', error)
    throw new Error('音频压缩失败')
  }
}

/**
 * 重采样音频到目标采样率
 */
async function resampleAudio(audioBuffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
  if (audioBuffer.sampleRate === targetSampleRate) {
    return audioBuffer
  }

  const audioContext = new AudioContext({ sampleRate: targetSampleRate })
  const resampledBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    Math.floor((audioBuffer.length * targetSampleRate) / audioBuffer.sampleRate),
    targetSampleRate
  )

  // 简单的线性插值重采样
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const inputData = audioBuffer.getChannelData(channel)
    const outputData = resampledBuffer.getChannelData(channel)
    const ratio = inputData.length / outputData.length

    for (let i = 0; i < outputData.length; i++) {
      const index = i * ratio
      const indexFloor = Math.floor(index)
      const indexCeil = Math.min(indexFloor + 1, inputData.length - 1)
      const fraction = index - indexFloor

      outputData[i] = inputData[indexFloor] * (1 - fraction) + inputData[indexCeil] * fraction
    }
  }

  await audioContext.close()
  return resampledBuffer
}

/**
 * 将AudioBuffer转换为Int16Array格式
 */
function convertToInt16Array(audioBuffer: AudioBuffer, targetChannels: number): Int16Array {
  const length = audioBuffer.length
  const samples = new Int16Array(length * targetChannels)

  if (targetChannels === 1) {
    // 转换为单声道
    const channelData = audioBuffer.numberOfChannels > 1 ? mixToMono(audioBuffer) : audioBuffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      samples[i] = Math.max(-1, Math.min(1, channelData[i])) * 0x7fff
    }
  } else {
    // 保持立体声
    const leftChannel = audioBuffer.getChannelData(0)
    const rightChannel = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel

    for (let i = 0; i < length; i++) {
      samples[i * 2] = Math.max(-1, Math.min(1, leftChannel[i])) * 0x7fff
      samples[i * 2 + 1] = Math.max(-1, Math.min(1, rightChannel[i])) * 0x7fff
    }
  }

  return samples
}

/**
 * 将多声道音频混合为单声道
 */
function mixToMono(audioBuffer: AudioBuffer): Float32Array {
  const length = audioBuffer.length
  const monoData = new Float32Array(length)
  const numberOfChannels = audioBuffer.numberOfChannels

  for (let i = 0; i < length; i++) {
    let sum = 0
    for (let channel = 0; channel < numberOfChannels; channel++) {
      sum += audioBuffer.getChannelData(channel)[i]
    }
    monoData[i] = sum / numberOfChannels
  }

  return monoData
}

/**
 * 使用lamejs将音频数据编码为MP3
 */
function encodeToMp3(samples: Int16Array, config: Required<AudioCompressionConfig>): Int8Array[] {
  const mp3encoder = new lamejs.Mp3Encoder(config.channels, config.sampleRate, config.bitRate)
  const mp3Data: Int8Array[] = []
  const sampleBlockSize = 1152 // lamejs推荐的块大小

  // 分块编码
  for (let i = 0; i < samples.length; i += sampleBlockSize * config.channels) {
    let sampleChunk: Int16Array

    if (config.channels === 1) {
      // 单声道
      sampleChunk = samples.subarray(i, i + sampleBlockSize)
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk)
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf as any)
      }
    } else {
      // 立体声
      const leftChunk = new Int16Array(sampleBlockSize)
      const rightChunk = new Int16Array(sampleBlockSize)

      for (let j = 0; j < sampleBlockSize && i + j * 2 + 1 < samples.length; j++) {
        leftChunk[j] = samples[i + j * 2]
        rightChunk[j] = samples[i + j * 2 + 1]
      }

      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk)
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf as any)
      }
    }
  }

  // 完成编码
  const mp3buf = mp3encoder.flush()
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf as any)
  }

  return mp3Data
}

/**
 * 获取音频文件的基本信息
 */
export async function getAudioInfo(audioBuffer: ArrayBuffer): Promise<{
  duration: number
  sampleRate: number
  channels: number
  size: number
}> {
  const audioContext = new AudioContext()
  const decodedAudio = await audioContext.decodeAudioData(audioBuffer.slice())

  const info = {
    duration: decodedAudio.duration,
    sampleRate: decodedAudio.sampleRate,
    channels: decodedAudio.numberOfChannels,
    size: audioBuffer.byteLength
  }

  await audioContext.close()
  return info
}

/**
 * 计算压缩比
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  return Math.round((1 - compressedSize / originalSize) * 100)
}
