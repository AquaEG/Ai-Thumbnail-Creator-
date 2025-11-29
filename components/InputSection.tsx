import React from 'react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div className="mb-8 relative group">
    <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-cyan-600/50 to-transparent dark:from-cyan-900/50"></div>
        <h3 className="text-xs font-extrabold text-cyan-600 dark:text-cyan-500 uppercase tracking-[0.2em] font-mono shadow-cyan-500/50">{title}</h3>
        <div className="h-px w-4 bg-cyan-600/50 dark:bg-cyan-900/50"></div>
    </div>
    <div className="space-y-5 relative">
        {/* Subtle border line on the left for structure */}
        <div className="absolute -left-3 top-0 bottom-0 w-px bg-gray-200 dark:bg-zinc-800 group-hover:bg-cyan-500/30 dark:group-hover:bg-cyan-900/50 transition-colors"></div>
        {children}
    </div>
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const inputBaseClass = "w-full bg-white dark:bg-black/40 border border-gray-300 dark:border-zinc-800 text-gray-900 dark:text-zinc-200 text-sm font-semibold rounded-sm p-3 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600 hover:border-gray-400 dark:hover:border-zinc-700 shadow-sm dark:shadow-inner";
const labelBaseClass = "text-[11px] font-extrabold text-gray-600 dark:text-zinc-500 uppercase tracking-wider mb-2 block";

export const Input: React.FC<InputProps> = ({ label, className, ...props }) => (
  <div className="group">
    <label className={labelBaseClass}>{label}</label>
    <div className="relative">
        <input 
        className={`${inputBaseClass} ${className}`}
        {...props} 
        />
    </div>
  </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
}
  
export const TextArea: React.FC<TextAreaProps> = ({ label, className, ...props }) => (
    <div className="group">
      <label className={labelBaseClass}>{label}</label>
      <textarea 
        className={`${inputBaseClass} min-h-[80px] resize-none ${className}`}
        {...props} 
      />
    </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: string[];
}

export const Select: React.FC<SelectProps> = ({ label, options, ...props }) => (
    <div className="group">
      <label className={labelBaseClass}>{label}</label>
      <div className="relative">
        <select 
            className={`${inputBaseClass} appearance-none cursor-pointer`}
            {...props} 
        >
            {options.map(opt => <option key={opt} value={opt} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-300 font-medium">{opt}</option>)}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-3 h-3 text-gray-500 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
    </div>
);

interface FileInputProps {
    label: string;
    onChange: (file: File | null) => void;
}

export const FileInput: React.FC<FileInputProps> = ({ label, onChange }) => {
    return (
        <div className="group">
            <label className={labelBaseClass}>{label}</label>
            <div className="relative overflow-hidden rounded-sm border border-gray-300 dark:border-zinc-800 bg-white dark:bg-black/40 hover:border-gray-400 dark:hover:border-zinc-600 transition-colors group-hover:shadow-md">
                <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                        const file = e.target.files && e.target.files[0];
                        onChange(file || null);
                    }}
                    className="block w-full text-[11px] text-gray-500 dark:text-zinc-400 font-semibold
                    file:mr-0 file:py-3 file:px-4
                    file:border-r file:border-gray-300 dark:file:border-zinc-800
                    file:text-[10px] file:font-extrabold file:uppercase file:tracking-wider
                    file:bg-gray-100 dark:file:bg-zinc-900 
                    file:text-cyan-700 dark:file:text-cyan-500
                    hover:file:bg-gray-200 dark:hover:file:bg-zinc-800
                    cursor-pointer file:cursor-pointer"
                />
            </div>
        </div>
    )
}

interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between group p-1">
        <label className={`${labelBaseClass} mb-0 group-hover:text-gray-900 dark:group-hover:text-zinc-300 transition-colors cursor-pointer`} onClick={() => onChange(!checked)}>{label}</label>
        <button 
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 border ${checked ? 'bg-cyan-900/50 dark:bg-cyan-950 border-cyan-600 dark:border-cyan-500/50' : 'bg-gray-200 dark:bg-black border-gray-300 dark:border-zinc-700'}`}
        >
            <span 
                className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-lg transition-all duration-300 ${checked ? 'translate-x-5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'translate-x-1 bg-gray-400 dark:bg-zinc-500'}`} 
            />
        </button>
    </div>
)