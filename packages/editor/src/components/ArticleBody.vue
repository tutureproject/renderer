<template>
  <div class="p-8">
    <h1 class="text-xl">{{ article.name }}</h1>
    <a-divider />
    <div class="editure">
      <editor-content :editor="editor" />
      <selection-toolbar
        v-if="editor"
        :view="editor.view"
        :commands="editor.commands"
        :isActive="linkMenuIsActive"
        :dictionary="dictionary"
        :onOpen="handleOpenSelectionMenu"
        :onClose="handleCloseSelectionMenu"
        :onSearchLink="onSearchLink"
        :onClickLink="onClickLink"
        :onCreateLink="onCreateLink"
      ></selection-toolbar>
      <link-toolbar
        v-if="editor"
        :view="editor.view"
        :dictionary="dictionary"
        :isActive="linkMenuOpen"
        :onCreateLink="onCreateLink"
        :onSearchLink="onSearchLink"
        :onClickLink="onClickLink"
        :onShowToast="onShowToast"
        :onClose="handleCloseLinkMenu"
      ></link-toolbar>
      <create-block-menu
        :view="editor.view"
        :commands="editor.commands"
        :dictionary="dictionary"
        :isActive="createBlockMenuOpen"
        :search="blockMenuSearch"
        :onClose="handleCloseCreateBlockMenu"
        :uploadImage="uploadImage"
        :onLinkToolbarOpen="handleOpenLinkMenu"
        :onImageUploadStart="onImageUploadStart"
        :onImageUploadStop="onImageUploadStop"
        :onShowToast="onShowToast"
        :embeds="embeds"
      ></create-block-menu>
      <edit-block-menu
        :view="editor.view"
        :commands="editor.commands"
        :dictionary="dictionary"
        :isActive="editBlockMenuOpen"
        :ancestorNodeTypeName="ancestorNodeTypeName"
        :onClose="handleCloseEditBlockMenu"
        :uploadImage="uploadImage"
        :onLinkToolbarOpen="handleOpenLinkMenu"
        :onImageUploadStart="onImageUploadStart"
        :onImageUploadStop="onImageUploadStop"
        :onShowToast="onShowToast"
        :embeds="embeds"
      >
      </edit-block-menu>
    </div>
  </div>
</template>

<script setup>
import { defineComponent } from 'vue-demi';
import { mapGetters, mapState } from 'vuex';
import { Editor, EditorContent } from 'tiptap';
import {
  Bold,
  Italic,
  Underline,
  Strike,
  HardBreak,
  Code,
  Heading,
  History,
  Blockquote,
  ListItem,
  OrderedList,
  BulletList,
  TodoList,
  HorizontalRule,
  Placeholder,
  TrailingNode,
} from 'tiptap-extensions';
import {
  selectColumn,
  selectRow,
  selectTable,
  findParentNode,
} from 'prosemirror-utils';

import {
  TodoItem,
  Image,
  Notice,
  CodeBlock,
  DiffBlock,
  Table,
  TableHeaderCell,
  TableRow,
  TableCell,
  Paragraph,
  Text,
} from '@/editor/nodes';
import { Link } from '@/editor/marks';
import { Title, Doc, BlockMenuTrigger } from '@/editor/extensions';
import { dictionary } from '@/editor/utils';
import getDataTransferFiles from '@/editor/lib/getDataTransferFiles';
import SelectionToolbar from '@/editor/components/SelectionToolbar';
import LinkToolbar from '@/editor/components/LinkToolbar.vue';
import insertFiles from '@/editor/commands/insertFiles';
import CreateBlockMenu from '@/editor/components/CreateBlockMenu.vue';
import EditBlockMenu from '@/editor/components/EditBlockMenu.vue';

import useNowArticleId from '@/use/useNowArticleId';

