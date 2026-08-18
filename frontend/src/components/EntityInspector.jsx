import React, { useState } from 'react';
import { Search, Filter, ShieldAlert, CheckCircle2, ChevronDown } from 'lucide-react';

export default function EntityInspector({ entities = [] }) {
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const uniqueTypes = ['ALL', ...new Set(entities.map((e) => e.entity_type))];

  const filteredEntities = entities.filter((ent) => {
    const matchesType = filterType === 'ALL' || ent.entity_type === filterType;
    const matchesSearch =
      ent.raw_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ent.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ent.explanation.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getBadgeColor = (type) => {
    switch (type) {
      case 'PAN':
      case 'AADHAAR':
      case 'SSN':
      case 'CREDIT_CARD':
        return 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40';
      case 'PASSPORT':
      case 'API_KEY':
        return 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500/40';
      case 'PHONE_NUMBER':
      case 'EMAIL':
        return 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40';
      default:
        return 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40';
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Detailed List of Found Information
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Every item found in your document ({entities.length} total) and how it was replaced
          </p>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 font-medium"
          >
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {t === 'ALL' ? 'All Types' : t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Original Value (Before)</th>
              <th className="px-4 py-3">Replaced As (After)</th>
              <th className="px-4 py-3">Accuracy</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Why Flagged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
            {filteredEntities.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500 font-medium">
                  No items match your search.
                </td>
              </tr>
            ) : (
              filteredEntities.map((ent) => (
                <tr key={ent.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  
                  {/* Category */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${getBadgeColor(ent.entity_type)}`}>
                      {ent.entity_type}
                    </span>
                  </td>

                  {/* Raw Value */}
                  <td className="px-4 py-3 text-rose-600 dark:text-rose-300 font-mono font-medium whitespace-nowrap">
                    {ent.raw_value}
                  </td>

                  {/* Masked Token */}
                  <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap font-bold">
                    {ent.masked_value}
                  </td>

                  {/* Confidence */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-500 dark:bg-cyan-400 h-full rounded-full"
                          style={{ width: `${ent.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                        {(ent.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>

                  {/* Position */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                    [{ent.start}:{ent.end}]
                  </td>

                  {/* Explanation */}
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                    {ent.explanation}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
