import { setBlockType } from 'prosemirror-commands';
import { Node } from 'tiptap';

export default class Paragraph extends Node {
  get name() {
    return 'paragraph';
  }

  get schema() {
    return {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0],
    };
  }

  keys({ type }) {
    return {
      'Shift-Ctrl-0': setBlockType(type),
    };
  }

  commands({ type }) {
    return () => setBlockType(type);
  }
}
