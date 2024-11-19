import { ThemeEnum } from '@/enums'
import { JSX } from 'vue/jsx-runtime'

type Topic = {
  title: string
  code: ThemeEnum
  model: JSX.Element
}[]

const topicsList: Topic = [
  {
    title: '白天模式',
    code: ThemeEnum.LIGHT,
    model: (() => (
      <div class="size-full flex">
        <div class="bg-#f1f1f1 flex-1 rounded-[6px_0_0_6px]"></div>

        <div class="bg-#fff flex-[3.5] p-[8px_4px] box-border flex flex-col gap-8px">
          <div class="flex gap-4px">
            <div class="bg-#f1f1f1 size-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#f1f1f1 w-16px h-4px"></div>
              <div class="bg-#f1f1f1 w-24px h-4px"></div>
            </div>
          </div>

          <div class="flex gap-4px">
            <div class="bg-#f1f1f1 size-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#f1f1f1 w-16px h-4px"></div>
              <div class="bg-#f1f1f1 w-24px h-4px"></div>
            </div>
          </div>
        </div>

        <div class="bg-#f1f1f1 flex-[5.5] p-[8px_4px] rounded-[0_6px_6px_0] flex flex-col gap-8px">
          <div class="flex-y-center gap-4px">
            <div class="bg-#ccc w-6px h-6px rounded-50%"></div>
            <div class="bg-#fff w-28px h-6px"></div>
          </div>

          <div class="flex-y-center gap-4px ml-a">
            <div class="bg-#13987f w-28px h-6px"></div>
            <div class="bg-#ccc w-6px h-6px rounded-50%"></div>
          </div>
        </div>
      </div>
    ))()
  },
  {
    title: '夜间模式',
    code: ThemeEnum.DARK,
    model: (() => (
      <div class="size-full flex">
        <div class="bg-#454545 flex-1 rounded-[6px_0_0_6px]"></div>

        <div class="bg-#212121 flex-[3.5] p-[8px_4px] box-border flex flex-col gap-8px">
          <div class="flex gap-4px">
            <div class="bg-#4d4d4d size-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#4d4d4d w-16px h-4px"></div>
              <div class="bg-#4d4d4d w-24px h-4px"></div>
            </div>
          </div>

          <div class="flex gap-4px">
            <div class="bg-#4d4d4d size-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#4d4d4d w-16px h-4px"></div>
              <div class="bg-#4d4d4d w-24px h-4px"></div>
            </div>
          </div>
        </div>

        <div class="bg-#1a1a1a flex-[5.5] p-[8px_4px] rounded-[0_6px_6px_0] flex flex-col gap-8px">
          <div class="flex-y-center gap-4px">
            <div class="bg-#4d4d4d w-6px h-6px rounded-50%"></div>
            <div class="bg-#4d4d4d w-28px h-6px"></div>
          </div>

          <div class="flex-y-center gap-4px ml-a">
            <div class="bg-#4d4d4d w-28px h-6px"></div>
            <div class="bg-#4d4d4d w-6px h-6px rounded-50%"></div>
          </div>
        </div>
      </div>
    ))()
  },
  {
    title: '跟随系统',
    code: ThemeEnum.OS,
    model: (() => (
      <div class="size-full flex">
        <div class="bg-#f1f1f1 flex-1 rounded-[6px_0_0_6px]"></div>

        <div class="bg-#fff flex-[4.5] p-[8px_4px] box-border flex flex-col gap-8px">
          <div class="flex gap-4px">
            <div class="bg-#f1f1f1 size-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#f1f1f1 w-16px h-4px"></div>
              <div class="bg-#f1f1f1 w-24px h-4px"></div>
            </div>
          </div>

          <div class="flex gap-4px">
            <div class="bg-#f1f1f1 size-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#f1f1f1 w-16px h-4px"></div>
              <div class="bg-#f1f1f1 w-24px h-4px"></div>
            </div>
          </div>
        </div>

        <div class="bg-#454545 flex-1"></div>

        <div class="bg-#212121 flex-[4.5] p-[8px_4px] rounded-[0_6px_6px_0] box-border flex flex-col gap-8px">
          <div class="flex gap-4px">
            <div class="bg-#4d4d4d size-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#4d4d4d w-16px h-4px"></div>
              <div class="bg-#4d4d4d w-24px h-4px"></div>
            </div>
          </div>

          <div class="flex gap-4px">
            <div class="bg-#4d4d4d size-10px rounded-50%"></div>
            <div class="flex flex-col gap-2px">
              <div class="bg-#4d4d4d w-16px h-4px"></div>
              <div class="bg-#4d4d4d w-24px h-4px"></div>
            </div>
          </div>
        </div>
      </div>
    ))()
  }
]

const versatileModel: JSX.Element = (() => (
  <div class="w-300px h-200px rounded-8px custom-shadow flex border-(1px solid [--line-color])">
    <div class="bg-[--left-bg-color] flex-1 rounded-[6px_0_0_6px] flex-col-x-center">
      <div class="text-(8px [--left-text-color]) mt-10px">HuLa</div>
      <div class="bg-[--left-bg-hover] size-18px rounded-6px mt-10px"></div>
      <div class="bg-[--left-bg-hover] size-18px rounded-6px mt-10px"></div>
    </div>

    <div class="bg-[--center-bg-color] flex-[3.5] p-[8px_4px] box-border flex flex-col gap-12px">
      <div class="flex-y-center gap-4px">
        <div class="bg-[--bg-msg-first-child] size-22px rounded-50%"></div>
        <div class="flex flex-col gap-2px">
          <div class="bg-[--bg-msg-first-child] w-46px h-12px rounded-4px"></div>
          <div class="bg-[--bg-msg-first-child] w-74px h-12px rounded-4px"></div>
        </div>
      </div>

      <div class="flex-y-center gap-4px">
        <div class="bg-[--bg-msg-first-child] size-22px rounded-50%"></div>
        <div class="flex flex-col gap-2px">
          <div class="bg-[--bg-msg-first-child] w-46px h-12px rounded-4px"></div>
          <div class="bg-[--bg-msg-first-child] w-74px h-12px rounded-4px"></div>
        </div>
      </div>
    </div>

    <div
      style={{ background: 'var(--right-theme-bg-color)' }}
      class="flex-[5.5] p-[8px_4px] rounded-[0_6px_6px_0] flex flex-col gap-8px">
      <div class="flex-y-center gap-4px">
        <div class="bg-[--bg-bubble] w-16px h-16px rounded-50%"></div>
        <div class="bg-[--bg-bubble] w-78px h-16px rounded-4px"></div>
      </div>

      <div class="flex-y-center gap-4px ml-a">
        <div class="bg-#13987f w-78px h-16px rounded-4px"></div>
        <div class="bg-[--bg-bubble] w-16px h-16px rounded-50%"></div>
      </div>
    </div>
  </div>
))()

export { topicsList, versatileModel }
