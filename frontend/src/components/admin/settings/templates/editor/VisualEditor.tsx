import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BlockList } from './blocks/BlockList';
import { BlockToolbar } from './blocks/BlockToolbar';
import { type EmailBlock, type Variable } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface VisualEditorProps {
  blocks: EmailBlock[];
  onBlocksChange: (blocks: EmailBlock[]) => void;
  variables: Record<string, Variable>;
  activeVariable: string | null;
  onVariableSelect: (variableName: string | null) => void;
}

export const VisualEditor: React.FC<VisualEditorProps> = ({
  blocks,
  onBlocksChange,
  variables,
  activeVariable,
  onVariableSelect,
}) => {
  const addBlock = (type: EmailBlock['type']) => {
    const newBlock: EmailBlock = {
      id: uuidv4(),
      type,
      content: type === 'text' ? '' : {},
      styles: {},
    };
    onBlocksChange([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    onBlocksChange(
      blocks.map((block) =>
        block.id === id ? { ...block, ...updates } : block
      )
    );
  };

  const deleteBlock = (id: string) => {
    onBlocksChange(blocks.filter((block) => block.id !== id));
  };

  const moveBlock = (dragIndex: number, hoverIndex: number) => {
    const dragBlock = blocks[dragIndex];
    const newBlocks = [...blocks];
    newBlocks.splice(dragIndex, 1);
    newBlocks.splice(hoverIndex, 0, dragBlock);
    onBlocksChange(newBlocks);
  };

  const duplicateBlock = (id: string) => {
    const blockToDuplicate = blocks.find((block) => block.id === id);
    if (!blockToDuplicate) return;

    const duplicatedBlock: EmailBlock = {
      ...blockToDuplicate,
      id: uuidv4(),
    };

    const index = blocks.findIndex((block) => block.id === id);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, duplicatedBlock);
    onBlocksChange(newBlocks);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full">
        <BlockToolbar onAddBlock={addBlock} />
        <div className="flex-1 overflow-y-auto p-4">
          <BlockList
            blocks={blocks}
            onBlockUpdate={updateBlock}
            onBlockDelete={deleteBlock}
            onBlockMove={moveBlock}
            //@ts-ignore
            onBlockDuplicate={duplicateBlock}
            variables={variables}
            activeVariable={activeVariable}
            onVariableSelect={onVariableSelect}
          />
        </div>
      </div>
    </DndProvider>
  );
}; 