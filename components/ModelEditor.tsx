import React from 'react';
import { Model, ModelField } from '../types';
import { ICONS, MONGOOSE_DATA_TYPES } from '../constants';

interface ModelEditorProps {
  model: Model;
  onModelChange: (model: Model) => void;
}

const ModelEditor: React.FC<ModelEditorProps> = ({ model, onModelChange }) => {

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onModelChange({ ...model, name: e.target.value });
  };

  const handleFieldChange = (index: number, field: Partial<ModelField>) => {
    const newFields = [...model.fields];
    newFields[index] = { ...newFields[index], ...field };
    onModelChange({ ...model, fields: newFields });
  };

  const addField = () => {
    const newFields = [...model.fields, { name: `newField${model.fields.length + 1}`, type: 'String' }];
    onModelChange({ ...model, fields: newFields });
  };

  const removeField = (index: number) => {
    const newFields = model.fields.filter((_, i) => i !== index);
    onModelChange({ ...model, fields: newFields });
  };

  return (
    <div className="p-3 space-y-4 bg-gray-900/50 rounded-md">
      <div>
        <label htmlFor={`model-name-${model.id}`} className="block text-sm font-medium text-gray-300 mb-1">Model Name</label>
        <input
          id={`model-name-${model.id}`}
          type="text"
          value={model.name}
          onChange={handleNameChange}
          className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">Fields</h4>
        <div className="space-y-2">
          {model.fields.map((field, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <input
                  type="text"
                  placeholder="Field Name"
                  value={field.name}
                  onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  aria-label="Field Name"
                />
              </div>
              <div className="col-span-5">
                 <select
                    value={field.type}
                    onChange={(e) => handleFieldChange(index, { type: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    aria-label="Field Type"
                 >
                    {MONGOOSE_DATA_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                 </select>
              </div>
              <div className="col-span-2 flex justify-end">
                <button onClick={() => removeField(index)} className="text-gray-400 hover:text-red-400 p-1.5 hover:bg-gray-700 rounded-full" title="Remove field">
                  {ICONS.TRASH}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
       <button
        onClick={addField}
        className="flex items-center text-sm font-semibold text-indigo-400 hover:text-indigo-300"
      >
        {ICONS.PLUS}
        Add Field
      </button>
    </div>
  );
};

export default ModelEditor;
