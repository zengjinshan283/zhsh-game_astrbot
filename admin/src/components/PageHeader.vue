<template>
  <div class="page-header">
    <div class="page-header-top">
      <h2 class="page-title">{{ title }}</h2>
      <div v-if="$slots.extra" class="page-extra">
        <slot name="extra" />
      </div>
    </div>
    <p v-if="desc" class="page-desc">{{ desc }}</p>
    <slot name="desc" />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  desc: { type: String, default: '' }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.page-header {
  margin-bottom: 20px;
}

.page-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: $text-primary;
}

.page-extra {
  display: flex;
  align-items: center;
}

.page-desc {
  font-size: 13px;
  color: $text-secondary;
  margin-top: 4px;
}
</style>
