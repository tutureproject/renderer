<template>
  <portal>
    <div
      ref="menuRef"
      id="block-menu-container"
      class="wrapper"
      :style="userStyle"
    >
      <div v-if="needInsertItem" class="link-input-wrapper">
        <input
          type="text"
          :placeholder="linkInputPlaceholder"
          class="link-input"
          @keydown="handleLinkInputKeydown"
          @paste="handleLinkInputPaste"
          autofocus
        />
      </div>
      <ol v-else class="list">
        <template v-for="(item, index) in filtered">
          <div v-if="item.name === 'separatpr'" :key="index" class="list-item">
            <hr />
          </div>
          <div
            v-else-if="item.title && item.icon"
            :key="index"
            class="list-item"
          >
            <block-menu-item
              :onClick="() => insertItem(item)"
              :selected="index === selectedIndex && isActive"
              :icon="item.icon"
              :title="item.title"
              :shortcut="item.shortcut"
            ></block-menu-item>
          </div>
        </template>
        <div v-if="filtered.length === 0" class="list-item">
          <div class="empty">{{ dictionary.noResults }}</div>
        </div>
      </ol>
      <span class="visually-hidden" v-if="uploadImage">
        <input
          type="file"
          ref="inputRef"
          @change="handleImagePicked"
          accept="image/*"
        />
      </span>
    </div>
  </portal>
</template>

<script>
import { Portal } from '@linusborg/vue-simple-portal';
import capitalize from 'lodash/capitalize';
import getMenuItems from '../menus/block';
import getDataTransferFiles from '../lib/getDataTransferFiles';
import { findParentNode } from 'prosemirror-utils';
import insertFiles from '../commands/insertFiles';
import BlockMenuItem from './BlockMenuItem';

