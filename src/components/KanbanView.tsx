import React from 'react';
import { Task } from '../constants';

interface KanbanViewProps {
  tasks: Task[];
}

export const KanbanView: React.FC<KanbanViewProps> = ({ tasks }) => {
  const columns = ['To Do', 'In Progress', 'Done'];

  return (
    <div className="flex gap-4 p-4 h-full overflow-x-auto">
      {columns.map(column => (
        <div key={column} className="bg-slate-100 p-4 rounded-xl w-64 flex-shrink-0">
          <h3 className="font-bold text-slate-700 mb-4">{column}</h3>
          <div className="space-y-2">
            {tasks
              .filter(task => task.status === column.toLowerCase().replace(' ', '_'))
              .map(task => (
                <div key={task.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                  <p className="font-medium text-slate-800">{task.title}</p>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};
