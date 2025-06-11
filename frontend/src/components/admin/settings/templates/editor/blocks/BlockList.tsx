import React from 'react';
import { Block } from './Block';
import { type EmailBlock, type Variable } from '../../types';

interface BlockListProps {
  blocks: EmailBlock[];
  onBlockUpdate: (id: string, updates: Partial<EmailBlock>) => void;
  onBlockDelete: (id: string) => void;
  onBlockMove: (dragIndex: number, hoverIndex: number) => void;
  variables: Record<string, Variable>;
  activeVariable: string | null;
  onVariableSelect: (variableName: string | null) => void;
}

export const BlockList: React.FC<BlockListProps> = ({
  blocks,
  onBlockUpdate,
  onBlockDelete,
  onBlockMove,
  variables,
  activeVariable,
  onVariableSelect,
}) => {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <Block
          key={block.id}
          block={block}
          index={index}
          onUpdate={(updates) => onBlockUpdate(block.id, updates)}
          onDelete={() => onBlockDelete(block.id)}
          onMove={onBlockMove}
          variables={variables}
          activeVariable={activeVariable}
          onVariableSelect={onVariableSelect}
        />
      ))}
      {blocks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Add blocks to start building your email template
        </div>
      )}
    </div>
  );
}; 