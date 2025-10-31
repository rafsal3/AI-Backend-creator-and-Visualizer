import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectState } from '../types';
import * as projectService from '../services/projectService';
import { ICONS } from '../constants';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../hooks/useToast';
import ToastContainer from './Toast';

interface ProjectSelectionPageProps {
  onSelectProject: (projectId: string) => void;
}

const ProjectSelectionPage: React.FC<ProjectSelectionPageProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<Project | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const { toasts, addToast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    setProjects(projectService.getProjects());
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      const newProject = projectService.createProject(newProjectName.trim());
      onSelectProject(newProject.id);
    }
  };
  
  const handleDeleteRequest = (project: Project) => {
    setDeleteConfirmation(project);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmation) {
      projectService.deleteProject(deleteConfirmation.id);
      addToast(`Project "${deleteConfirmation.name}" deleted.`, 'success');
      setDeleteConfirmation(null);
      loadProjects();
    }
  };

  const handleImportClick = () => {
    importFileRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') throw new Error('File could not be read');

        const data: ProjectState = JSON.parse(text);

        // Basic validation
        if (Array.isArray(data.models) && typeof data.activeFramework === 'string') {
          const projectName = file.name.replace(/\.json$/, '') || 'Imported Project';
          const newProject = projectService.createProject(projectName, data);
          addToast('Project imported successfully!', 'success');
          onSelectProject(newProject.id);
        } else {
          throw new Error('Invalid project file format.');
        }
      } catch (error: any) {
        addToast(error.message || 'Failed to import project.', 'error');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col font-sans">
        <ToastContainer toasts={toasts} />
        <input
            type="file"
            ref={importFileRef}
            className="hidden"
            accept=".json"
            onChange={handleFileSelected}
        />
        <header className="flex-shrink-0 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
                {ICONS.LOGO}
                <h1 className="font-bold text-xl">AI Backend Architect</h1>
            </div>
            <button onClick={handleImportClick} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-semibold flex items-center">
                Import Project
            </button>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
            <h2 className="text-3xl font-bold text-white mb-8">Your Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* Create New Project Card */}
                <div 
                    className="bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 hover:border-indigo-500 hover:bg-gray-700 transition-all cursor-pointer flex flex-col items-center justify-center aspect-square"
                    onClick={() => setIsCreating(true)}
                >
                    {ICONS.PLUS}
                    <span className="mt-2 font-semibold">New Project</span>
                </div>

                {/* Project Cards */}
                {projects.map(p => (
                    <div key={p.id} className="group relative bg-gray-800 rounded-lg border border-gray-700 hover:border-indigo-500 transition-all flex flex-col justify-between aspect-square">
                         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRequest(p);
                                }}
                                className="p-1.5 bg-gray-700 text-gray-400 hover:bg-red-500 hover:text-white rounded-full"
                                title="Delete Project"
                            >
                                {ICONS.TRASH}
                            </button>
                        </div>
                        <div className="p-4 flex-1 cursor-pointer" onClick={() => onSelectProject(p.id)}>
                            <h3 className="font-bold text-lg text-white mb-2 break-words">{p.name}</h3>
                        </div>
                        <div className="p-4 text-xs text-gray-400 border-t border-gray-700 cursor-pointer" onClick={() => onSelectProject(p.id)}>
                            Last modified: {new Date(p.lastModified).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        </main>
        
        {isCreating && (
             <div 
                className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
                onClick={() => setIsCreating(false)}
            >
                <div 
                    className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm mx-4 p-6 border border-gray-700"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className="text-xl font-bold text-white mb-4">Create New Project</h2>
                    <form onSubmit={handleCreateProject}>
                         <label htmlFor="projectName" className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
                         <input
                            id="projectName"
                            type="text"
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="My Awesome API"
                            autoFocus
                         />
                         <div className="flex justify-end space-x-4 mt-6">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 rounded-md font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                                disabled={!newProjectName.trim()}
                            >
                                Create
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        
        <ConfirmationModal
            isOpen={!!deleteConfirmation}
            title="Confirm Project Deletion"
            message={`Are you sure you want to delete the project "${deleteConfirmation?.name}"? This action cannot be undone.`}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteConfirmation(null)}
            confirmText="Delete"
            confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
    </div>
  );
};

export default ProjectSelectionPage;
