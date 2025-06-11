import React from 'react';
import {
  RiText,
  RiImage2Line,
  RiLink,
  RiSeparator,
  RiArrowUpDownLine,
  RiCodeLine,
} from 'react-icons/ri';
import { type EmailBlock } from '../../types';

interface BlockToolbarProps {
  onAddBlock: (type: EmailBlock['type']) => void;
}

const blocks = [
  {
    type: 'text' as const,
    icon: RiText,
    label: 'Text',
  },
  {
    type: 'image' as const,
    icon: RiImage2Line,
    label: 'Image',
  },
  {
    type: 'button' as const,
    icon: RiLink,
    label: 'Button',
  },
  {
    type: 'divider' as const,
    icon: RiSeparator,
    label: 'Divider',
  },
  {
    type: 'spacer' as const,
    icon: RiArrowUpDownLine,
    label: 'Spacer',
  },
  {
    type: 'variable' as const,
    icon: RiCodeLine,
    label: 'Variable',
  },
];

export const BlockToolbar: React.FC<BlockToolbarProps> = ({ onAddBlock }) => {
  return (
    <div className="flex items-center gap-2 p-4 border-b border-gray-200">
      {blocks.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          onClick={() => onAddBlock(type)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
}; 