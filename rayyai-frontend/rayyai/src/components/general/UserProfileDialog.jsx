import React, { useEffect, useState } from "react";
import { X, Loader2, Edit3 } from "lucide-react";

const genders = [
    "Male",
    "Female",
    "Other",
    "Prefer not to say",
];

const deriveNameParts = (fullName = "") => {
    const parts = fullName
        .split(" ")
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return { firstName: "", lastName: "" };
    }

    if (parts.length === 1) {
        return { firstName: parts[0], lastName: "" };
    }

    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(" "),
    };
};

const formatDateForInput = (value) => {
    if (!value) return "";
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const day = `${date.getDate()}`.padStart(2, "0");
        return `${year}-${month}-${day}`;
    } catch (err) {
        return value;
    }
};

const normalizeGenderForForm = (value) => {
    if (!value) return "";
    const lower = value.toString().toLowerCase();
    switch (lower) {
        case "male":
            return "Male";
        case "female":
            return "Female";
        case "other":
            return "Other";
        case "prefer not to say":
            return "Prefer not to say";
        default:
            return value;
    }
};

const UserProfileDialog = ({ isOpen, onClose, user, onSave }) => {
    const [formValues, setFormValues] = useState({
        first_name: "",
        last_name: "",
        email: "",
        dob: "",
        gender: "",
        password: "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const { firstName, lastName } = deriveNameParts(
            user?.full_name || ""
        );

        setFormValues({
            first_name: user?.first_name ?? firstName,
            last_name: user?.last_name ?? lastName,
            email: user?.email ?? "",
            dob: formatDateForInput(user?.dob),
            gender: normalizeGenderForForm(user?.gender),
            password: "",
        });
        setError("");
        setSuccessMessage("");
    }, [isOpen, user]);

    if (!isOpen) {
        return null;
    }

    const handleClose = () => {
        if (!isSaving) {
            onClose?.();
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormValues((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSaving) {
            return;
        }

        setError("");
        setSuccessMessage("");
        setIsSaving(true);

        try {
            await onSave?.(formValues);
            setSuccessMessage("Profile updated successfully.");
            setFormValues((prev) => ({
                ...prev,
                password: "",
            }));
        } catch (err) {
            setError(err?.message || "Failed to update profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-2xl font-bold text-[#04362c]">
                            Your Profile
                        </h2>
                        <p className="text-sm text-[#04362c]/70 mt-1">
                            Review and update your personal information.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSaving}
                        className="p-2 rounded-full hover:bg-gray-200 transition-all duration-200 hover:scale-110 hover:shadow-md disabled:opacity-50"
                        aria-label="Close profile"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            {successMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#04362c]" htmlFor="first_name">
                                First Name
                            </label>
                            <div className="relative">
                                <input
                                    id="first_name"
                                    name="first_name"
                                    type="text"
                                    value={formValues.first_name}
                                    onChange={handleChange}
                                    required
                                    disabled={isSaving}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#04362c] focus:border-[#0DAD8D] focus:ring-2 focus:ring-[#0DAD8D]/40 transition-all disabled:bg-gray-100"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#04362c]" htmlFor="last_name">
                                Last Name
                            </label>
                            <input
                                id="last_name"
                                name="last_name"
                                type="text"
                                value={formValues.last_name}
                                onChange={handleChange}
                                required
                                disabled={isSaving}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#04362c] focus:border-[#0DAD8D] focus:ring-2 focus:ring-[#0DAD8D]/40 transition-all disabled:bg-gray-100"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#04362c]" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formValues.email}
                            onChange={handleChange}
                            required
                            disabled={isSaving}
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#04362c] focus:border-[#0DAD8D] focus:ring-2 focus:ring-[#0DAD8D]/40 transition-all disabled:bg-gray-100"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#04362c]" htmlFor="dob">
                                Date of Birth
                            </label>
                            <input
                                id="dob"
                                name="dob"
                                type="date"
                                value={formValues.dob}
                                onChange={handleChange}
                                disabled={isSaving}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#04362c] focus:border-[#0DAD8D] focus:ring-2 focus:ring-[#0DAD8D]/40 transition-all disabled:bg-gray-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#04362c]" htmlFor="gender">
                                Gender
                            </label>
                            <select
                                id="gender"
                                name="gender"
                                value={formValues.gender}
                                onChange={handleChange}
                                disabled={isSaving}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#04362c] focus:border-[#0DAD8D] focus:ring-2 focus:ring-[#0DAD8D]/40 transition-all disabled:bg-gray-100"
                            >
                                <option value="">Select</option>
                                {genders.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#04362c]" htmlFor="password">
                            Update Password
                            <span className="ml-2 text-xs font-normal text-[#04362c]/60">
                                (leave blank to keep current password)
                            </span>
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formValues.password}
                                onChange={handleChange}
                                disabled={isSaving}
                                minLength={8}
                                placeholder="New password"
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#04362c] focus:border-[#0DAD8D] focus:ring-2 focus:ring-[#0DAD8D]/40 transition-all disabled:bg-gray-100"
                            />
                            <Edit3 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#04362c]/40" />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSaving}
                            className="rounded-xl border border-[#04362c]/20 px-5 py-2.5 text-sm font-medium text-[#04362c] transition-all hover:bg-[#04362c]/5 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#0DAD8D] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#0c9b7f] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Edit3 className="h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserProfileDialog;

