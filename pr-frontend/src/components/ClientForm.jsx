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

  const inputStyles =
    "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20";

  const labelStyles = "block text-sm font-medium text-foreground mb-1.5";

  return (
    <div className="w-full rounded-xl border border-border bg-card px-6 py-6 text-sm shadow-sm transition-colors">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground">
          {selectedClient ? "Edit Client" : "Add Client"}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Fill in the client details below
        </p>
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <div>
          <label className={labelStyles}>Company Name *</label>
          <input
            name="company_name"
            placeholder="Enter company name"
            value={form.company_name}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>

        <div>
          <label className={labelStyles}>Person 1 Name</label>
          <input
            name="person1_name"
            placeholder="Enter primary contact"
            value={form.person1_name}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>

        <div>
          <label className={labelStyles}>Person 1 Phone</label>
          <input
            name="person1_phone"
            type="tel"
            placeholder="Enter phone number"
            value={form.person1_phone}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>

        <div>
          <label className={labelStyles}>Person 2 Name</label>
          <input
            name="person2_name"
            placeholder="Enter secondary contact"
            value={form.person2_name}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>

        <div>
          <label className={labelStyles}>Person 2 Phone</label>
          <input
            name="person2_phone"
            type="tel"
            placeholder="Enter secondary phone"
            value={form.person2_phone}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>

        <div>
          <label className={labelStyles}>Person 1 Email</label>
          <input
            name="person1_email"
            type="email"
            placeholder="Enter email"
            value={form.person1_email}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>

        <div>
          <label className={labelStyles}>Person 2 Email</label>
          <input
            name="person2_email"
            type="email"
            placeholder="Enter alternate email"
            value={form.person2_email}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>

        <div className="md:col-span-2 xl:col-span-2">
          <label className={labelStyles}>Address</label>
          <input
            name="address"
            placeholder="Enter address"
            value={form.address}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>

        <div>
          <label className={labelStyles}>State</label>
          <input
            name="state"
            placeholder="Enter state"
            value={form.state}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>

        <div>
          <label className={labelStyles}>Pincode</label>
          <input
            name="pincode"
            placeholder="Enter pincode"
            value={form.pincode}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>

        <div>
          <label className={labelStyles}>GSTIN</label>
          <input
            name="gstin"
            placeholder="Enter GSTIN"
            value={form.gstin}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>

        <div>
          <label className={labelStyles}>Alternate Phone</label>
          <input
            name="alter_phone"
            type="tel"
            placeholder="Enter alternate phone"
            value={form.alter_phone}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>

        <div>
          <label className={labelStyles}>Alternate Email</label>
          <input
            name="alter_email"
            type="email"
            placeholder="Enter alternate email"
            value={form.alter_email}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex flex-wrap items-center gap-3 mt-8 pt-4 border-t border-border">
        <button
          onClick={handleSubmit}
          className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 transition active:scale-[0.98]"
        >
          {selectedClient ? "Update Client" : "Create Client"}
        </button>

        {selectedClient && (
          <button
            onClick={clearEdit}
            className="rounded-lg border border-border bg-secondary text-secondary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-muted transition active:scale-[0.98]"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}