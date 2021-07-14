<template>
  <div :class="className" :contenteditable="false">
    <div
      :class="{
        'image-view__body--focused': selected,
        'image-view__body--resizing': resizing,
      }"
      class="image-view__body"
      @click.prevent="selectImage"
    >
      <img
        :src="src"
        :title="title"
        :alt="alt"
        :width="width"
        :height="height"
        class="image-view__body__image"
      />

      <div
        v-if="view.editable"
        v-show="selected || resizing"
        class="image-resizer"
      >
        <span
          v-for="direction in resizeDirections"
          :key="direction"
          :class="`image-resizer__handler--${direction}`"
          class="image-resizer__handler"
          @mousedown.stop.prevent="onMouseDown($event, direction)"
        />
      </div>
    </div>
    <p
      class="image-caption"
      @keydown="handleKeyDown"
      @blur="handleBlur"
      :tabindex="-1"
      :contenteditable="true"
    >
      {{ alt }}
    </p>
    <!-- <input
      type="file"
      ref="image"
      @change="handleImageUpload"
      class="image-upload"
    /> -->
  </div>
</template>

<script>
import { ResizeObserver } from '@juggle/resize-observer';
import { resolveImg, RESIZE_DIRECTION } from '../utils/image';
import { NodeSelection } from 'prosemirror-state';
import { deleteSelection } from 'prosemirror-commands';
import mediumZoom from 'medium-zoom';
import { clamp } from '../utils/shared';
import { setTextSelection } from 'prosemirror-utils';

