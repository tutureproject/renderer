import { InputRule } from 'prosemirror-inputrules';
import { Plugin } from 'prosemirror-state';
import { isInTable } from 'prosemirror-tables';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Extension } from 'tiptap';
import { findParentNode, findParentNodeOfType } from 'prosemirror-utils';
import {
  getAncestorNodeTypeName,
  getChildrenOfType,
  getChildrenLength,
} from '../utils/selection';
import { isNodeActive } from '../queries';

const MAX_MATCH = 500;
const OPEN_REGEX = /^\/(\w+)?$/;
const CLOSE_REGEX = /(^(?!\/(\w+)?)(.*)$|^\/((\w+)\s.*|\s)$)/;

// based on the input rules code in Prosemirror, here:
// https://github.com/ProseMirror/prosemirror-inputrules/blob/master/src/inputrules.js
function run(view, from, to, regex, handler) {
  if (view.composing) {
    return false;
  }
  const state = view.state;
  const $from = state.doc.resolve(from);
  if ($from.parent.type.spec.code) {
    return false;
  }

  const textBefore = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - MAX_MATCH),
    $from.parentOffset,
    null,
    '\ufffc',
  );

  const match = regex.exec(textBefore);
  const tr = handler(state, match, match ? from - match[0].length : from, to);
  if (!tr) return false;
  return true;
}

export default class BlockMenuTrigger extends Extension {
  get name() {
    return 'blockmenu';
  }

