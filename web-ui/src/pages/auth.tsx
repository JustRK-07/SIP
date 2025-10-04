"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AiOutlineUser, AiOutlineLock, AiOutlineLoading3Quarters } from "react-icons/ai";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Auth() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const success = await login(credentials.username, credentials.password);
      if (success) {
        toast.success("Login successful!");
        await router.push("/");
      } else {
        setErrorMessage("Invalid username or password");
        toast.error("Invalid credentials");
      }
    } catch (error) {
      setErrorMessage("Unable to connect to server. Please try again.");
      toast.error("Login failed - Check your connection");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login - Ytel</title>
        <meta name="description" content="Login to Ytel" />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 115.05 69.48" 
                  className="h-12 w-16"
                >
                  <defs>
                    <style>{`.cls-1{fill:#036;fill-rule:evenodd;}`}</style>
                  </defs>
                  <title>ytel-logo-dkblue</title>
                  <g id="Layer_2" data-name="Layer 2">
                    <g id="Layer_3" data-name="Layer 3">
                      <path className="cls-1" d="M95,8.85V34.62a5.85,5.85,0,0,0-1,.67,77.45,77.45,0,0,1-6.62,5.23V8.85ZM18.82,6.26a6,6,0,0,1,1.55-4.19A6.18,6.18,0,0,1,24.77,0a6,6,0,0,1,4.71,2.07,5.54,5.54,0,0,1,1.81,4.19,6.29,6.29,0,0,1-6.52,6.52,6.49,6.49,0,0,1-4.4-1.86A6.9,6.9,0,0,1,18.82,6.26ZM15.41,9.11l9.78,16.14L35.49,9.11H46.4L30.52,34.77V54.7H20V34.77L4.59,9.11ZM37.56,29.19l7.71-14.33v6.52h7.3l-.16,7.55H45.27V42.48q0,3.88,1.55,5.17A11,11,0,0,0,51,49.73l1.91.41-3.52,6.62a2.18,2.18,0,0,0-.52.16l-2.33-.78a14.56,14.56,0,0,1-6.26-3.78,10.27,10.27,0,0,1-2.07-3.93,20.1,20.1,0,0,1-.52-5.07V29.19ZM16.08,46.88q-7.56,5-6.26,8.07,2.74,6.93,18.37,6.78a91.45,91.45,0,0,0,20.7-2.85,1.71,1.71,0,0,0,.52-.26Q55.15,57,60.89,55A5.34,5.34,0,0,0,63,54.44a129.08,129.08,0,0,0,16-7.3,93.39,93.39,0,0,0,8.33-5q3.52-2.33,6.62-4.81a3.32,3.32,0,0,1,1-.88q10.71-9.42,8.12-16-1.09-2.07-4.45-1.81,14.07-3.78,16,1,2.43,6.26-12.42,20.18-3.52,2.9-7.3,5.74-3.52,2.48-7.14,4.81A143.16,143.16,0,0,1,63.64,61.22q-23.34,7.71-42,8.23Q2.78,70,.3,63.55-2.19,57.44,16.08,46.88Zm69.19-5.74H60a9.38,9.38,0,0,0,2.23,5,8.66,8.66,0,0,0,6.62,2.33q3.52-.36,5.49-.78Q68.81,50.3,63,52.47q-1.19.41-2.07.78a15.71,15.71,0,0,1-6.11-5.85,16.21,16.21,0,0,1-2.48-9.11q0-8,4.66-12.89A14.78,14.78,0,0,1,68.29,21a15.6,15.6,0,0,1,8.9,2,14.89,14.89,0,0,1,6,6.26q2.12,3.62,2.12,10.66ZM68.55,27.74A8.84,8.84,0,0,0,62.34,30,7,7,0,0,0,60,35.29H77.3a7.33,7.33,0,0,0-2.48-5.49A9.08,9.08,0,0,0,68.55,27.74Z"/>
                    </g>
                  </g>
                </svg>
              </div>
           
            </div>
          </div>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl text-center text-slate-800 dark:text-slate-100">
                Welcome back
              </CardTitle>
              <CardDescription className="text-center text-slate-500 dark:text-slate-400">
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <AiOutlineUser className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <Input
                      id="username"
                      type="text"
                      value={credentials.username}
                      onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus-visible:ring-blue-500"
                      placeholder="Enter your username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <AiOutlineLock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus-visible:ring-blue-500"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !credentials.username || !credentials.password}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <AiOutlineLoading3Quarters className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="pt-4 space-y-3 border-t border-slate-200 dark:border-slate-700/50">
                  <div className="text-center">
                    <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                      Forgot password?
                    </Link>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Don't have an account?{" "}
                      <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        Sign up
                      </Link>
                    </p>
                  </div>

                  <div className="text-center pt-3 border-t border-slate-200 dark:border-slate-700/50">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Test Credentials
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Username: demo@ytel.com | Password: password123
                    </p>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © 2025 Ytel. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
} 