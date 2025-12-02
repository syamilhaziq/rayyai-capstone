import React, { useState } from "react";
import { X, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { API_BASE_URL } from "../../services/api";

export default function SignInDialog({ isOpen, onClose, onLoginSuccess, onOpenSignUp }) {
    // Load saved email and password from localStorage
    const getSavedCredentials = () => {
        try {
            const savedEmail = localStorage.getItem('lastLoginEmail') || "";
            const savedPassword = localStorage.getItem('lastLoginPassword') || "";
            return { email: savedEmail, password: savedPassword };
        } catch (err) {
            console.error('Error loading saved credentials:', err);
            return { email: "", password: "" };
        }
    };

    const savedCredentials = getSavedCredentials();
    const [email, setEmail] = useState(savedCredentials.email);
    const [password, setPassword] = useState(savedCredentials.password);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Handle sign-in submission
    const handleSignIn = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            // Call backend login endpoint
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                
                body: JSON.stringify({
                    email: email,
                    password: password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed');
            }

            // Store JWT token in localStorage
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Save email and password for next time
            try {
                localStorage.setItem('lastLoginEmail', email);
                localStorage.setItem('lastLoginPassword', password);
            } catch (err) {
                console.error('Error saving credentials:', err);
            }

            // Call success callback with user data
            onLoginSuccess(data.user);

            // Reset error and close dialog (keep email/password for next time)
            setError("");
            onClose();

        } catch (err) {
            setError(err.message || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    // Prevent closing on backdrop click - only allow closing via X button
    const handleBackdropClick = (e) => {
        // Prevent closing when clicking outside the dialog
        e.stopPropagation();
    };

    // Load saved credentials when dialog opens
    React.useEffect(() => {
        if (isOpen) {
            // Load saved email and password
            const saved = getSavedCredentials();
            setEmail(saved.email);
            setPassword(saved.password);
            // Reset error states
            setError("");
            setShowPassword(false);
        }
    }, [isOpen]);

    // Remove ESC key handler - dialog should only close via X button

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={handleBackdropClick}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                        <p className="text-sm text-gray-600 mt-1">Sign in to your RayyAI account</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-md"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSignIn} className="p-6 space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <span className="text-red-600 text-sm">⚠️</span>
                            <p className="text-red-600 text-sm flex-1">{error}</p>
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6f948d] focus:border-transparent outline-none transition-all"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6f948d] focus:border-transparent outline-none transition-all"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                                disabled={isLoading}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5 text-gray-500" />
                                ) : (
                                    <Eye className="w-5 h-5 text-gray-500" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Forgot Password Link */}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="text-sm text-[#6f948d] hover:text-[#5a7a73] font-medium transition-colors"
                        >
                            Forgot password?
                        </button>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#6f948d] hover:bg-[#5a7a73] text-white py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Signing in...
                            </span>
                        ) : (
                            "Sign In"
                        )}
                    </Button>
                    {/* Sign Up Link */}
                    <div className="text-center pt-4">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    if (onOpenSignUp) {
                                        onOpenSignUp();
                                    }
                                }}
                                className="text-[#6f948d] hover:text-[#5a7a73] font-medium transition-colors"
                                disabled={isLoading}
                            >
                                Sign up
                            </button>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}