import { useRef, useEffect } from 'react';
import { FiBold, FiItalic, FiList, FiType } from 'react-icons/fi';
import { MdFormatListNumbered, MdColorize } from 'react-icons/md';

export default function RichTextEditor({ value, onChange, placeholder, className = "" }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
    handleInput();
  };

  const changeFontSize = (size) => {
    execCommand('fontSize', size);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-300">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bold"
        >
          <FiBold />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Italic"
        >
          <FiItalic />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bullet List"
        >
          <FiList />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Numbered List"
        >
          <MdFormatListNumbered />
        </button>
        <div className="flex items-center gap-1 ml-2">
          <FiType className="text-gray-600" />
          <select
            onChange={(e) => changeFontSize(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
            defaultValue="3"
          >
            <option value="1">Small</option>
            <option value="3">Normal</option>
            <option value="5">Large</option>
            <option value="7">Extra Large</option>
          </select>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <MdColorize className="text-gray-600" />
          <select
            onChange={(e) => execCommand('foreColor', e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
            defaultValue="#000000"
          >
            <option value="#000000">Black</option>
            <option value="#dc2626">Red</option>
            <option value="#16a34a">Green</option>
            <option value="#2563eb">Blue</option>
            <option value="#ca8a04">Yellow</option>
            <option value="#9333ea">Purple</option>
            <option value="#ea580c">Orange</option>
            <option value="#64748b">Gray</option>
          </select>
        </div>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className={`p-3 min-h-[120px] focus:outline-none [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:mb-1 ${className}`}
        style={{ whiteSpace: 'pre-wrap' }}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />
      
      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}