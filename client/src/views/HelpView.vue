<template>
  <div class="help-view">
    <nav class="navbar">
      <n-button size="small" @click="router.push('/')">← 返回</n-button>
      <h1>📖 玩家说明</h1>
      <div class="spacer"></div>
    </nav>

    <main class="help-content">
      <n-card title="🎮 游戏简介">
        <p>Halli Galli（德国心脏病）是一款考验反应速度的卡牌游戏。</p>
        <p>玩家轮流出牌，当满足特定条件时按铃，赢得中央牌堆的所有牌。</p>
        <p>先赢得所有牌的玩家获胜！</p>
      </n-card>

      <n-card title="🍌 经典模式" class="mode-card">
        <n-space vertical>
          <div class="mode-info">
            <span class="mode-icon">🍌</span>
            <div>
              <h3>规则</h3>
              <ul>
                <li><strong>牌数</strong>：60 张（4 种水果 × 5 个数量 × 3 组）</li>
                <li><strong>按铃条件</strong>：5 张同种水果</li>
                <li><strong>难度</strong>：⭐⭐</li>
              </ul>
            </div>
          </div>
          <n-alert type="info" title="按铃示例">
            <div class="example">
              🍌 🍌 🍌 🍌 🍌 ← 5 个香蕉，可以按铃！
            </div>
          </n-alert>
        </n-space>
      </n-card>

      <n-card title="🐵 极限模式" class="mode-card extreme">
        <n-space vertical>
          <div class="mode-info">
            <span class="mode-icon">🐵</span>
            <div>
              <h3>规则</h3>
              <ul>
                <li><strong>牌数</strong>：68 张（60 水果 + 8 动物）</li>
                <li><strong>按铃条件</strong>：5 种（见下方）</li>
                <li><strong>难度</strong>：⭐⭐⭐⭐⭐</li>
              </ul>
            </div>
          </div>

          <n-collapse>
            <n-collapse-item title="1️⃣ 5 张同种水果" name="1">
              <div class="example">
                🍓 🍓 🍓 🍓 🍓 ← 5 个草莓，可以按铃！
              </div>
            </n-collapse-item>
            <n-collapse-item title="2️⃣ 5 张动物牌" name="2">
              <div class="example">
                🐵 🐘 🐷 🐵 🐘 ← 5 张动物牌，可以按铃！
              </div>
              <p>动物种类：🐵 猴子、🐘 大象、🐷 猪</p>
            </n-collapse-item>
            <n-collapse-item title="3️⃣ 4 种不同" name="3">
              <div class="example">
                🍌 🍋 🍓 🐵 ← 4 种不同，可以按铃！
              </div>
            </n-collapse-item>
            <n-collapse-item title="4️⃣ 2 对牌" name="4">
              <div class="example">
                🍌 🍌 🍋 🍋 ← 2 对，可以按铃！
              </div>
            </n-collapse-item>
            <n-collapse-item title="5️⃣ 连续数字" name="5">
              <div class="example">
                🍌₂ 🍋₃ 🍓₄ ← 2-3-4 连续，可以按铃！
              </div>
              <p>注意：动物牌没有数字，不参与连续判断</p>
            </n-collapse-item>
          </n-collapse>
        </n-space>
      </n-card>

      <n-card title="🔔 按铃规则">
        <n-space vertical>
          <n-alert type="success" title="正确按铃">
            <p>✅ 满足条件时按铃 → 赢得中央所有牌</p>
          </n-alert>
          <n-alert type="error" title="错误按铃">
            <p>❌ 不满足条件时按铃 → <strong>被罚 1 张牌给对手</strong></p>
          </n-alert>
          <n-alert type="warning" title="冷却时间">
            <p>按铃后有 0.2 秒冷却时间，无法连续按铃</p>
          </n-alert>
        </n-space>
      </n-card>

      <n-card title="🏆 胜负规则">
        <n-space vertical>
          <div class="rule-item">
            <h3>🎯 胜利条件</h3>
            <p>赢得<strong>所有牌</strong>的玩家获胜</p>
            <ul>
              <li>经典模式：60 张牌</li>
              <li>极限模式：68 张牌</li>
            </ul>
          </div>
          <div class="rule-item">
            <h3>📊 游戏流程</h3>
            <ol>
              <li>每位玩家初始获得 30 张（经典）或 36 张（极限）牌</li>
              <li>轮流将手牌出到中央牌堆</li>
              <li>满足条件时按铃赢得中央所有牌</li>
              <li>先拥有所有牌的玩家获胜</li>
            </ol>
          </div>
          <div class="rule-item">
            <h3>📈 排行榜</h3>
            <ul>
              <li><strong>胜场</strong>：获胜次数 +1</li>
              <li><strong>游戏场次</strong>：每局游戏 +1</li>
              <li><strong>胜率</strong>：胜场 ÷ 游戏场次 × 100%</li>
            </ul>
          </div>
        </n-space>
      </n-card>

      <n-card title="❓ 常见问题">
        <n-collapse>
          <n-collapse-item title="Q: 按铃后为什么没有反应？" name="faq1">
            <ul>
              <li>按铃过于频繁（有 0.2 秒冷却）</li>
              <li>按铃时中央牌堆为空</li>
              <li>网络延迟</li>
            </ul>
          </n-collapse-item>
          <n-collapse-item title="Q: 为什么我被罚牌了？" name="faq2">
            <p>错误按铃会被罚牌：</p>
            <ul>
              <li>不满足条件时按铃</li>
              <li>按铃条件判断错误</li>
            </ul>
          </n-collapse-item>
          <n-collapse-item title="Q: 回合制是怎样的？" name="faq3">
            <ul>
              <li>顺时针轮流进行</li>
              <li>名字旁有 ▶ 标志时才能出牌</li>
              <li>出牌后自动交给下一位</li>
            </ul>
          </n-collapse-item>
          <n-collapse-item title="Q: 断线了怎么办？" name="faq4">
            <p>重新登录即可，房间会保留一段时间，请尽快重新加入。</p>
          </n-collapse-item>
        </n-collapse>
      </n-card>

      <n-card title="💡 游戏技巧">
        <n-space vertical>
          <div class="tip-section">
            <h3>🎯 新手技巧</h3>
            <ul>
              <li><strong>集中注意力</strong>：时刻关注中央牌堆</li>
              <li><strong>不要急</strong>：确认满足条件再按铃</li>
              <li><strong>记牌</strong>：记住已经出了哪些牌</li>
            </ul>
          </div>
          <div class="tip-section">
            <h3>🔥 进阶技巧</h3>
            <ul>
              <li><strong>预判</strong>：根据手牌预测可能出现的组合</li>
              <li><strong>心理战</strong>：假装要按铃迷惑对手</li>
              <li><strong>快速反应</strong>：看到条件立即按铃</li>
            </ul>
          </div>
        </n-space>
      </n-card>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<style scoped>
