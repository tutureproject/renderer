import React from 'react';
import { useSlate } from 'slate-react';
import { isBlockActive, toggleBlock } from 'editure';

import Button from './Button';
import ToolbarIcon from './ToolbarIcon';
import { BLOCK_HOTKEYS, getHotkeyHint } from '../../utils/hotkeys';

const BlockButton = ({ format, icon }) => {
  const editor = useSlate();
  const isActive = isBlockActive(editor, format);
  const { hotkey, title } = BLOCK_HOTKEYS[format];

  return (
    <Button
      handleMouseDown={(event) => {
        event.preventDefault();
        toggleBlock(editor, format, {}, { unwrap: true });
      }}
    >
      <ToolbarIcon
        isActive={isActive}
        icon={icon}
        title={`${title}\n${getHotkeyHint(hotkey)}`}
      />
    </Button>
  );
};

export default BlockButton;
