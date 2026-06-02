import React from 'react';
import { Camera, CheckSquare, Square, Trash2, UploadCloud } from 'lucide-react';
import { SubtaskItem } from '../../../types';
import { API_BASE } from '../../utils/config';

interface SubtaskChecklistProps {
  subtasks: SubtaskItem[];
  isRunning: boolean;
  isUploading: boolean;
  onCheck: (index: number) => void;
  onCommentChange: (index: number, text: string) => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  onTakePhoto: (index: number) => void;
  onDeletePhoto: (attId: string) => void;
  getImagesForItem: (index: number) => any[];
}

export const SubtaskChecklist: React.FC<SubtaskChecklistProps> = ({
  subtasks,
  isRunning,
  isUploading,
  onCheck,
  onCommentChange,
  onPhotoUpload,
  onTakePhoto,
  onDeletePhoto,
  getImagesForItem,
}) => {
  const resolveAssetUrl = (u?: string) => {
    if (!u) return '';
    if (u.startsWith('blob:')) return u;
    if (u.startsWith('data:')) return u;
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    return `${API_BASE}${u.startsWith('/') ? u : `/${u}`}`;
  };

  const hasIT = (t: string) => {
    const up = (t || '').toUpperCase();
    return up.includes('IT_') || up.includes('INSTRUÇÃO');
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
      <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 flex gap-2 items-center">
        <CheckSquare size={16} />
        Checklist
      </h4>

      {subtasks.map((item, i) => (
        <div
          key={i}
          className={`p-3 rounded border mb-3 transition-colors ${
            item.done
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex gap-2 flex-1 cursor-pointer" onClick={() => onCheck(i)}>
              <div className={item.done ? 'text-green-600' : 'text-gray-400'}>
                {item.done ? <CheckSquare size={18} /> : <Square size={18} />}
              </div>

              <span
                className={`text-sm ${
                  item.done ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-100'
                }`}
              >
                <span className="text-blue-500 font-bold mr-2">{i + 1}</span>
                {item.text}
                {hasIT(item.text) && (
                  <span className="ml-2 bg-blue-100 text-blue-700 text-[10px] px-1 rounded">
                    IT
                  </span>
                )}
              </span>
            </div>

            <div className="flex gap-1">
              <label
                className={`p-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                  isUploading ? 'opacity-50 pointer-events-none' : ''
                }`}
                title="Selecionar da galeria"
              >
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) => onPhotoUpload(e, i)}
                  disabled={isUploading}
                />
                <UploadCloud className="text-gray-400 w-5 h-5" />
              </label>

              <button
                type="button"
                onClick={() => onTakePhoto(i)}
                disabled={isUploading}
                className="p-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Tirar foto agora"
              >
                <Camera className="text-gray-400 w-5 h-5" />
              </button>
            </div>
          </div>

          <textarea
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm text-gray-800 dark:text-gray-200 outline-none resize-y min-h-[60px]"
            placeholder="Observação..."
            value={item.comment || ''}
            onChange={(e) => onCommentChange(i, e.target.value)}
          />

          {getImagesForItem(i).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {getImagesForItem(i).map((img: any) => (
                <div key={img.id} className="relative w-16 h-16 group">
                  <img
                    src={resolveAssetUrl(img.url)}
                    className="w-full h-full object-cover rounded border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    onClick={() => onDeletePhoto(img.id)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow z-10"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