export default {
  props: [
    'isActive',
    'commands',
    'embeds',
    'search',
    'uploadImage',
    'view',
    'onImageUploadStart',
    'onImageUploadStop',
    'onShowToast',
    'onLinkToolbarOpen',
    'onClose',
    'dictionary',
  ],
  components: {
    Portal,
    BlockMenuItem,
  },
  data() {
    return {
      left: -1000,
      top: 0,
      bottom: undefined,
      isAbove: false,
      selectedIndex: 0,
      needInsertItem: undefined,
    };
  },
  computed: {
    filtered() {
      const { dictionary, embeds, search = '', uploadImage } = this.$props;
      let items = getMenuItems(dictionary);

      // 一些可嵌入内容的支持
      const embedItems = [];

      for (const embed of embeds) {
        if (embed.title && embed.icon) {
          embedItems.push({
            ...embed,
            name: 'embed',
          });
        }
      }

      if (embedItems.length) {
        items.push({
          name: 'separator',
        });
        items = items.concat(embedItems);
      }

      const filtered = items.filter((item) => {
        if (item.name === 'separator') return true;

        // If no image upload callback has been passed, filter the image block out
        if (!uploadImage && item.name === 'image') return false;

        // some items (defaultHidden) are not visible until a search query exists
        if (!search) return !item.defaultHidden;

        const n = search.toLowerCase();
        return (
          (item.title || '').toLowerCase().includes(n) ||
          (item.keywords || '').toLowerCase().includes(n)
        );
      });

      // this block literally just trims unneccessary separators from the results
      return filtered.reduce((acc, item, index) => {
        // trim separators from start / end
        if (item.name === 'separator' && index === 0) return acc;
        if (item.name === 'separator' && index === filtered.length - 1)
          return acc;

        // trim double separators looking ahead / behind
        const prev = filtered[index - 1];
        if (prev && prev.name === 'separator' && item.name === 'separator')
          return acc;

        const next = filtered[index + 1];
        if (next && next.name === 'separator' && item.name === 'separator')
          return acc;

        // otherwise, continue
        return [...acc, item];
      }, []);
    },
    caretPosition() {
      const selection = window.document.getSelection();
      if (!selection || !selection.anchorNode || !selection.focusNode) {
        return {
          top: 0,
          left: 0,
        };
      }

      const range = window.document.createRange();
      range.setStart(selection.anchorNode, selection.anchorOffset);
      range.setEnd(selection.focusNode, selection.focusOffset);

      // This is a workaround for an edgecase where getBoundingClientRect will
      // return zero values if the selection is collapsed at the start of a newline
      // see reference here: https://stackoverflow.com/a/59780954
      const rects = range.getClientRects();
      if (rects.length === 0) {
        // probably buggy newline behavior, explicitly select the node contents
        if (range.startContainer && range.collapsed) {
          range.selectNodeContents(range.startContainer);
        }
      }

      const rect = range.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
      };
    },
    userStyle() {
      console.log('isAx', this.isActive);
      const extraStyle = this.isActive
        ? {
            transform: `translateY(${this.isAbove ? '6px' : '-6px'}) scale(1)`,
            'pointer-events': 'all',
            opacity: 1,
          }
        : {};

      let top = this.top !== undefined ? { top: `${this.top}px` } : {};
      let bottom =
        this.bottom !== undefined ? { bottom: `${this.bottom}px` } : {};

      return {
        left: `${this.left}px`,
        ...top,
        ...bottom,
        ...extraStyle,
      };
    },
    linkInputPlaceholder() {
      return this.needInsertItem?.title
        ? this.dictionary.pasteLinkWithTitle(this.needInsertItem?.title)
        : this.dictionary.pasteLink;
    },
  },
  methods: {
    calculatePosition(props) {
      const { view } = props;
      const { selection } = view.state;
      const startPos = view.coordsAtPos(selection.$from.pos);
      const ref = this.$refs.menuRef;
      const offsetHeight = ref ? ref.offsetHeight : 0;
      const paragraph = view.domAtPos(selection.$from.pos);

      if (
        !props.isActive ||
        !paragraph.node ||
        !paragraph.node.getBoundingClientRect
      ) {
        return {
          left: -1000,
          top: 0,
          bottom: undefined,
          isAbove: false,
        };
      }

      const { left } = this.caretPosition;
      const { top, bottom } = paragraph.node.getBoundingClientRect();
      const margin = 24;

      if (startPos.top - offsetHeight > margin) {
        return {
          left: left + window.scrollX,
          top: undefined,
          bottom: window.innerHeight - top - window.scrollY,
          isAbove: false,
        };
      } else {
        return {
          left: left + window.scrollX,
          top: bottom + window.scrollY,
          bottom: undefined,
          isAbove: true,
        };
      }
    },
    insertBlock(item) {
      this.clearSearch();

      const command = this.$props.commands[item.name];
      if (command) {
        command(item.attrs);
      } else {
        this.$props.commands[`create${capitalize(item.name)}`](item.attrs);
      }

      this.$props.onClose();
    },
    clearSearch() {
      const { state, dispatch } = this.$props.view;
      const parent = findParentNode((node) => !!node)(state.selection);

      if (parent) {
        dispatch(
          state.tr.insertText(
            '',
            parent.pos + 1,
            parent.pos + parent.node.textContent.length + 1,
          ),
        );
      }
    },
    handleImagePicked(event) {
      const files = getDataTransferFiles(event);

      const {
        view,
        uploadImage,
        onImageUploadStart,
        onImageUploadStop,
        onShowToast,
      } = this.$props;
      const { state, dispatch } = view;
      const parent = findParentNode((node) => !!node)(state.selection);

      if (parent) {
        dispatch(
          state.tr.insertText(
            '',
            parent.pos,
            parent.pos + parent.node.textContent.length + 1,
          ),
        );

        insertFiles(view, event, parent.pos, files, {
          uploadImage,
          onImageUploadStart,
          onImageUploadStop,
          onShowToast,
          dictionary: this.$props.dictionary,
        });
      }

      if (this.$refs.inputRef.$el) {
        this.$refs.inputRef.$el.value = '';
      }

      this.$props.onClose();
    },
    triggerImagePick() {
      if (this.$refs.inputRef) {
        this.$refs.inputRef.click();
      }
    },
    triggerLinkInput(item) {
      this.needInsertItem = item;
    },
    handleKeyDown(event) {
      if (!this.$props.isActive) return;

      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();

        const item = this.filtered[this.selectedIndex];

        if (item) {
          this.insertItem(item);
        } else {
          this.$props.onClose();
        }
      }

      if (event.key === 'ArrowUp' || (event.ctrlKey && event.key === 'p')) {
        event.preventDefault();
        event.stopPropagation();

        if (this.filtered.length) {
          const prevIndex = this.selectedIndex - 1;
          const prev = this.filtered[prevIndex];

          this.selectedIndex = Math.max(
            0,
            prev && prev.name === 'separator' ? prevIndex - 1 : prevIndex,
          );
        } else {
          this.close();
        }
      }

      if (
        event.key === 'ArrowDown' ||
        event.key === 'Tab' ||
        (event.ctrlKey && event.key === 'n')
      ) {
        event.preventDefault();
        event.stopPropagation();

        if (this.filtered.length) {
          const total = this.filtered.length - 1;
          const nextIndex = this.selectedIndex + 1;
          const next = this.filtered[nextIndex];

          this.selectedIndex = Math.min(
            next && next.name === 'separator' ? nextIndex + 1 : nextIndex,
            total,
          );
        } else {
          this.close();
        }
      }

      if (event.key === 'Escape') {
        this.close();
      }
    },

    insertItem(item) {
      switch (item.name) {
        case 'image':
          return this.triggerImagePick();
        case 'embed':
          return this.triggerLinkInput(item);
        case 'link': {
          this.clearSearch();
          this.$props.onClose();
          this.$props.onLinkToolbarOpen();
          return;
        }
        default:
          this.insertBlock(item);
      }
    },

    close() {
      this.$props.onClose();
      this.$props.view.focus();
    },

    handleLinkInputKeydown(event) {
      if (!this.$props.isActive) return;
      if (!this.needInsertItem) return;

      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();

        const href = event.currentTarget.value;
        const matches = this.needInsertItem.matcher(href);

        if (!matches && this.$props.onShowToast) {
          this.$props.onShowToast(
            this.$props.dictionary.embedInvalidLink,
            'error',
          );
          return;
        }

        this.insertBlock({
          name: 'embed',
          attrs: {
            href,
            component: this.needInsertItem.component,
            matches,
          },
        });
      }

      if (event.key === 'Escape') {
        this.$props.onClose();
        this.$props.view.focus();
      }
    },

    handleLinkInputPaste(event) {
      if (!this.$props.isActive) return;
      if (!this.needInsertItem) return;

      const href = event.clipboardData.getData('text/plain');
      const matches = this.needInsertItem.matcher(href);

      if (matches) {
        event.preventDefault();
        event.stopPropagation();

        this.insertBlock({
          name: 'embed',
          attrs: {
            href,
            component: this.needInsertItem.component,
            matches,
          },
        });
      }
    },
  },
  watch: {
    isActive(val, oldVal) {
      if (!oldVal && val) {
        const { left, top, bottom, isAbove } = this.calculatePosition(
          this.$props,
        );

        this.needInsertItem = undefined;
        this.selectedIndex = 0;

        this.left = left;
        this.top = top;
        this.bottom = bottom;
        this.isAbove = isAbove;
      }
    },
    search(val, oldVal) {
      if (val !== oldVal) {
        this.selectedIndex = 0;
      }
    },
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeyDown);
  },
};
</script>

