import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { RiDragMove2Line, RiDeleteBin6Line } from 'react-icons/ri';
import { type EmailBlock, type Variable } from '../../types';
import { TextBlock } from './types/TextBlock';
import { ImageBlock } from './types/ImageBlock';
import { ButtonBlock } from './types/ButtonBlock';
import { DividerBlock } from './types/DividerBlock';
import { SpacerBlock } from './types/SpacerBlock';
import { VariableBlock } from './types/VariableBlock';

interface BlockProps {
  block: EmailBlock;
  index: number;
  onUpdate: (updates: Partial<EmailBlock>) => void;
  onDelete: () => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  variables: Record<string, Variable>;
  activeVariable: string | null;
  onVariableSelect: (variableName: string | null) => void;
}

export const Block: React.FC<BlockProps> = ({
  block,
  index,
  onUpdate,
  onDelete,
  onMove,
  variables,
  activeVariable,
  onVariableSelect,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'BLOCK',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'BLOCK',
    hover: (item: { index: number }) => {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  const renderBlock = () => {
    switch (block.type) {
      case 'text':
        return (
          <TextBlock
            content={block.content}
            onChange={(content) => onUpdate({ content })}
            variables={variables}
            activeVariable={activeVariable}
            onVariableSelect={onVariableSelect}
          />
        );
      case 'image':
        return (
          <ImageBlock
            content={block.content}
            styles={block.styles}
            onChange={(updates) => onUpdate(updates)}
          />
        );
      case 'button':
        return (
          <ButtonBlock
            content={block.content}
            styles={block.styles}
            onChange={(updates) => onUpdate(updates)}
          />
        );
      case 'divider':
        return (
          <DividerBlock
            styles={block.styles}
            onChange={(styles) => onUpdate({ styles })}
          />
        );
      case 'spacer':
        return (
          <SpacerBlock
            styles={block.styles}
            onChange={(styles) => onUpdate({ styles })}
          />
        );
      case 'variable':
        return (
          <VariableBlock
            content={block.content}
            styles={block.styles}
            onChange={(updates) => onUpdate(updates)}
            variables={variables}
            activeVariable={activeVariable}
            onVariableSelect={onVariableSelect}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={ref}
      className={`relative group ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-600 cursor-move"
        >
          <RiDragMove2Line className="w-5 h-5" />
        </button>
      </div>
      <div className="relative">
        {renderBlock()}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <RiDeleteBin6Line className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}; 