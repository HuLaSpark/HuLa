<template>
  <div ref="container" class="assistant-view">
    <div v-if="props.active && !isReady" class="assistant-view__placeholder">
      <n-progress
        :percentage="loadingProgress"
        :show-indicator="false"
        :height="6"
        :stroke-width="10"
        :color="'#13987f'"
        :rail-color="'#13987f30'"
        class="assistant-view__progress"
        type="line" />
      <span class="assistant-view__placeholder-text">
        {{ loadingProgress === 0 ? '开始加载模型...' : `模型加载中 ${loadingProgress}%` }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { convertFileSrc } from '@tauri-apps/api/core'
import {
  ACESFilmicToneMapping,
  AmbientLight,
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Box3,
  Clock,
  DirectionalLight,
  Group,
  Mesh,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  SRGBColorSpace
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ensureModelFile } from '@/utils/PathUtil'
import { isDesktop } from '@/utils/PlatformConstants'

const props = defineProps<{
  active: boolean
  customModel?: string | null
}>()

const emit = defineEmits<{
  (event: 'ready'): void
  (event: 'error', error: unknown): void
}>()

const container = ref<HTMLDivElement | null>(null)
const isReady = ref(false)
const loadingProgress = ref(0)

const TARGET_SIZE = 1.4
const LIFT_RATIO = 0.1
const TARGET_OFFSET_RATIO = 0.04
const CAMERA_DISTANCE_FACTOR = 2.2
const CAMERA_HEIGHT_FACTOR = 0.18
const MODEL_VERSION = '20251021'
const MODEL_FILE_NAME = `hula_${MODEL_VERSION}.glb`
const MODEL_REMOTE_URL = `https://cdn.hulaspark.com/models/hula.glb?v=${MODEL_VERSION}`

const clock = new Clock()

let renderer: WebGLRenderer | null = null
let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let model: Group | null = null
let modelWrapper: Group | null = null
let animationFrameId: number | null = null
let resizeObserver: ResizeObserver | null = null
let initialized = false
let activating = false
let defaultModelSourcePromise: Promise<string> | null = null
let currentCustomSource: string | null = null
let mixer: AnimationMixer | null = null
let activeAction: AnimationAction | null = null
let availableClips: AnimationClip[] = []

const resolveDefaultModelSource = async () => {
  if (!defaultModelSourcePromise) {
    defaultModelSourcePromise = (async () => {
      if (!isDesktop()) {
        return MODEL_REMOTE_URL
      }
      try {
        const absolutePath = await ensureModelFile(MODEL_FILE_NAME, MODEL_REMOTE_URL)
        return convertFileSrc(absolutePath)
      } catch (error) {
        console.warn('缓存 HuLa 模型失败, 回退远程资源', error)
        return MODEL_REMOTE_URL
      }
    })().catch((error) => {
      defaultModelSourcePromise = null
      throw error
    })
  }
  const url = await defaultModelSourcePromise
  return url
}

const isInvalidBounds = (size: Vector3, center: Vector3) =>
  size.lengthSq() === 0 || !Number.isFinite(center.x) || !Number.isFinite(center.y) || !Number.isFinite(center.z)

const resolveModelSource = async () => {
  if (props.customModel) {
    currentCustomSource = props.customModel
    const url = isDesktop() ? convertFileSrc(props.customModel) : props.customModel
    return url
  }
  currentCustomSource = null
  return resolveDefaultModelSource()
}

const updateRendererSize = () => {
  if (!renderer || !camera) return
  const el = container.value
  if (!el) return
  const width = el.clientWidth || el.offsetWidth || 1
  const height = el.clientHeight || el.offsetHeight || 1
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height, false)
  camera.aspect = width / height || 1
  camera.updateProjectionMatrix()
}

const startLoop = () => {
  if (!scene || !camera || !renderer) return
  if (animationFrameId !== null) return

  clock.start()
  const currentScene = scene
  const currentCamera = camera
  const currentRenderer = renderer

  const loop = () => {
    animationFrameId = requestAnimationFrame(loop)
    const delta = clock.getDelta()
    mixer?.update(delta)
    controls?.update()
    currentRenderer.render(currentScene, currentCamera)
  }

  const el = container.value
  if (el) {
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updateRendererSize()
      })
    }
    resizeObserver.observe(el)
  }
  window.addEventListener('resize', updateRendererSize, { passive: true })
  updateRendererSize()
  animationFrameId = requestAnimationFrame(loop)
}

