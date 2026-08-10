import React from 'react';

const ActionModal = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  // Decide what title and fields to show
  const config = {
    manufacturer: { title: "New Manufacturer", icon: "🏭", fields: ["Name", "Region", "Support Contact"] },
    product_group: { title: "New Product Group", icon: "📂", fields: ["Group Name", "Manufacturer ID", "Category"] },
    model: { title: "New Model", icon: "📦", fields: ["Model Number", "Product Group ID", "Description"] }
  };

  const active = config[type] || config.manufacturer;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-indigo-900/20 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-gray-100 p-10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
            {active.icon}
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground">{active.title}</h2>
            <p className="text-sm text-gray-400">Fill in the details to update your inventory</p>
          </div>
        </div>

        {/* Dynamic Form */}
        <form className="space-y-5">
          {active.fields.map((field) => (
            <div key={field}>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                {field}
              </label>
              <input 
                type="text" 
                placeholder={`Enter ${field.toLowerCase()}...`}
                className="w-full rounded-2xl border border-gray-100 bg-muted px-5 py-4 text-sm outline-none focus:bg-card focus:ring-4 focus:ring-indigo-100 focus:border-primary-500 transition-all"
              />
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl text-sm font-bold text-gray-400 hover:bg-muted transition"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-[2] py-4 rounded-2xl bg-primary-600 text-white text-sm font-bold shadow-xl shadow-indigo-100 hover:bg-primary-700 transition active:scale-95"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActionModal;