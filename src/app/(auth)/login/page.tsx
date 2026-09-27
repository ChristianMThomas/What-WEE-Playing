import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in · WhatWiiPlaying" };

export default function LoginPage() {
  return (
    <section className="wii-panel w-full max-w-md p-8 sm:p-10">
      <h1 className="mb-6 text-center text-2xl font-extrabold">Welcome back</h1>
      <LoginForm />
      <p className="mt-6 text-center">
        New here?{" "}
        <Link href="/register" className="font-bold text-wii-blue-dark hover:underline">
          Create an account
        </Link>
      </p>
    </section>
  );
}
