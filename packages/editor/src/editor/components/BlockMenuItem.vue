<template>
  <button
    ref="menuItemRef"
    class="menu-item"
    @click="handleClick"
    :style="menuItemStyle"
  >
    <font-awesome-icon :icon="icon" style=""></font-awesome-icon>
    &nbsp;&nbsp;{{ title }}
    <span class="short-cut">{{ shortcut }}</span>
  </button>
</template>

<script>
import scrollIntoView from 'smooth-scroll-into-view-if-needed';

export default {
  props: ['selected', 'disabled', 'onClick', 'icon', 'title', 'shortcut'],
  data() {
    return {
      iconStyle: this.selected ? '#000' : undefined,
    };
  },
  watch: {
    selected(val, oldVal) {
      if (val && this.$refs.menuItemRef) {
        scrollIntoView(this.$refs.menuItemRef, {
          scrollMode: 'if-needed',
          block: 'center',
          boundary: (parent) => {
            // All the parent elements of your target are checked until they
            // reach the #block-menu-container. Prevents body and other parent
            // elements from being scrolled
            return parent.id !== 'block-menu-container';
          },
        });
      }
    },
  },
  computed: {
    menuItemStyle() {
      return {
        color: this.selected ? '#000' : '#181A1B',
        background: this.selected ? '#C5CCD3' : 'none',
        '--active-background': this.selected ? '#C5CCD3' : '#F4F7FA',
      };
    },
  },
  methods: {
    handleClick() {
      if (this.disabled) return undefined;

      this.$props.onClick();
    },
  },
};
</script>

<style scoped lang="scss">
.menu-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-weight: 500;
  font-size: 14px;
  line-height: 1;
  width: 100%;
  height: 36px;
  cursor: pointer;
  border: none;
  opacity: 1;
  padding: 0 16px;
  outline: none;

  &:hover,
  &:active {
    color: #000 !important;
    background: var(--active-background) !important;
  }
}

.short-cut {
  color: #4e5c6e;
  flex-grow: 1;
  text-align: right;
}
</style>
