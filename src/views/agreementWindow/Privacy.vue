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
        <h1>HuLa隐私保护指引</h1>
        <p class="update-time">更新时间：2025年9月3日</p>
      </div>

      <div class="agreement-body">
        <section>
          <h2>引言</h2>
          <p>
            HuLa（以下简称"我们"）深知个人信息对您的重要性，并会尽全力保护您的个人信息安全可靠。我们致力于维持您对我们的信任，恪守以下原则，保护您的个人信息：权责一致原则、目的明确原则、选择同意原则、最少够用原则、确保安全原则、主体参与原则、公开透明原则等。同时，我们承诺，我们将按业界成熟的安全标准，采取相应的安全保护措施来保护您的个人信息。
          </p>
          <p>请在使用我们的产品（或服务）前，仔细阅读并了解本《隐私保护指引》。</p>
        </section>

        <section>
          <h2>一、我们如何收集和使用您的个人信息</h2>
          <p>
            个人信息是指以电子或者其他方式记录的能够单独或者与其他信息结合识别特定自然人身份或者反映特定自然人活动情况的各种信息。
          </p>

          <h3>1.1 我们收集您个人信息的情形</h3>
          <p>（1）账号注册：当您注册HuLa账号时，我们需要收集您的手机号码、邮箱地址等信息，以便为您创建账号。</p>
          <p>（2）身份验证：为了确保账号安全，我们可能需要您提供身份证明文件进行实名认证。</p>
          <p>（3）服务使用：在您使用HuLa服务过程中，我们会收集您的聊天记录、好友关系、群组信息等。</p>
          <p>（4）设备信息：我们会收集您的设备型号、操作系统版本、设备标识符等信息，以便为您提供更好的服务体验。</p>

          <h3>1.2 我们如何使用您的个人信息</h3>
          <p>（1）为您提供服务：包括即时通讯、文件传输、音视频通话等核心功能。</p>
          <p>（2）维护服务安全：检测和防范安全威胁、欺诈等违法犯罪活动。</p>
          <p>（3）改进服务质量：分析服务使用情况，优化产品功能和用户体验。</p>
          <p>（4）客户服务：处理您的咨询、投诉和建议。</p>
        </section>

        <section>
          <h2>二、我们如何使用Cookie和同类技术</h2>
          <p>
            为确保服务正常运转，我们会在您的计算机或移动设备上存储名为Cookie的小数据文件。Cookie通常包含标识符、站点名称以及一些号码和字符。借助于Cookie，网站能够存储您的偏好或购物篮内的商品等数据。
          </p>
          <p>
            我们不会将Cookie用于本政策所述目的之外的任何用途。您可根据自己的偏好管理或删除Cookie。您可以清除计算机上保存的所有Cookie，大部分网络浏览器都设有阻止Cookie的功能。但如果您这么做，则需要在每一次访问我们的网站时亲自更改用户设置。
          </p>
        </section>

        <section>
          <h2>三、我们如何共享、转让、公开披露您的个人信息</h2>

          <h3>3.1 共享</h3>
          <p>我们不会与HuLa以外的公司、组织和个人共享您的个人信息，但以下情况除外：</p>
          <p>（1）事先获得您明确的同意或授权；</p>
          <p>（2）根据适用的法律法规、法律程序的要求、强制性的政府要求或司法裁定；</p>
          <p>（3）在法律要求或允许的范围内，为了保护HuLa、HuLa用户或公众的权利、财产或安全免遭损害；</p>
          <p>（4）与我们的关联公司共享：我们可能会与我们的关联公司共享您的个人信息。</p>

          <h3>3.2 转让</h3>
          <p>我们不会将您的个人信息转让给任何公司、组织和个人，但以下情况除外：</p>
          <p>（1）事先获得您明确的同意或授权；</p>
          <p>
            （2）在涉及合并、收购或破产清算时，如涉及到个人信息转让，我们会要求新的持有您个人信息的公司、组织继续受此隐私政策的约束。
          </p>

          <h3>3.3 公开披露</h3>
          <p>我们仅会在以下情况下，公开披露您的个人信息：</p>
          <p>（1）获得您明确同意后；</p>
          <p>（2）基于法律的披露：在法律、法律程序、诉讼或政府主管部门强制性要求的情况下。</p>
        </section>

        <section>
          <h2>四、我们如何保护您的个人信息</h2>
          <p>
            （1）我们已使用符合业界标准的安全防护措施保护您提供的个人信息，防止数据遭到未经授权访问、公开披露、使用、修改、损坏或丢失。
          </p>
          <p>（2）我们会采取一切合理可行的措施，确保未收集无关的个人信息。</p>
          <p>（3）我们会采取一切合理可行的措施，确保个人信息不被保留超过实现目的所必需的期限。</p>
          <p>
            （4）互联网并非绝对安全的环境，而且电子邮件、即时通讯、社交软件等与其他用户的交流方式无法确定是否完全加密。
          </p>
        </section>

        <section>
          <h2>五、您的权利</h2>
          <p>按照中国相关的法律、法规、标准，以及其他国家、地区的通行做法，我们保障您对自己的个人信息行使以下权利：</p>

          <h3>5.1 访问您的个人信息</h3>
          <p>您有权访问您的个人信息，法律法规规定的例外情况除外。</p>

          <h3>5.2 更正您的个人信息</h3>
          <p>当您发现我们处理的关于您的个人信息有错误时，您有权要求我们做出更正。</p>

          <h3>5.3 删除您的个人信息</h3>
          <p>在以下情形中，您可以向我们提出删除个人信息的请求：</p>
          <p>（1）如果我们处理个人信息的行为违反法律法规；</p>
          <p>（2）如果我们收集、使用您的个人信息，却未征得您的同意；</p>
          <p>（3）如果我们处理个人信息的行为违反了与您的约定。</p>

          <h3>5.4 改变您授权同意的范围</h3>
          <p>
            每个业务功能需要一些基本的个人信息才能得以完成。对于额外收集的个人信息的收集和使用，您可以随时给予或收回您的授权同意。
          </p>
        </section>

        <section>
          <h2>六、我们如何处理儿童的个人信息</h2>
          <p>我们的产品、网站和服务主要面向成人。如果没有父母或监护人的同意，儿童不得创建自己的用户账户。</p>
          <p>
            对于经父母同意而收集儿童个人信息的情况，我们只会在受到法律允许、父母或监护人明确同意或者保护儿童所必要的情况下使用或公开披露此信息。
          </p>
        </section>

        <section>
          <h2>七、您的个人信息如何在全球范围转移</h2>
          <p>原则上，我们在中华人民共和国境内收集和产生的个人信息，将存储在中华人民共和国境内。</p>
          <p>
            由于我们通过遍布全球的资源和服务器提供产品或服务，这意味着，在获得您的授权同意后，您的个人信息可能会被转移到您使用产品或服务所在国家/地区的境外管辖区，或者受到来自这些管辖区的访问。
          </p>
        </section>

        <section>
          <h2>八、本政策如何更新</h2>
          <p>我们的隐私政策可能变更。</p>
          <p>
            未经您明确同意，我们不会削减您按照本隐私政策所应享有的权利。我们会在本页面上发布对本政策所做的任何变更。
          </p>
          <p>
            对于重大变更，我们还会提供更为显著的通知（包括对于某些服务，我们会通过电子邮件发送通知，说明隐私政策的具体变更内容）。
          </p>
        </section>

        <section>
          <h2>九、开源项目免责声明</h2>
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
          <h2>十、最终解释权</h2>
          <p>本隐私保护指引的最终解释权归作者所有。</p>
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
  -webkit-user-select: none;
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

      h3 {
        font-size: 16px;
        font-weight: bold;
        color: #444;
        margin: 15px 0 10px 0;
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