export default {
  props: [
    'node',
    'updateAttrs',
    'view',
    'getPos',
    'selected',
    'editor',
    'handleSelect',
  ],
  data() {
    return {
      maxSize: {
        width: 1000,
        height: 1000,
      },
      minSize: {
        width: 24,
        height: 24,
      },
      resizeDirections: [
        RESIZE_DIRECTION.TOP_LEFT,
        RESIZE_DIRECTION.TOP_RIGHT,
        RESIZE_DIRECTION.BOTTOM_LEFT,
        RESIZE_DIRECTION.BOTTOM_RIGHT,
      ],
      resizing: false,
      aspectRatio: null,
      resizerState: {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        dir: '',
      },
    };
  },
  computed: {
    src() {
      return this.node.attrs.src;
    },
    alt() {
      return this.node.attrs.alt;
    },
    title() {
      return this.node.attrs.title;
    },
    width() {
      return this.node.attrs.width;
    },
    height() {
      return this.node.attrs.height;
    },
    resizeObj() {
      return new ResizeObserver(() => {
        this.getMaxSize();
      });
    },
    imageViewClass() {
      return [''];
    },
    className() {
      const { layoutClass } = this.node.attrs;
      const className = layoutClass
        ? `image-view image image-${layoutClass}`
        : 'image-view image';

      return className;
    },
  },
  async created() {
    const result = await resolveImg(this.src);

    if (!result.complete) {
      result.width = this.minSize.width;
      result.height = this.minSize.height;
    }

    this.originalSize = {
      width: result.width,
      height: result.height,
    };
  },
  mounted() {
    this.resizeObj.observe(this.view.dom);

    // 之后再优化
    const image = document.querySelector('.data-zommable');
    mediumZoom(image, {
      background: '#FFF',
    });
  },
  beforeDestroy() {
    this.resizeObj.disconnect();
  },
  methods: {
    getMaxSize() {
      const { width } = getComputedStyle(this.view.dom);
      this.maxSize.width = parseInt(width, 10);
    },
    selectImage() {
      // https://github.com/ueberdosis/tiptap/issues/361

      const $pos = this.view.state.doc.resolve(this.getPos());
      const transaction = this.view.state.tr.setSelection(
        new NodeSelection($pos),
      );

      this.view.dispatch(transaction);
    },
    onMouseDown(e, dir) {
      this.resizerState.x = e.clientX;
      this.resizerState.y = e.clientY;

      const originalWidth = this.originalSize.width;
      const originalHeight = this.originalSize.height;
      this.aspectRatio = originalWidth / originalHeight;

      let { width, height } = this.node.attrs;
      const maxWidth = this.maxSize.width;

      if (width && !height) {
        width = width > maxWidth ? maxWidth : width;
        height = Math.round(width / this.aspectRatio);
      } else if (height && !width) {
        width = Math.round(height * this.aspectRatio);
        width = width > maxWidth ? maxWidth : width;
      } else if (!width && !height) {
        width = originalWidth > maxWidth ? maxWidth : originalWidth;
        height = Math.round(width / this.aspectRatio);
      } else {
        width = width > maxWidth ? maxWidth : width;
      }

      this.resizerState.w = width;
      this.resizerState.h = height;
      this.resizerState.dir = dir;

      this.resizing = true;

      this.onEvents();
    },
    onMouseMove(e) {
      e.preventDefault();
      e.stopPropagation();
      if (!this.resizing) return;

      const { x, w, dir } = this.resizerState;

      const dx = (e.clientX - x) * (/l/.test(dir) ? -1 : 1);

      const width = clamp(w + dx, this.minSize.width, this.maxSize.width);
      const height = Math.max(
        Math.round(width / this.aspectRatio),
        this.minSize.width,
      );

      this.updateAttrs({
        width,
        height,
      });
    },
    onMouseUp(e) {
      e.preventDefault();
      e.stopPropagation();
      if (!this.resizing) return;

      this.resizing = false;

      this.resizerState = {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        dir: '',
      };

      this.offEvents();
      this.selectImage();
    },

    onEvents() {
      document.addEventListener('mousemove', this.onMouseMove, true);
      document.addEventListener('mouseup', this.onMouseUp, true);
    },
    offEvents() {
      document.removeEventListener('mousemove', this.onMouseMove, true);
      document.removeEventListener('mouseup', this.onMouseUp, true);
    },
    removeImage() {
      const { state, dispatch } = this.view;

      deleteSelection(state, dispatch);
      this.view.focus();
    },
    clickImageButton(e) {
      e.preventDefault();

      this.$refs.image.click();
    },
    handleImageUpload(e) {
      const { state, dispatch } = this.view;

      deleteSelection(state, dispatch);

      const files = e.target.files;
      const images = Array.from(files).filter((file) =>
        /image/i.test(file.type),
      );

      if (images.length === 0) {
        return;
      }

      e.preventDefault();

      images.forEach((image) => {
        const reader = new FileReader();

        reader.onload = (readerEvent) => {
          const src = readerEvent.target.result;

          this.editor.commands.image({ src });
        };

        reader.readAsDataURL(image);
      });
    },
    handleKeyDown(event) {
      console.log('keydown', event);

      // Pressing Enter in the caption field should move the cursor/selection
      // below the image
      if (event.key === 'Enter') {
        event.preventDefault();

        const { view } = this.editor;
        const pos = this.getPos() + this.node.nodeSize;

        console.log('pos', this.node);
        view.focus();
        view.dispatch(setTextSelection(pos)(view.state.tr));

        return;
      }

      // Pressing Backspace in an an empty caption field should remove the entire
      // image, leaving an empty paragraph
      if (event.key === 'Backspace' && event.target.innerText === '') {
        const { view } = this.editor;
        const $pos = view.state.doc.resolve(this.getPos());
        const tr = view.state.tr.setSelection(new NodeSelection($pos));
        view.dispatch(tr.deleteSelection());
        view.focus();
        return;
      }
    },
    handleBlur(event) {
      const node = this.node;
      const getPos = this.getPos;

      const alt = event.target.innerText;
      const { src, title, layoutClass } = node.attrs;

      if (alt === node.attrs.alt) return;

      const { view } = this.editor;
      const { tr } = view.state;

      // update meta on object
      const pos = getPos();
      const transaction = tr.setNodeMarkup(pos, undefined, {
        src,
        alt,
        title,
        layoutClass,
      });
      view.dispatch(transaction);
    },
  },
};
</script>

<style lang="scss">
.image-focused {
  outline: 2px solid #8cf;
}

.image-wrapper {
  line-height: 0;
  display: inline-block;
}

.image-caption {
  border: 0;
  display: block;
  font-size: 13px;
  font-style: italic;
  color: #4e5c6e;
  padding: 2px 0;
  line-height: 16px;
  text-align: center;
  min-height: 1em;
  outline: none;
  background: none;
  resize: none;
  user-select: text;
  cursor: text;

  &:empty:before {
    color: #b1becc;
    content: 'Write a caption';
    pointer-events: none;
  }
}

.ProseMirror[contenteditable='false'] {
  .caption {
    pointer-events: none;
  }
  .caption:empty {
    visibility: hidden;
  }
}

.image {
  text-align: center;
  max-width: 100%;
  clear: both;

  img {
    display: inline-block;
    max-width: 100%;
    max-height: 75vh;
  }
}

.image.placeholder {
  position: relative;
  background: #fff;
  img {
    opacity: 0.5;
  }
}

.image-right-50 {
  float: right;
  width: 50%;
  margin-left: 2em;
  margin-bottom: 1em;
  clear: initial;
}

.image-left-50 {
  float: left;
  width: 50%;
  margin-right: 2em;
  margin-bottom: 1em;
  clear: initial;
}
</style>
