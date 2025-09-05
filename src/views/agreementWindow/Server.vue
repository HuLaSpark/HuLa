<template>
  <div class="agreement-container">
    <!-- 顶部操作栏 -->
    <ActionBar
      :isDrag="false"
      :max-w="false"
      :min-w="false"
      :shrink="false"
      :current-label="WebviewWindow.getCurrent().label" />

    <!-- 协议内容 -->
    <div class="agreement-content">
      <div class="agreement-header">
        <h1>HuLa服务协议</h1>
        <p class="update-time">更新时间：2025年9月3日</p>
      </div>

      <div class="agreement-body">
        <section>
          <h2>1. 服务条款的确认和接纳</h2>
          <p>
            欢迎使用HuLa即时通讯软件！HuLa的各项电子服务的所有权和运作权归HuLa所有。用户必须完全同意所有服务条款并完成注册程序，才能成为HuLa的正式用户。
          </p>
        </section>

        <section>
          <h2>2. 服务简介</h2>
          <p>
            HuLa是一款免费的即时通讯软件，用户可以通过HuLa与好友进行文字、语音、视频聊天，分享图片、文件等。HuLa致力于为用户提供安全、稳定、便捷的通讯服务。
          </p>
        </section>

        <section>
          <h2>3. 用户注册</h2>
          <p>3.1 用户注册时必须提供真实、准确、完整的个人资料。</p>
          <p>
            3.2
            用户有义务保证密码和账号的安全，用户利用该密码和账号所进行的一切活动引起的任何损失或损害，由用户自行承担全部责任。
          </p>
          <p>3.3 用户同意接收来自HuLa的信息，包括但不限于产品信息、服务信息、特别优惠信息等。</p>
        </section>

        <section>
          <h2>4. 用户行为规范</h2>
          <p>4.1 用户在使用HuLa服务时，必须遵守中华人民共和国相关法律法规。</p>
          <p>4.2 禁止利用HuLa服务进行任何违法犯罪活动。</p>
          <p>4.3 禁止发布、传播任何违法、有害、威胁、辱骂、骚扰、侵权、中伤、粗俗、猥亵或其他道德上令人反感的内容。</p>
          <p>4.4 禁止发布、传播任何侵犯他人知识产权或其他合法权益的内容。</p>
          <p>4.5 禁止恶意传播病毒、木马等恶意程序。</p>
        </section>

        <section>
          <h2>5. 隐私保护</h2>
          <p>
            5.1 HuLa非常重视用户隐私的保护。除法律法规另有规定外，未经用户同意，HuLa不会向第三方披露、转让用户个人信息。
          </p>
          <p>5.2 HuLa采用行业标准的安全措施保护用户个人信息，防止数据的未经授权访问、使用或披露。</p>
          <p>5.3 用户理解并同意，为了向用户提供更好的服务，HuLa可能会收集、使用用户的相关信息。</p>
        </section>

        <section>
          <h2>6. 知识产权</h2>
          <p>6.1 HuLa软件及其相关技术、商标、版权等知识产权均归HuLa所有。</p>
          <p>6.2 未经HuLa书面许可，用户不得对HuLa软件进行反向工程、反汇编、反编译等。</p>
          <p>6.3 用户通过HuLa发布的内容，用户保留其知识产权，但同时授予HuLa在全球范围内免费的、非独占的使用许可。</p>
        </section>

        <section>
          <h2>7. 免责声明</h2>
          <p>7.1 用户明确同意其使用HuLa服务所存在的风险将完全由其自己承担。</p>
          <p>7.2 HuLa不保证服务一定能满足用户的要求，也不保证服务不会中断。</p>
          <p>7.3 对于因不可抗力或HuLa不能控制的原因造成的网络服务中断或其它缺陷，HuLa不承担任何责任。</p>
        </section>

        <section>
          <h2>8. 服务变更、中断或终止</h2>
          <p>8.1 HuLa有权根据业务发展需要，变更、中断或终止部分或全部服务。</p>
          <p>8.2 如因系统维护或升级的需要而需暂停网络服务，HuLa将尽可能事先进行通告。</p>
          <p>8.3 如用户违反本协议的任何条款，HuLa有权终止向该用户提供服务。</p>
        </section>

        <section>
          <h2>9. 协议修改</h2>
          <p>
            HuLa有权随时修改本协议的任何条款，一旦本协议的内容发生变动，HuLa将会通过适当方式向用户提示修改内容。如果不同意HuLa对本协议相关条款所做的修改，用户有权停止使用网络服务。如果用户继续使用网络服务，则视为用户接受HuLa对本协议相关条款所做的修改。
          </p>
        </section>

        <section>
          <h2>10. 法律适用及争议解决</h2>
          <p>10.1 本协议的订立、执行和解释及争议的解决均应适用中华人民共和国法律。</p>
          <p>
            10.2
            如双方就本协议内容或其执行发生任何争议，双方应尽量友好协商解决；协商不成时，任何一方均可向HuLa所在地的人民法院起诉。
          </p>
        </section>

        <section>
          <h2>11. 开源项目免责声明</h2>
          <p>
            本项目是作为一款开源项目提供的，开发者在法律允许的范围内不对软件的功能性、安全性或适用性提供任何形式的明示或暗示的保证。
          </p>
          <p>
            用户明确理解并同意，使用本软件的风险完全由用户自己承担，软件以"现状"和"现有"基础提供。开发者不提供任何形式的担保，无论是明示还是暗示的，包括但不限于适销性、特定用途的适用性和非侵权的担保。
          </p>
          <p>
            在任何情况下，开发者或其供应商都不对任何直接的、间接的、偶然的、特殊的、惩罚性的或后果性的损害承担责任，包括但不限于使用本软件产生的利润损失、业务中断、个人信息泄露或其他商业损害或损失。
          </p>
          <p>所有在本项目上进行二次开发的用户，都需承诺将本软件用于合法目的，并自行负责遵守当地的法律和法规。</p>
          <p>
            开发者有权在任何时间修改软件的功能或特性，以及本免责声明的任何部分，并且这些修改可能会以软件更新的形式体现。
          </p>
        </section>

        <section>
          <h2>12. 最终解释权</h2>
          <p>本协议的最终解释权归作者所有。</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'

onMounted(async () => {
  await getCurrentWebviewWindow().show()
})
</script>

<style scoped lang="scss">
.agreement-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  user-select: none;
}

.agreement-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;

  .agreement-header {
    text-align: center;
    margin-bottom: 30px;

    h1 {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }

    .update-time {
      font-size: 14px;
      color: #666;
    }
  }

  .agreement-body {
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.6;

    section {
      margin-bottom: 25px;

      h2 {
        font-size: 18px;
        font-weight: bold;
        color: #333;
        width: fit-content;
        margin-bottom: 15px;
        border-bottom: 2px solid #13987f90;
        padding-bottom: 5px;
      }

      p {
        font-size: 14px;
        color: #555;
        margin-bottom: 10px;
        text-indent: 2em;
      }
    }
  }
}

/* 滚动条样式 */
.agreement-content::-webkit-scrollbar {
  width: 6px;
}

.agreement-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.agreement-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.agreement-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