  get plugins() {
    // 新建菜单的激活按钮
    const createButton = document.createElement('button');
    createButton.className = 'block-menu-trigger';
    const createIcon = document.createElement('span');
    createIcon.innerHTML = '+';
    createButton.appendChild(createIcon);

    // 编辑菜单的激活按钮
    const editButton = document.createElement('button');
    editButton.className = 'block-menu-trigger';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '三';
    editButton.appendChild(editIcon);

    return [
      new Plugin({
        props: {
          handleClick: () => {
            this.options.onClose('create');
            this.options.onClose('edit');
            return false;
          },
          handleKeyDown: (view, event) => {
            // Prosemirror input rules are not triggered on backspace, however
            // we need them to be evaluted for the filter trigger to work
            // correctly. This additional handler adds inputrules-like handling.
            if (event.key === 'Backspace') {
              // timeout ensures that the delete has been handled by prosemirror
              // and any characters removed, before we evaluate the rule.
              setTimeout(() => {
                const { pos } = view.state.selection.$from;
                return run(view, pos, pos, OPEN_REGEX, (state, match) => {
                  if (match) {
                    this.options.onOpen(match[1], 'create');
                  } else {
                    this.options.onClose('create');
                  }
                  return null;
                });
              });
            }

            // If the query is active and we're navigating the block menu then
            // just ignore the key events in the editor itself until we're done
            if (
              event.key === 'Enter' ||
              event.key === 'ArrowUp' ||
              event.key === 'ArrowDown' ||
              event.key === 'Tab'
            ) {
              const { pos } = view.state.selection.$from;

              return run(view, pos, pos, OPEN_REGEX, (state, match) => {
                // just tell Prosemirror we handled it and not to do anything
                return match ? true : null;
              });
            }

            return false;
          },
          decorations: (state) => {
            /**
             * TODO:
             * 两种形式：1. 最外层 2. 里层
             * 一种间隔：外层间隔一致，里层间隔一致，整个文档的缩进每层保持一致
             *
             *  1. Paragraph/Blockquote/Notice/Heading  要单行，针对直接父块
             *  2. Codeblock/Diffblock 只针对整个块
             *  3. ul/ol/todolist 要单行，list-item/todo-item
             *  4. Table 只针对整个块
             *  5. Image 只针对 Image
             */
            // console.log('schema', this.editor.schema.nodes);
            const $from = state.selection.$from;
            const isTopLevel = $from.depth === 1;

            // 直接父块
            const directParent = findParentNode((node) => {
              return node.isBlock;
            })(state.selection);

            // 再往上以及父块，即直接父块的父块
            let secondUpperParent;
            if (!isTopLevel) {
              const node = $from.node($from.depth - 1);
              secondUpperParent = {
                pos: $from.before($from.depth - 1),
                start: $from.start($from.depth - 1),
                depth: $from.depth - 1,
                node,
              };
            }

            if (!directParent) return;

            const decorations = [];
            const isEmpty = directParent.node.content.size === 0;
            const isSlash = directParent.node.textContent === '/';

            //console.log('schema', this);
            console.log('isTop', isTopLevel, directParent, secondUpperParent);

            // console.log(
            //   'now',
            //   isEmpty,
            //   isTopLevel,
            //   directParent,
            //   secondUpperParent,
            // );

            /**
             * 只有如下两种情况可以使用快捷键处理：
             * 1. 鼠标在顶层，且顶层为 paragraph，且内容为空
             * 2. 鼠标没有在最顶层，上上层为 notice/blockquote，上层为 paragraph，且内容为空
             */
            if (
              (isTopLevel && directParent.node.type.name === 'paragraph') ||
              (!isTopLevel &&
                directParent.node.type.name === 'paragraph' &&
                ['blockquote', 'notice'].includes(
                  secondUpperParent.node.type.name,
                ))
            ) {
              if (isEmpty) {
                decorations.push(
                  Decoration.widget(directParent.pos, () => {
                    console.log('hello');
                    createButton.addEventListener('click', () => {
                      this.options.onOpen('', 'create');
                    });
                    return createButton;
                  }),
                );

                decorations.push(
                  Decoration.node(
                    directParent.pos,
                    directParent.pos + directParent.node.nodeSize,
                    {
                      class: 'placeholder',
                      'data-empty-text': this.options.dictionary.newLineEmpty,
                    },
                  ),
                );
              }

              if (isSlash) {
                decorations.push(
                  Decoration.node(
                    directParent.pos,
                    directParent.pos + directParent.node.nodeSize,
                    {
                      class: 'placeholder',
                      'data-empty-text': `  ${this.options.dictionary.newLineWithSlash}`,
                    },
                  ),
                );
              }

              if (decorations.length > 0)
                return DecorationSet.create(state.doc, decorations);
            }

            /**
             * 以下几种情况会弹出处理框（目前是只在最外层弹出，后续考虑类似 gitbook 可以在内层弹出）：
             * 1. 鼠标在顶层 depth = 1，顶层为 paragraph，内容不为空
             * 2. 鼠标在 heading 中
             * 3. 鼠标在 notice/blockquote 中，且 directParent 为 paragraph
             */
            if (
              (isTopLevel &&
                directParent.node.type.name === 'paragraph' &&
                directParent.node.content.size !== 0) ||
              (secondUpperParent &&
                directParent.node.type.name === 'paragraph' &&
                ['notice', 'blockquote'].includes(
                  secondUpperParent.node.type.name,
                ) &&
                directParent.node.content.size !== 0)
            ) {
              const ancestorNodeTypeName = getAncestorNodeTypeName($from);

              decorations.push(
                Decoration.widget(directParent.pos, () => {
                  editButton.addEventListener('click', () => {
                    /**
                     * 四个参数：
                     *
                     * - 第一个参数：open 时输入的文字，打开即搜索
                     * - 第二个参数：代表此时打开的是 edit | create 框
                     * - 第三个参数：此节点的父系节点链
                     * - 第四个参数：如果是父含子，且子节点是唯一节点，那么需要把父节点一起删除
                     */
                    this.options.onOpen('', 'edit', ancestorNodeTypeName);
                  });
                  return editButton;
                }),
              );

              if (decorations.length === 0) return;
              return DecorationSet.create(state.doc, decorations);
            }

            if (directParent.node.type.name === 'heading') {
              const ancestorNodeTypeName = getAncestorNodeTypeName($from);

              console.log('ancestorNodeTypeName', ancestorNodeTypeName);

              decorations.push(
                Decoration.widget(directParent.pos, () => {
                  editButton.addEventListener('click', () => {
                    /**
                     * 四个参数：
                     *
                     * - 第一个参数：open 时输入的文字，打开即搜索
                     * - 第二个参数：代表此时打开的是 edit | create 框
                     * - 第三个参数：此节点的父系节点链
                     * - 第四个参数：如果是父含子，且子节点是唯一节点，那么需要把父节点一起删除
                     */
                    this.options.onOpen('', 'edit', ancestorNodeTypeName);
                  });
                  return editButton;
                }),
              );

              if (decorations.length === 0) return;
              return DecorationSet.create(state.doc, decorations);
            }

            // console.log('diff', isTopLevel, directParent, secondUpperParent);
            if (
              ['code_block', 'diff_block'].includes(directParent.node.type.name)
            ) {
              const ancestorNodeTypeName = getAncestorNodeTypeName($from);

              decorations.push(
                Decoration.widget(directParent.pos, () => {
                  editButton.addEventListener('click', () => {
                    /**
                     * 四个参数：
                     *
                     * - 第一个参数：open 时输入的文字，打开即搜索
                     * - 第二个参数：代表此时打开的是 edit | create 框
                     * - 第三个参数：此节点的父系节点链
                     * - 第四个参数：如果是父含子，且子节点是唯一节点，那么需要把父节点一起删除
                     */
                    this.options.onOpen('', 'edit', ancestorNodeTypeName);
                  });
                  return editButton;
                }),
              );

              if (decorations.length === 0) return;
              return DecorationSet.create(state.doc, decorations);
            }

            /**
             * 以下几种情况会弹出处理框（目前是只在最外层弹出，后续考虑类似 gitbook 可以在内层弹出）：
             * 1. ul/ol/todolist，
             */

            if (
              secondUpperParent &&
              ['list_item', 'todo_item'].includes(
                secondUpperParent.node.type.name,
              )
            ) {
              const ancestorNodeTypeName = getAncestorNodeTypeName($from);

              decorations.push(
                Decoration.widget(secondUpperParent.start, () => {
                  editButton.addEventListener('click', () => {
                    this.options.onOpen('', 'edit', ancestorNodeTypeName);
                  });
                  return editButton;
                }),
              );

              if (decorations.length === 0) return;
              return DecorationSet.create(state.doc, decorations);
            }

            /**
             * 以下几种情况会弹出处理框（目前是只在最外层弹出，后续考虑类似 gitbook 可以在内层弹出）：
             * 1. Table 针对整个块
             */
            const tableParent = findParentNodeOfType(
              this.editor.schema.nodes.table,
            )(state.selection);
            if (tableParent) {
              decorations.push(
                Decoration.widget(tableParent.start, () => {
                  editButton.addEventListener('click', () => {
                    this.options.onOpen('', 'edit', ['table']);
                  });
                  return editButton;
                }),
              );

              if (decorations.length === 0) return;
              return DecorationSet.create(state.doc, decorations);
            }

            /**
             * 针对图片，只在图片元素上展示编辑菜单
             */
            const imageParent = findParentNodeOfType(
              this.editor.schema.nodes.image,
            )(state.selection);
            if (imageParent) {
              decorations.push(
                Decoration.widget(imageParent.start, () => {
                  editButton.addEventListener('click', () => {
                    this.options.onOpen('', 'edit', ['image']);
                  });
                  return editButton;
                }),
              );
            }

            if (decorations.length === 0) return;
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  }

  inputRules() {
    return [
      // main regex should match only:
      // /word
      new InputRule(OPEN_REGEX, (state, match) => {
        if (
          match &&
          state.selection.$from.parent.type.name === 'paragraph' &&
          !isInTable(state)
        ) {
          this.options.onOpen(match[1], 'create');
        }
        return null;
      }),
      // invert regex should match some of these scenarios:
      // /<space>word
      // /<space>
      // /word<space>
      new InputRule(CLOSE_REGEX, (state, match) => {
        if (match) {
          this.options.onClose('create');
        }
        return null;
      }),
    ];
  }
}
