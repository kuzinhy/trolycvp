import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Clock, AlertTriangle, Plus } from 'lucide-react';

interface Directive {
  id: string;
  title: string;
  deadline: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
}

export const DirectiveTracking: React.FC = () => {
  const [directives] = useState<Directive[]>([
    { id: '1', title: 'Triển khai Nghị quyết số 05', deadline: '2026-04-01', status: 'in-progress' },
    { id: '2', title: 'Hoàn thành báo cáo quý I', deadline: '2026-03-25', status: 'pending' },
  ]);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900">Giám sát chỉ đạo</h2>
        <button className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100">
          <Plus size={20} />
        </button>
      </div>
      <div className="space-y-4">
        {directives.map((d) => (
          <div key={d.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
            <div className="flex items-center gap-3">
              {d.status === 'completed' && <CheckCircle className="text-emerald-500" size={20} />}
              {d.status === 'in-progress' && <Clock className="text-amber-500" size={20} />}
              {d.status === 'pending' && <AlertTriangle className="text-slate-400" size={20} />}
              <div>
                <p className="text-sm font-bold text-slate-900">{d.title}</p>
                <p className="text-xs text-slate-500">Hạn: {d.deadline}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-white border border-slate-200">
              {d.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
