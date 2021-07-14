import { IS_MAC } from '../utils/environment';
import { isNodeActive, isInList } from '../queries';
import { isInTable } from 'prosemirror-tables';

const mod = IS_MAC ? '⌘' : 'ctrl';

export const basicBlockMenuItems = (dictionary) => {
  return [
    {
      name: 'heading',
      title: dictionary.h1,
      keywords: 'h1 heading1 title',
      icon: 'heading',
      shortcut: '^ ⇧ 1',
      attrs: { level: 1 },
    },
    {
      name: 'heading',
      title: dictionary.h2,
      keywords: 'h2 heading2',
      icon: 'heading',
      shortcut: '^ ⇧ 2',
      attrs: { level: 2 },
    },
    {
      name: 'heading',
      title: dictionary.h3,
      keywords: 'h3 heading3',
      icon: 'heading',
      shortcut: '^ ⇧ 3',
      attrs: { level: 3 },
    },
    {
      name: 'separator',
    },
    {
      name: 'todo_list',
      title: dictionary.checkboxList,
      icon: 'check',
      keywords: 'checklist checkbox task',
      shortcut: '^ ⇧ 7',
    },
    {
      name: 'bullet_list',
      title: dictionary.bulletList,
      icon: 'list-ul',
      shortcut: '^ ⇧ 8',
    },
    {
      name: 'ordered_list',
      title: dictionary.orderedList,
      icon: 'list-ol',
      shortcut: '^ ⇧ 9',
    },
    {
      name: 'separator',
    },
    {
      name: 'table',
      title: dictionary.table,
      icon: 'table',
      attrs: { rowsCount: 3, colsCount: 3 },
    },
    {
      name: 'blockquote',
      title: dictionary.quote,
      icon: 'quote-left',
      shortcut: `${mod} ]`,
    },
    {
      name: 'code_block',
      title: dictionary.codeBlock,
      icon: 'file-code',
      shortcut: '^ ⇧ \\',
      keywords: 'script',
    },
    {
      name: 'horizontal_rule',
      title: dictionary.hr,
      icon: 'grip-horizontal',
      shortcut: `${mod} _`,
      keywords: 'horizontal rule break line',
    },
    {
      name: 'image',
      title: dictionary.image,
      icon: 'image',
      keywords: 'picture photo',
    },
    {
      name: 'link',
      title: dictionary.link,
      icon: 'link',
      shortcut: `${mod} k`,
      keywords: 'link url uri href',
    },
    {
      name: 'separator',
    },
    {
      name: 'diff_block',
      title: dictionary.diffBlock,
      icon: 'tint',
      keywords: 'container_notice card information',
      attrs: { style: 'default', filename: 'helloworld.json', commit: '123' },
    },
    {
      name: 'notice',
      title: dictionary.default,
      icon: 'tint',
      keywords: 'container_notice card information',
      attrs: { style: 'default' },
    },
  ];
};

/**
 *
 * @param {*} dictionary
 * @param {*} extraItems 用于为特殊的块如 heading 等，添加复制链接的操作，第一版暂时不支持，也不会为 heading 添加链接
 * @returns
 */
export const getActionMenuItems = (dictionary, extraItems = []) => {
  const basic = [
    {
      name: '剪切',
      title: dictionary.cut,
      keywords: 'cut',
      icon: 'cut',
    },
    {
      name: '复制',
      title: dictionary.copy,
      keywords: 'copy',
      icon: 'copy',
    },
    {
      name: '删除',
      title: dictionary.delete,
      keywords: 'delete',
      icon: 'delete',
    },
  ];

  // 转换操作
  const turnInto = {
    name: '转成',
    title: dictionary.turnInto,
    keywords: 'turnInto convert changeTo',
    icon: 'change',
  };

  // link
  const copyLink = {
    name: '复制链接',
    title: dictionary.copyLink,
    keywords: 'copyLink',
    icon: 'copyLink',
  };

  let result = [...basic];

  if (extraItems.includes('turnInto')) {
    result = result.concat(turnInto);
  }

  if (extraItems.includes('copyLink')) {
    result = result.concat(copyLink);
  }

  return result;
};

export default function editBlockMenuItems(
  state,
  dictionary,
  ancestorNodeTypeName = [],
) {
  /**
   * 分为几类，每类菜单不一样：
   * 1. paragraph/heading/ul/ol/todolist
   * 3. image/codeblock/diffblock/table/hr
   */

  if (!ancestorNodeTypeName.length)
    return {
      actionList: [],
      canTurnIntoMenuItems: [],
    };

  // 进入第一类编辑菜单，针对文本的不同形式
  if (
    [
      'paragraph',
      'heading',
      'todo_list',
      'bullet_list',
      'ordered_list',
    ].some((item) => ancestorNodeTypeName.includes(item))
  ) {
    // 可转换成的其他块
    const canTurnIntoList = [
      'paragraph',
      'heading',
      'todo_list',
      'bullet_list',
      'ordered_list',
      'blockquote',
      'notice',
    ];

    // 实际展示菜单
    const { nodes = [] } = state.schema;
    console.log('state', state.schema.nodes);
    const getNodeTypeByName = (name) => nodes[name];
    const canTurnIntoMenuItems = basicBlockMenuItems(dictionary)
      .filter((item) => canTurnIntoList.includes(item.name))
      .map((item) => {
        const active = isNodeActive(getNodeTypeByName(item.name));
        return {
          ...item,
          active,
        };
      });

    // 除复制、粘贴、剪切外的可操作性的其他 action
    const extraAction =
      ancestorNodeTypeName[0] === 'heading'
        ? ['turnInto', 'copyLink']
        : ['turnInto'];

    // 最终的 actionList
    const actionList = getActionMenuItems(dictionary, extraAction);

    // 返回 actionList 和 canTurnIntoList，主要展示 actionList，然后如果有对应的 turnIntoAction ，就展示 canTurnIntoList
    return {
      actionList,
      canTurnIntoMenuItems,
    };
  }

  // 进入第二类编辑菜单，针对一些特殊的块，目前只支持基础的 action
  if (
    ['image', 'code_block', 'diff_block', 'table', 'hr'].includes(
      ancestorNodeTypeName[0],
    )
  ) {
    const actionList = getActionMenuItems(dictionary);

    return {
      actionList,
      canTurnIntoMenuItems: [],
    };
  }
}