export default defineComponent({
  name: 'ArticleBody',
  props: ['onCreateLink', 'onSearchLink', 'onShowToast', 'onClose'],
  components: {
    EditorContent,
    SelectionToolbar,
    LinkToolbar,
    CreateBlockMenu,
    EditBlockMenu,
  },
  data() {
    return {
      editor: new Editor({
        autoFocus: true,
        extensions: [
          new Doc(),
          new Text(),
          new HardBreak(),
          new Paragraph(),
          new Title(),
          new Blockquote(),
          new CodeBlock(),
          new DiffBlock(),
          new Notice({
            dictionary,
          }),
          new ListItem(),
          new OrderedList(),
          new BulletList(),
          new TodoItem({
            nested: true,
          }),
          new TodoList(),
          new Heading({
            levels: [1, 2, 3, 4],
          }),
          new HorizontalRule(),
          new Image({
            dictionary,
            uploadImage: this.uploadImage,
            onImageUploadStart: this.onImageUploadStart,
            onImageUploadStop: this.onImageUploadStop,
            onShowToast: this.onShowToast,
          }),
          new Table({
            resizable: true,
          }),
          new TableCell({
            onSelectTable: this.handleSelectTable,
            onSelectRow: this.handleSelectRow,
          }),
          new TableHeaderCell({
            onSelectColumn: this.handleSelectColumn,
          }),
          new TableRow(),
          new Bold(),
          new Italic(),
          new Underline(),
          new Strike(),
          new Link({
            onKeyboardShortcut: this.onKeyboardShortcut,
            onClick: this.handleClickLink,
            onClickHashtag: this.onClickHashtag,
            onHoverLink: this.onHoverLink,
          }),
          new Code(),
          new History(),
          new TrailingNode(),
          new BlockMenuTrigger({
            dictionary,
            onOpen: this.handleOpenBlockMenu,
            onClose: this.handleCloseBlockMenu,
          }),
          new Placeholder({
            showOnlyCurrent: false,
            emptyNodeText: (node) => {
              if (node.type.name === 'title') {
                return '请输入标题';
              }
            },
          }),
        ],
        onUpdate: ({ getJSON }) => {
          localStorage.setItem('editure-doc', JSON.stringify(getJSON()));
        },
      }),
      linkUrl: null,
      linkMenuIsActive: false,
      dictionary: dictionary,
      createBlockMenuOpen: false,
      editBlockMenuOpen: false,
      ancestorNodeTypeName: [],
      linkMenuOpen: false,
      blockMenuSearch: '',
      selectionMenuOpen: false,
      isEditorFocused: false,
      embeds: [],
    };
  },
  methods: {
    handleToggleLink() {
      if (this.editor.isActive.link()) {
        this.editor.commands.link({});
      } else if (!this.editor.isActive.image()) {
        this.handleOpenLinkMenu();
      }
    },
    handleOpenLink() {
      const { href = '', target = '' } = this.editor.getMarkAttrs('link');
      window.open(href, target);
    },
    handleClickLink() {
      this.handleOpenLinkMenu();
    },
    onKeyboardShortcut() {
      this.editor.commands.link({
        href: '',
      });
      this.handleOpenLinkMenu();
    },
    handleOpenLinkMenu() {
      // this.showLinkMenu(this.editor.getMarkAttrs("link"));
      this.createBlockMenuOpen = false;
      this.editBlockMenuOpen = false;
      this.linkMenuOpen = true;
    },
    showLinkMenu(attrs) {
      this.linkUrl = attrs.href;
      this.linkMenuIsActive = true;
      this.$nextTick(() => {
        this.$refs.linkInput.focus();
      });
    },
    hideLinkMenu() {
      this.linkUrl = null;
      this.linkMenuIsActive = false;
    },
    setLinkUrl(command, url) {
      command({ href: url });
      this.hideLinkMenu();
    },
    clickImageButton(e) {
      e.preventDefault();

      this.$refs.image.click();
    },
    uploadImage(file) {
      if (!file) return;

      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (readerEvent) => {
          const src = readerEvent.target.result;

          resolve(src);
        };

        reader.readAsDataURL(file);
      });
    },
    handleImagePicked(event) {
      const files = getDataTransferFiles(event);

      const { view } = this.editor;
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
          uploadImage: this.uploadImage,
          onImageUploadStart: this.onImageUploadStart,
          onImageUploadStop: this.onImageUploadStop,
          onShowToast: this.onShowToast,
          dictionary: dictionary,
        });
      }

      if (this.$refs.image.$el) {
        this.$refs.image.$el.value = '';
      }

      // 后续引入类似 gitbook 那样子的菜单栏才使用这里
      // this.handleCloseBlockMenu();
    },
    onImageUploadStart(e) {},
    onImageUploadStop(e) {},
    handleSelectRow(index, state) {
      this.editor.view.dispatch(selectRow(index)(state.tr));
    },
    handleSelectColumn(index, state) {
      this.editor.view.dispatch(selectColumn(index)(state.tr));
    },
    handleSelectTable(state) {
      this.editor.view.dispatch(selectTable(state.tr));
    },
    handleOpenSelectionMenu() {
      this.selectionMenuOpen = true;
    },
    handleCloseSelectionMenu() {
      this.selectionMenuOpen = false;
    },
    onClickHashtag() {},
    onHoverLink() {},
    handleCloseLinkMenu() {
      this.linkMenuOpen = false;
    },
    onClickLink(href) {
      window.open(href, '_blank');
    },
    handleOpenBlockMenu(search, type, ancestorNodeTypeName) {
      if (type === 'create') {
        this.createBlockMenuOpen = true;
        this.blockMenuSearch = search;
      } else if (type === 'edit') {
        console.log('search', ancestorNodeTypeName);
        this.editBlockMenuOpen = true;
        this.ancestorNodeTypeName = ancestorNodeTypeName;
      }
    },
    handleCloseCreateBlockMenu() {
      this.handleCloseBlockMenu('create');
    },
    handleCloseEditBlockMenu() {
      this.handleCloseBlockMenu('edit');
    },
    handleCloseBlockMenu(type) {
      if (type === 'create') {
        if (!this.createBlockMenuOpen) return;
        this.createBlockMenuOpen = false;
      } else if (type === 'edit') {
        if (!this.editBlockMenuOpen) return;
        this.editBlockMenuOpen = false;
      }
    },
  },
  beforeDestroy() {
    this.editor.destroy();
  },
  computed: {
    ...mapState('collection', ['articles']),
    ...mapGetters('collection', ['getArticleById']),
    article() {
      return this.getArticleById(this.nowArticleId) || {};
    },
  },
  mounted() {
    const doc = localStorage.getItem('editure-doc');
    if (doc) {
      this.editor.setContent(JSON.parse(doc));
    }
  },
  setup() {
    const { nowArticleId } = useNowArticleId();
    return { nowArticleId };
  },
});
</script>

