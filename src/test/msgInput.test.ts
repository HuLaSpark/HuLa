import { describe, it, expect, beforeEach } from 'vitest'
const stripHtml = (html: string) => {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const replyDiv = tmp.querySelector('#replyDiv')
  if (replyDiv) {
    replyDiv.remove()
  }
  return tmp.textContent?.trim() || tmp.innerText?.trim() || ''
}
describe('禁用发送计算属性', () => {
  let msgInput: any
  let disabledSend: any

  beforeEach(() => {
    msgInput = ref('')
    disabledSend = computed(() => {
      const plainText = stripHtml(msgInput.value)
      return plainText.length === 0 || plainText.replace(/&nbsp;/g, ' ').trim().length === 0
    })
  })

  it('对于长度为0应该返回 true', () => {
    msgInput.value.length === 0
    expect(disabledSend.value).toBe(true)
  })

  it('对于空输入应该返回 true', () => {
    msgInput.value = ''
    expect(disabledSend.value).toBe(true)
  })

  it('应该返回 true 对于只有空格的输入', () => {
    msgInput.value = '   '
    expect(disabledSend.value).toBe(true)
  })

  it('应该返回 true 对于只有 &nbsp; 的输入', () => {
    msgInput.value = '&nbsp;&nbsp;&nbsp;'
    expect(disabledSend.value).toBe(true)
  })

  it('应该返回 true 对于混合空格和 &nbsp; 的输入', () => {
    msgInput.value = ' &nbsp; &nbsp; '
    expect(disabledSend.value).toBe(true)
  })

  it('应该返回 false 对于有效的输入', () => {
    msgInput.value = 'Hello World'
    expect(disabledSend.value).toBe(false)
  })

  it('应该返回 false 对于输入周围有空格的输入', () => {
    msgInput.value = '  Hello World  '
    expect(disabledSend.value).toBe(false)
  })

  it('对于带有 HTML 标签的有效输入应该返回 false', () => {
    msgInput.value = '<div>Hello World</div>'
    expect(disabledSend.value).toBe(false)
  })

  it('对于回复框的无效输入应该返回 true', () => {
    msgInput.value = '<div id="replyDiv" contenteditable="false">&nbsp; &nbsp;<span>123</span></div><br />'
    expect(disabledSend.value).toBe(true)
  })
})
