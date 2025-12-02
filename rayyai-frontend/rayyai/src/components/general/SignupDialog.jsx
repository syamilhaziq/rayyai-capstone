import React, { useState } from "react";
import {
    X,
    Eye,
    EyeOff,
    Loader2,
    User,
    Mail,
    Lock,
    Calendar,
    UserCircle,
    CheckCircle,
} from "lucide-react";
import { API_BASE_URL } from "../../services/api";

export default function SignUpDialog({ isOpen, onClose, onSignupSuccess, onLoginSuccess, onOpenSignIn }) {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        dob: "",
        gender: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        // Validation
        if (
            !formData.email ||
            !formData.password ||
            !formData.firstName ||
            !formData.lastName ||
            !formData.dob ||
            !formData.gender
        ) {
            setError("All fields are required");
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            setIsLoading(false);
            return;
        }

        // Validate age (must be at least 13 years old)
        const birthDate = new Date(formData.dob);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge =
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
                ? age - 1
                : age;

        if (actualAge < 13) {
            setError("You must be at least 13 years old to create an account");
            setIsLoading(false);
            return;
        }

        try {
            // Call backend signup endpoint
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    dob: formData.dob,
                    gender: formData.gender,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Signup failed");
            }

            // Backend returns: { access_token, token_type, user }
            // Store token immediately - no need to login again!
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // Show success state
            setShowSuccess(true);
            setIsLoading(false);

            // Wait 1.5 seconds to show success message, then proceed
            setTimeout(() => {
                // Call success callbacks with user data
                onSignupSuccess?.(data.user);
                onLoginSuccess(data.user); // This navigates to dashboard

                // Reset form
                setFormData({
                    email: "",
                    password: "",
                    firstName: "",
                    lastName: "",
                    dob: "",
                    gender: "",
                });
                setShowSuccess(false);
                setError("");

                // Close dialog
                onClose();
            }, 1500);

        } catch (err) {
            console.error("Signup error:", err);
            setError(
                err.message || "Failed to create account. Please try again."
            );
            setIsLoading(false);
            setShowSuccess(false);
        }
    };

    const handleClose = () => {
        if (!isLoading && !showSuccess) {
            setError("");
            setFormData({
                email: "",
                password: "",
                firstName: "",
                lastName: "",
                dob: "",
                gender: "",
            });
            onClose();
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !isLoading && !showSuccess) {
            handleClose();
        }
    };

    React.useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape" && isOpen && !isLoading && !showSuccess) {
                handleClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, isLoading, showSuccess]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in duration-200">
                {showSuccess ? (
                    /* Success State */
                    <div className="p-6 text-center rounded-3xl">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            Account Created! 🎉
                        </h3>
                        <p className="text-gray-600 mb-3 text-sm">
                            Welcome to RayyAI! Redirecting you to your dashboard...
                        </p>
                        <div className="flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-[#6f948d]" />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10 rounded-t-3xl">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Create Account
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Join RayyAI to start managing your finances
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={isLoading}
                                className="p-2 hover:bg-gray-200 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-md disabled:opacity-50"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-4 space-y-3">
                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top duration-200">
                                    <span className="text-red-600 text-sm">⚠️</span>
                                    <p className="text-red-600 text-sm flex-1">
                                        {error}
                                    </p>
                                </div>
                            )}

                            {/* Name Row */}
                            <div className="grid grid-cols-2 gap-2">
                                {/* First Name */}
                                <div>
                                    <label
                                        htmlFor="firstName"
                                        className="block text-sm font-medium text-gray-700 mb-1.5"
                                    >
                                        First Name
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            id="firstName"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6f948d] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                                            placeholder="John"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Last Name */}
                                <div>
                                    <label
                                        htmlFor="lastName"
                                        className="block text-sm font-medium text-gray-700 mb-1.5"
                                    >
                                        Last Name
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <UserCircle className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            id="lastName"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6f948d] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                                            placeholder="Doe"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700 mb-1.5"
                                >
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Date of Birth & Gender Row */}
                            <div className="grid grid-cols-2 gap-2">
                                {/* Date of Birth */}
                                <div>
                                    <label
                                        htmlFor="dob"
                                        className="block text-sm font-medium text-gray-700 mb-1.5"
                                    >
                                        Date of Birth
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Calendar className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="date"
                                            id="dob"
                                            name="dob"
                                            value={formData.dob}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                            max={
                                                new Date()
                                                    .toISOString()
                                                    .split("T")[0]
                                            }
                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6f948d] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Gender */}
                                <div>
                                    <label
                                        htmlFor="gender"
                                        className="block text-sm font-medium text-gray-700 mb-1.5"
                                    >
                                        Gender
                                    </label>
                                    <select
                                        id="gender"
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6f948d] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                                        required
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="Prefer not to say">
                                            Prefer not to say
                                        </option>
                                    </select>
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700 mb-1.5"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        className="block w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6f948d] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        disabled={isLoading}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        )}
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    Must be at least 6 characters
                                </p>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#6f948d] hover:bg-[#5a7a73] text-white py-2.5 px-6 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    "Create Account"
                                )}
                            </button>
                        </form>

                        {/* Footer */}
                        <div className="mt-4 px-4 pb-4 text-center">
                            <p className="text-sm text-gray-600">
                                Already have an account?{" "}
                                <button
                                    onClick={() => {
                                        handleClose();
                                        if (onOpenSignIn) {
                                            onOpenSignIn();
                                        }
                                    }}
                                    className="text-[#6f948d] hover:text-[#5a7a73] font-semibold"
                                    disabled={isLoading}
                                >
                                    Sign In
                                </button>
                            </p>
                        </div>

                        {/* Terms */}
                        <div className="px-4 pb-4 text-center">
                            <p className="text-xs text-gray-500">
                                By creating an account, you agree to our{" "}
                                <a
                                    href="#"
                                    className="text-[#6f948d] hover:underline"
                                >
                                    Terms of Service
                                </a>{" "}
                                and{" "}
                                <a
                                    href="#"
                                    className="text-[#6f948d] hover:underline"
                                >
                                    Privacy Policy
                                </a>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}