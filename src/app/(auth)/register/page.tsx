"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="panel p-6">
      <div className="text-center mb-6">
        <div className="w-10 h-10 bg-s2 rounded-lg flex items-center justify-center mx-auto mb-3">
          <div className="w-5 h-5 bg-w rounded-sm opacity-80" />
        </div>
        <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
          Create your account
        </h1>
        <p className="text-[12px] text-w4 mt-1">Start your free research.</p>
      </div>

      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); document.cookie = "obsidian_session=1; path=/; max-age=604800"; router.push("/"); }}>
        <Input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button variant="primary" className="w-full" size="lg">
          Create Account
        </Button>
      </form>

      <div className="mt-4 text-center">
        <span className="text-[11px] text-w5">
          Already have an account?{" "}
          <Link href="/login" className="text-a hover:underline">
            Sign in
          </Link>
        </span>
      </div>
    </div>
  );
}
