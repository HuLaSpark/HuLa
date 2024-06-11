export const worker: Worker = new Worker(new URL('./Worker.ts', import.meta.url), {
  type: 'module'
})