.help-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
}

.navbar {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  gap: 16px;
}

.navbar h1 {
  font-size: 20px;
  margin: 0;
  flex: 1;
  text-align: center;
}

.spacer {
  flex: 1;
}

.help-content {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.mode-card {
  background: rgba(255, 255, 255, 0.05) !important;
}

.mode-card.extreme {
  border: 1px solid rgba(235, 77, 75, 0.3) !important;
}

.mode-info {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.mode-icon {
  font-size: 48px;
}

.mode-info h3 {
  margin: 0 0 8px 0;
  color: #f0932b;
}

.mode-info ul {
  margin: 0;
  padding-left: 20px;
  color: #ccc;
}

.example {
  font-size: 24px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  text-align: center;
}

.rule-item {
  margin-bottom: 16px;
}

.rule-item h3 {
  color: #18a058;
  margin: 0 0 8px 0;
}

.rule-item p {
  margin: 0 0 8px 0;
  color: #ccc;
}

.rule-item ul,
.rule-item ol {
  margin: 0;
  padding-left: 20px;
  color: #ccc;
}

.tip-section h3 {
  color: #f0932b;
  margin: 0 0 8px 0;
}

.tip-section ul {
  margin: 0;
  padding-left: 20px;
  color: #ccc;
}

:deep(.n-card) {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

:deep(.n-card__header) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

:deep(.n-collapse-item__header) {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  margin-bottom: 8px !important;
  border-radius: 4px !important;
}

:deep(.n-alert) {
  background: rgba(255, 255, 255, 0.05) !important;
}
</style>
