import { useState, useEffect } from "react";

export default function ClientForm({
  onSubmit,
  selectedClient,
  clearEdit,
}) {
  const initialForm = {
    company_name: "",
    person1_name: "",
    person1_phone: "",
    person2_name: "",
    person2_phone: "",
    person1_email: "",
    person2_email: "",
    address: "",
    state: "",
    pincode: "",
    gstin: "",
    alter_phone: "",
    alter_email: "",
  };
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (selectedClient) {
      setForm(selectedClient);
    } else {
      setForm(initialForm);
    }
  }, [selectedClient]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    if (!form.company_name) {
      alert("Company name required");
      return;
    }

    const success = await onSubmit(form);

    if (success) {
      setForm(initialForm);
      clearEdit?.();
    }
  };

  return (
    // Cleaned up layout container classes here
    <div className="w-full rounded-xl border border-gray-300 bg-[#f5ebe9] px-6 py-6 text-sm">
      
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900">
          {selectedClient ? "Edit Client" : "Add Client"}
        </h3>

        <p className="text-sm text-gray-500 mt-1">
          Fill in the client details below
        </p>
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Company Name
          </label>
          <input
            name="company_name"
            placeholder="Enter company name"
            value={form.company_name}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Person 1 Name
          </label>
          <input
            name="person1_name"
            placeholder="Enter primary contact"
            value={form.person1_name}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Person 1 Phone
          </label>
          <input
            name="person1_phone"
            type="tel"
            placeholder="Enter phone number"
            value={form.person1_phone}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Person 2 Name
          </label>
          <input
            name="person2_name"
            placeholder="Enter secondary contact"
            value={form.person2_name}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Person 2 Phone
          </label>
          <input
            name="person2_phone"
            type="tel"
            placeholder="Enter secondary phone"
            value={form.person2_phone}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Person 1 Email
          </label>
          <input
            name="person1_email"
            type="email"
            placeholder="Enter email"
            value={form.person1_email}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Person 2 Email
          </label>
          <input
            name="person2_email"
            type="email"
            placeholder="Enter alternate email"
            value={form.person2_email}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="md:col-span-2 xl:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Address
          </label>
          <input
            name="address"
            placeholder="Enter address"
            value={form.address}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            State
          </label>
          <input
            name="state"
            placeholder="Enter state"
            value={form.state}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pincode
          </label>
          <input
            name="pincode"
            placeholder="Enter pincode"
            value={form.pincode}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            GSTIN
          </label>
          <input
            name="gstin"
            placeholder="Enter GSTIN"
            value={form.gstin}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Alternate Phone
          </label>
          <input
            name="alter_phone"
            type="tel"
            placeholder="Enter alternate phone"
            value={form.alter_phone}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Alternate Email
          </label>
          <input
            name="alter_email"
            type="email"
            placeholder="Enter alternate email"
            value={form.alter_email}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3 mt-8">
        <button
          onClick={handleSubmit}
          className="rounded-xl bg-gray-900 text-white px-6 py-3 text-sm font-semibold shadow-sm hover:bg-black transition"
        >
          {selectedClient ? "Update Client" : "Create Client"}
        </button>

        {selectedClient && (
          <button
            onClick={clearEdit}
            className="rounded-xl border border-gray-300 bg-white text-gray-700 px-6 py-3 text-sm font-semibold hover:bg-gray-100 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}