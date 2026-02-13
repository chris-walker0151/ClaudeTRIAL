"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success("Account created! Check your email to confirm.");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push("/weekly-planner");
                router.refresh();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "An error occurred";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">
                    Dragon Seats
                </CardTitle>
                <CardDescription>
                    {isSignUp
                        ? "Create an account to get started"
                        : "Sign in to the Control Tower"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="ops@dragonseats.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading
                            ? "Loading..."
                            : isSignUp
                                ? "Create Account"
                                : "Sign In"}
                    </Button>
                </form>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                    {isSignUp ? (
                        <>
                            Already have an account?{" "}
                            <button
                                type="button"
                                onClick={() => setIsSignUp(false)}
                                className="text-primary underline-offset-4 hover:underline"
                            >
                                Sign in
                            </button>
                        </>
                    ) : (
                        <>
                            Need an account?{" "}
                            <button
                                type="button"
                                onClick={() => setIsSignUp(true)}
                                className="text-primary underline-offset-4 hover:underline"
                            >
                                Sign up
                            </button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