const stopLoop = () => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  clock.stop()
  const el = container.value
  if (el && resizeObserver) {
    resizeObserver.unobserve(el)
  }
  window.removeEventListener('resize', updateRendererSize)
}

const disposeResources = () => {
  stopLoop()
  controls?.dispose()
  controls = null

  if (scene) {
    scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh
        mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose?.())
        } else {
          mesh.material?.dispose?.()
        }
      }
    })
  }

  renderer?.dispose()
  renderer = null
  if (modelWrapper && scene) {
    scene.remove(modelWrapper)
  }
  modelWrapper = null
  scene = null
  camera = null
  model = null
  mixer?.stopAllAction()
  mixer = null
  activeAction = null
  availableClips = []
  initialized = false
  isReady.value = false
  loadingProgress.value = 0
}

const adjustFraming = (scaledSize: Vector3, centerY: number) => {
  if (!camera || !controls) return
  const maxAxis = Math.max(scaledSize.x, scaledSize.y, scaledSize.z) || 1
  const targetY = centerY - scaledSize.y * TARGET_OFFSET_RATIO
  controls.target.set(0, targetY, 0)
  controls.enableDamping = true
  controls.enablePan = false
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.8
  controls.minDistance = maxAxis * 0.7
  controls.maxDistance = maxAxis * 3
  const distance = maxAxis * CAMERA_DISTANCE_FACTOR
  camera.position.set(0, targetY + distance * CAMERA_HEIGHT_FACTOR, distance)
  camera.near = Math.max(distance / 100, 0.1)
  camera.far = distance * 10
  camera.lookAt(controls.target)
  camera.updateProjectionMatrix()
  controls.update()
}

const loadModel = async () => {
  if (!scene) {
    throw new Error('场景尚未初始化')
  }
  loadingProgress.value = 0
  isReady.value = false
  if (!modelWrapper) {
    modelWrapper = new Group()
    scene.add(modelWrapper)
  }
  if (mixer) {
    mixer.stopAllAction()
    mixer = null
    activeAction = null
  }
  availableClips = []
  const modelSource = await resolveModelSource()
  const loader = new GLTFLoader()
  const result = await new Promise<{ scene: Group; extensions?: string[]; animations: AnimationClip[] }>(
    (resolve, reject) => {
      loader.load(
        modelSource,
        (gltf) => {
          resolve({
            scene: gltf.scene,
            extensions: gltf.parser.json?.extensionsUsed,
            animations: gltf.animations || []
          })
        },
        (event) => {
          const total = event.total || event.loaded
          if (total) {
            const percent = Math.round((event.loaded / total) * 100)
            loadingProgress.value = Math.max(loadingProgress.value, Math.min(percent, 99))
          }
        },
        (error) => {
          loadingProgress.value = 0
          console.error('[Assistant] 模型加载失败', modelSource, error)
          reject(error)
        }
      )
    }
  )

  const extensions = result.extensions ?? []
  if (
    currentCustomSource &&
    extensions.some((ext) =>
      ['KHR_texture_basisu', 'KHR_draco_mesh_compression', 'EXT_meshopt_compression'].includes(ext)
    )
  ) {
    window.$message?.warning('暂不支持压缩后的 glb 模型，请选择原始模型文件')
    throw new Error('UNSUPPORTED_COMPRESSED_MODEL')
  }

  const previousModel = model
  const loadedModel = result.scene
  const childrenSummary: Record<string, number> = {}
  loadedModel.traverse((child) => {
    const type = (child as Mesh).type
    childrenSummary[type] = (childrenSummary[type] || 0) + 1
  })
  const box = new Box3().setFromObject(loadedModel)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  const hasInvalidBounds = isInvalidBounds(size, center)
  if (hasInvalidBounds) {
    window.$message?.warning('模型没有几何数据或存在损坏，请检查后重新导入')
    throw new Error('EMPTY_MODEL_GEOMETRY')
  }
  const maxAxis = Math.max(size.x, size.y, size.z) || 1
  const scale = TARGET_SIZE / maxAxis
  const scaledSize = size.clone().multiplyScalar(scale)
  const lift = scaledSize.y * LIFT_RATIO
  const centerY = scaledSize.y / 2 + lift

  if (previousModel && modelWrapper) {
    modelWrapper.remove(previousModel)
    previousModel.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh
        mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose?.())
        } else {
          mesh.material?.dispose?.()
        }
      }
    })
  }

  model = loadedModel
  modelWrapper?.add(loadedModel)
  modelWrapper?.scale.setScalar(scale)
  const scaledCenter = center.clone().multiplyScalar(scale)
  if (modelWrapper) {
    modelWrapper.position.set(-scaledCenter.x, centerY - scaledCenter.y, -scaledCenter.z)
  }

  availableClips = result.animations
  if (availableClips.length > 0) {
    mixer = new AnimationMixer(loadedModel)
    const preferred =
      AnimationClip.findByName(availableClips, 'Animation') ||
      AnimationClip.findByName(availableClips, 'Armature|mixamo.com|Layer0') ||
      availableClips[0]
    activeAction = mixer.clipAction(preferred)
    activeAction.reset().play()
  } else {
    console.debug('[Assistant] 模型没有动画片段')
  }
  adjustFraming(scaledSize, centerY)
  loadingProgress.value = 100
  isReady.value = true
  initialized = true
}

