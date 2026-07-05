<template>
  <div class="settings-view">
    <!-- 头部 -->
    <header class="page-head">
      <div class="head-meta">
        <h1 class="page-title">设置</h1>
        <div class="page-sub">
          <span class="count-label">应用偏好与数据源</span>
        </div>
      </div>
    </header>

    <div class="settings-body">
      <!-- 我的 -->
      <section class="st-section">
        <div class="section-head">
          <h2 class="section-title">我的</h2>
          <span class="section-tag">PROFILE</span>
        </div>
        <div class="profile-row">
          <div class="avatar-img">
            <img :src="DEFAULT_AVATAR" alt="avatar" />
          </div>
          <div class="profile-info">
            <div class="profile-name">音乐用户</div>
            <div class="profile-desc">云音乐 · 随心听</div>
          </div>
        </div>
      </section>

      <div class="st-divider"></div>

      <!-- 关于 -->
      <section class="st-section">
        <div class="section-head">
          <h2 class="section-title">关于</h2>
          <span class="section-tag">ABOUT</span>
        </div>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">版本</span>
            <span class="info-value tnum">1.0.0</span>
          </div>
          <div class="info-item">
            <span class="info-label">搜索接口</span>
            <span class="info-value">cn.apihz.cn</span>
          </div>
          <div class="info-item">
            <span class="info-label">音频源</span>
            <span class="info-value">yymp3</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { DEFAULT_AVATAR } from '../config.js'
</script>

<style scoped>
.settings-view {
  min-height: 100%;
  padding: 24px 32px calc(var(--ncm-player-bar-height) + 48px);
}

/* ===== 头部 ===== */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 28px;
  gap: 16px;
}

.head-meta {
  display: flex;
  align-items: baseline;
  gap: 16px;
  min-width: 0;
}

.page-title {
  font-size: var(--ncm-text-3xl);
  font-weight: 700;
  color: var(--ncm-text-primary);
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.1;
}

.page-sub {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: var(--ncm-text-tertiary);
  font-size: var(--ncm-text-sm);
}

.count-label {
  letter-spacing: 0.02em;
}

/* ===== 主体 ===== */
.settings-body {
  max-width: 720px;
}

.st-section {
  padding: 4px 0 8px;
  animation: ncm-fade-up 0.5s var(--ncm-ease-out) both;
}

.st-section:nth-child(3) { animation-delay: 0.08s; }

.section-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}

.section-title {
  font-size: var(--ncm-text-lg);
  font-weight: 600;
  color: var(--ncm-text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

.section-tag {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--ncm-text-quaternary);
  font-weight: 500;
}

.section-desc {
  font-size: var(--ncm-text-sm);
  color: var(--ncm-text-tertiary);
  margin: 0 0 14px;
  line-height: 1.5;
}

.st-divider {
  height: 1px;
  background: var(--ncm-border);
  margin: 4px 0;
}

/* ===== 我的 - 头像 ===== */
.profile-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0 4px;
}

.avatar-img {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--ncm-border-strong);
  position: relative;
}

.avatar-img::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: 0 0 0 3px var(--ncm-bg-app);
  pointer-events: none;
}

.avatar-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.profile-name {
  font-size: var(--ncm-text-lg);
  font-weight: 600;
  color: var(--ncm-text-primary);
  margin-bottom: 2px;
  letter-spacing: -0.01em;
}

.profile-desc {
  font-size: var(--ncm-text-sm);
  color: var(--ncm-text-tertiary);
}

/* ===== 关于 - 信息列表 ===== */
.info-list {
  display: flex;
  flex-direction: column;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--ncm-border-light);
  transition: var(--ncm-transition-fast);
}

.info-item:last-child {
  border-bottom: none;
}

.info-item:hover {
  background: linear-gradient(90deg, transparent, var(--ncm-bg-hover) 50%, transparent);
  margin: 0 -12px;
  padding: 14px 12px;
}

.info-label {
  font-size: var(--ncm-text-md);
  color: var(--ncm-text-secondary);
}

.info-value {
  font-size: var(--ncm-text-md);
  color: var(--ncm-text-primary);
  font-weight: 500;
}

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  .settings-view {
    padding: 16px 16px calc(var(--ncm-player-bar-height-mobile) + var(--ncm-tabbar-height-mobile) + var(--ncm-safe-bottom, 0px) + 32px);
  }

  .page-head {
    margin-bottom: 20px;
  }

  .page-title {
    font-size: var(--ncm-text-2xl);
  }

  .head-meta {
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }
}
</style>