<style scoped lang="scss">
.wrapper {
  color: #181a1b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  position: absolute;
  z-index: 200;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: rgba(0, 0, 0, 0.05) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.08) 0px 4px 8px, rgba(0, 0, 0, 0.08) 0px 2px 4px;
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
    transform 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transition-delay: 150ms;
  line-height: 0;
  box-sizing: border-box;
  pointer-events: none;
  white-space: nowrap;
  width: 300px;
  max-height: 224px;
  overflow: hidden;
  overflow-y: auto;

  * {
    box-sizing: border-box;
  }

  hr {
    border: 0;
    height: 0;
    border-top: 1px solid #c5ccd3;
  }

  @media print {
    display: none;
  }
}

.link-input-wrapper {
  margin: 8px;
}

.link-input {
  font-size: 15px;
  background: rgba(255, 255, 255, 0.1);
  color: #181a1b;
  border-radius: 2px;
  padding: 3px 8px;
  border: 0;
  margin: 0;
  outline: none;
  flex-grow: 1;
  height: 36px;
  width: 100%;
}

.list {
  list-style: none;
  text-align: left;
  height: 100%;
  padding: 8px 0;
  margin: 0;
}

.list-item {
  padding: 0;
  margin: 0;
}

.empty {
  display: flex;
  align-items: center;
  color: #4e5c6e;
  font-weight: 500;
  font-size: 14px;
  height: 36px;
  padding: 0 16px;
}

.visually-hidden {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px 1px 1px 1px); /* IE6, IE7 */
  clip: rect(1px, 1px, 1px, 1px);
}
</style>