const ensureScene = async () => {
  const el = container.value
  if (!el) {
    throw new Error('未找到 HuLa 小管家容器')
  }

  if (!renderer) {
    const width = el.clientWidth || el.offsetWidth || 1
    const height = el.clientHeight || el.offsetHeight || 1

    renderer = new WebGLRenderer({ antialias: true, alpha: true })
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    renderer.shadowMap.enabled = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.outline = 'none'
    renderer.domElement.tabIndex = -1
    el.appendChild(renderer.domElement)

    scene = new Scene()

    camera = new PerspectiveCamera(45, width / height || 1, 0.1, 100)

    controls = new OrbitControls(camera, renderer.domElement)

    const ambientLight = new AmbientLight(0xffffff, 1.1)
    scene.add(ambientLight)
    const directionalLight = new DirectionalLight(0xffffff, 1.4)
    directionalLight.position.set(4, 6, 3)
    directionalLight.castShadow = true
    scene.add(directionalLight)
  } else if (!el.contains(renderer.domElement)) {
    el.appendChild(renderer.domElement)
  }

  if (!initialized) {
    await loadModel()
    initialized = true
  }

  updateRendererSize()
}

const activate = async () => {
  if (activating || !props.active) return
  activating = true
  try {
    await nextTick()
    await ensureScene()
    startLoop()
    isReady.value = true
    emit('ready')
  } catch (error) {
    emit('error', error)
  } finally {
    activating = false
  }
}

const deactivate = () => {
  stopLoop()
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      void activate()
    } else {
      deactivate()
    }
  },
  { immediate: true }
)

watch(
  () => props.customModel,
  async () => {
    if (!props.active || !scene) return
    try {
      await loadModel()
      isReady.value = true
      emit('ready')
    } catch (error) {
      emit('error', error)
    }
  }
)

onMounted(() => {
  if (props.active) {
    void activate()
  }
})

onUnmounted(() => {
  disposeResources()
})
</script>

<style scoped lang="scss">
.assistant-view {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px;
  border-radius: 16px;
  background: radial-gradient(ellipse at center, rgba(19, 152, 127, 0.24), rgba(19, 152, 127, 0));
  box-shadow: inset 0 0 0 1px rgba(19, 152, 127, 0.1);
  overflow: hidden;

  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
}

.assistant-view__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 14px;
  color: #13987f;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(8px);
}

.assistant-view__progress {
  width: 40%;
  min-width: 180px;
}

.assistant-view__placeholder-text {
  padding-top: 12px;
  font-size: 14px;
  color: var(--text-color);
}
</style>