<style lang="scss">
.editure p.is-editor-empty:first-child::before {
  content: attr(data-empty-text);
  float: left;
  color: #aaa;
  pointer-events: none;
  height: 0;
  font-style: italic;
}

.editure *.is-empty:nth-child(1)::before,
.editure *.is-empty:nth-child(2)::before {
  content: attr(data-empty-text);
  float: left;
  color: #aaa;
  pointer-events: none;
  height: 0;
  font-style: italic;
}

ul[data-type='todo_list'] {
  padding-left: 0;
}
li[data-type='todo_item'] {
  display: flex;
  flex-direction: row;
}

.todo-checkbox {
  border: 2px solid #000;
  height: 0.9em;
  width: 0.9em;
  box-sizing: border-box;
  margin-right: 10px;
  margin-top: 0.3rem;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
  border-radius: 0.2em;
  background-color: transparent;
  transition: 0.4s background;
}

.todo-content {
  flex: 1;
  > p:last-of-type {
    margin-bottom: 0;
    margin: 0;
  }
  > ul[data-type='todo_list'] {
    margin: 0.5rem 0;
  }
}

li[data-done='true'] {
  > .todo-content {
    > p {
      text-decoration: line-through;
    }
  }
  > .todo-checkbox {
    background-color: #000;
  }
}
li[data-done='false'] {
  text-decoration: none;
}

.block-menu-trigger {
  display: inline;
  width: 24px;
  height: 24px;
  color: #4e5c6e;
  background: none;
  position: absolute;
  transition: color 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
    transform 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
  outline: none;
  border: 0;
  padding: 0;
  margin-left: -40px;
  font-size: 14px;

  &:hover,
  &:focus {
    cursor: pointer;
    transform: scale(1.2);
    color: #181a1b;
  }
}

a {
  color: inherit;
  text-decoration: underline;
}

.placeholder {
  &:before {
    display: block;
    content: attr(data-empty-text);
    pointer-events: none;
    height: 0;
    color: #b1becc;
  }
}
</style>
